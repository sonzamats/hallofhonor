import { getSupabase } from './supabase';
import type { Award, Recipient, RecipientWithAwards } from './supabase';
import { extractStateCode, stateCodeToName, fetchAllRows } from './utils';

/**
 * Build an `.or()` filter string that precisely matches a state.
 * Uses end-anchored ILIKE to avoid over-matching (e.g. "Virginia" vs "West Virginia").
 * PostgREST double-quoting handles commas in ILIKE patterns.
 */
function stateOrFilter(stateCode: string): string | null {
  const stateName = stateCodeToName(stateCode);
  if (stateName === stateCode) return null; // unknown code
  return [
    `entered_service_state.eq.${stateCode}`,
    `entered_service_state.eq.${stateName}`,
    `entered_service_state.ilike."%, ${stateName}"`,
  ].join(',');
}

export async function getAwards(): Promise<Award[]> {
  const { data, error } = await getSupabase()
    .from('awards')
    .select('*')
    .order('precedence_rank', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAwardBySlug(slug: string): Promise<Award | null> {
  const { data, error } = await getSupabase()
    .from('awards')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function getRecipients(params: {
  state?: string;
  award?: string;
  awards?: string[];
  conflict?: string;
  branch?: string;
  posthumous?: boolean;
  pow?: boolean;
  withValor?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ recipients: Recipient[]; total: number; page: number; totalPages: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  // Collect award slugs from both single and multi params
  const awardSlugs: string[] = [];
  if (params.award) awardSlugs.push(params.award);
  if (params.awards) awardSlugs.push(...params.awards);

  // Resolve award slugs to IDs for the inner-join filter
  let awardIds: string[] = [];
  if (awardSlugs.length > 0) {
    for (const slug of awardSlugs) {
      const { data: awardData } = await getSupabase()
        .from('awards')
        .select('id')
        .eq('slug', slug)
        .single();
      if (awardData) awardIds.push(awardData.id);
    }
    if (awardIds.length === 0) {
      return { recipients: [], total: 0, page, totalPages: 0 };
    }
  }

  // Use !inner join to filter by award — avoids large .in() URL issues
  const selectClause = awardIds.length > 0
    ? '*, recipient_awards!inner(award_id)'
    : '*';

  let query: any = getSupabase().from('recipients').select(selectClause, { count: 'exact' });

  if (awardIds.length === 1) {
    query = query.eq('recipient_awards.award_id', awardIds[0]);
  } else if (awardIds.length > 1) {
    query = query.in('recipient_awards.award_id', awardIds);
  }

  if (params.state) {
    const orFilter = stateOrFilter(params.state);
    if (orFilter) {
      query = query.or(orFilter);
    } else {
      query = query.eq('entered_service_state', params.state);
    }
  }
  if (params.conflict) query = query.eq('conflict', params.conflict);
  if (params.branch) query = query.eq('branch', params.branch);
  if (params.posthumous !== undefined) query = query.eq('posthumous', params.posthumous);
  if (params.pow !== undefined) query = query.eq('pow', params.pow);

  query = query.order('last_name').range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  const total = count ?? 0;

  return {
    recipients: (data ?? []) as Recipient[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRecipientById(id: string): Promise<RecipientWithAwards | null> {
  const { data, error } = await getSupabase()
    .from('recipients')
    .select(`
      *,
      recipient_awards (
        *,
        awards (*)
      )
    `)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as RecipientWithAwards;
}

export async function searchRecipients(params: {
  q: string;
  awards?: string[];
  branch?: string;
  conflict?: string;
  state?: string;
  yearFrom?: number;
  yearTo?: number;
  posthumous?: boolean;
  pow?: boolean;
  withValor?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ results: Recipient[]; total: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  // Resolve award slugs to IDs
  let awardIds: string[] = [];
  if (params.awards && params.awards.length > 0) {
    for (const slug of params.awards) {
      const { data: awardData } = await getSupabase()
        .from('awards')
        .select('id')
        .eq('slug', slug)
        .single();
      if (awardData) awardIds.push(awardData.id);
    }
    if (awardIds.length === 0 && params.awards.length > 0) {
      return { results: [], total: 0 };
    }
  }

  // Use !inner join for award filtering to avoid large .in() URL issues
  const selectClause = awardIds.length > 0
    ? '*, recipient_awards!inner(award_id)'
    : '*';

  let query: any = getSupabase()
    .from('recipients')
    .select(selectClause, { count: 'exact' })
    .textSearch('search_vector', params.q, { type: 'websearch' });

  if (awardIds.length === 1) {
    query = query.eq('recipient_awards.award_id', awardIds[0]);
  } else if (awardIds.length > 1) {
    query = query.in('recipient_awards.award_id', awardIds);
  }

  if (params.branch) query = query.eq('branch', params.branch);
  if (params.conflict) query = query.eq('conflict', params.conflict);
  if (params.state) {
    const orFilter = stateOrFilter(params.state);
    if (orFilter) {
      query = query.or(orFilter);
    } else {
      query = query.eq('entered_service_state', params.state);
    }
  }
  if (params.posthumous !== undefined) query = query.eq('posthumous', params.posthumous);
  if (params.pow !== undefined) query = query.eq('pow', params.pow);

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    results: (data ?? []) as Recipient[],
    total: count ?? 0,
  };
}

export async function getAwardStats(slug: string) {
  const award = await getAwardBySlug(slug);
  if (!award) return null;

  const records = await fetchAllRows<any>(
    () => getSupabase()
      .from('recipient_awards')
      .select('*, recipients(*)')
      .eq('award_id', award.id) as any
  );

  const byConflict: Record<string, number> = {};
  const byBranch: Record<string, number> = {};
  const byState: Record<string, number> = {};
  let posthumousCount = 0;
  let withValorCount = 0;

  for (const ra of records) {
    const r = (ra as any).recipients as Recipient;
    if (r?.conflict) byConflict[r.conflict] = (byConflict[r.conflict] ?? 0) + 1;
    if (r?.branch) byBranch[r.branch] = (byBranch[r.branch] ?? 0) + 1;
    if (r?.entered_service_state) {
      const sc = extractStateCode(r.entered_service_state);
      if (sc) byState[sc] = (byState[sc] ?? 0) + 1;
    }
    if (r?.posthumous) posthumousCount++;
    if (ra.with_valor) withValorCount++;
  }

  return {
    totalAwarded: records.length,
    byConflict: Object.entries(byConflict).map(([name, count]) => ({ name, count })),
    byBranch: Object.entries(byBranch).map(([name, count]) => ({ name, count })),
    byState: Object.entries(byState).map(([code, count]) => ({ code, count })),
    posthumousCount,
    withValorCount,
  };
}

export async function getStateSummary(stateCode: string) {
  const stateName = stateCodeToName(stateCode);

  // Use end-anchored ILIKE via stateOrFilter for precise matching,
  // then refine with extractStateCode to avoid over-matching
  const candidates = await fetchAllRows<Recipient>(
    () => {
      let q = getSupabase().from('recipients').select('*');
      const orFilter = stateOrFilter(stateCode);
      if (orFilter) {
        q = q.or(orFilter);
      } else {
        q = q.eq('entered_service_state', stateCode);
      }
      return q as any;
    }
  );

  // Precise filter using the same logic as the map-data API
  const recipients = candidates.filter((r) => {
    const code = extractStateCode(r.entered_service_state);
    return code === stateCode;
  });

  if (recipients.length === 0) return null;

  // Fetch recipient_awards in batches to avoid URL-length limits with large .in() clauses
  const recipientIds = recipients.map((r) => r.id);
  const recipientAwards: any[] = [];
  const BATCH_SIZE = 300;
  for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
    const batch = recipientIds.slice(i, i + BATCH_SIZE);
    const rows = await fetchAllRows<any>(
      () => getSupabase()
        .from('recipient_awards')
        .select('*, awards(*)')
        .in('recipient_id', batch) as any
    );
    recipientAwards.push(...rows);
  }

  const awardBreakdown: Record<string, number> = {};
  const recipientAwardSlugs: Record<string, string[]> = {};
  for (const ra of recipientAwards) {
    const slug = ra.awards?.slug;
    if (slug) {
      awardBreakdown[slug] = (awardBreakdown[slug] ?? 0) + 1;
      const rid = ra.recipient_id;
      if (!recipientAwardSlugs[rid]) recipientAwardSlugs[rid] = [];
      recipientAwardSlugs[rid].push(slug);
    }
  }

  return {
    state: stateCode,
    totalRecipients: recipients.length,
    awardBreakdown,
    topRecipients: recipients.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      rank: r.rank,
      branch: r.branch,
      awardSlugs: recipientAwardSlugs[r.id] ?? [],
    })),
  };
}

export async function getLeaderboard(params: {
  conflict?: string;
  branch?: string;
  state?: string;
  limit?: number;
}) {
  const limit = params.limit ?? 50;

  const data = await fetchAllRows<any>(
    () => {
      let q = getSupabase()
        .from('recipients')
        .select('*, recipient_awards(*, awards(*))');

      if (params.conflict) q = q.eq('conflict', params.conflict);
      if (params.branch) q = q.eq('branch', params.branch);
      if (params.state) {
        const orFilter = stateOrFilter(params.state);
        if (orFilter) {
          q = q.or(orFilter);
        } else {
          q = q.eq('entered_service_state', params.state);
        }
      }
      return q as any;
    }
  );

  const scored = data.map((r: any) => {
    const awards = r.recipient_awards ?? [];
    let score = 0;
    for (const ra of awards) {
      const slug = ra.awards?.slug;
      if (!slug) continue;
      const weight = getWeight(slug);
      score += weight * (1 + (ra.oak_leaf_clusters ?? 0));
    }
    return { ...r, score };
  });

  scored.sort((a: any, b: any) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break by name for stable ordering
    return (a.full_name ?? '').localeCompare(b.full_name ?? '');
  });
  return scored.slice(0, limit);
}

function getWeight(slug: string): number {
  const weights: Record<string, number> = {
    'medal-of-honor': 100,
    'distinguished-service-cross': 50,
    'navy-cross': 50,
    'air-force-cross': 50,
    'coast-guard-cross': 50,
    'silver-star': 20,
    'distinguished-flying-cross': 15,
    'bronze-star': 10,
    'purple-heart': 5,
    'legion-of-merit': 3,
    'pow-medal': 3,
  };
  return weights[slug] ?? 3;
}

export async function getCompareStates(state1: string, state2: string) {
  const [summary1, summary2] = await Promise.all([
    getStateSummary(state1),
    getStateSummary(state2),
  ]);
  return { state1: summary1, state2: summary2 };
}
