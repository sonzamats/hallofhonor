import { getSupabase } from './supabase';
import type { Award, Recipient, RecipientWithAwards } from './supabase';

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

  let query = getSupabase().from('recipients').select('*', { count: 'exact' });

  if (params.state) query = query.eq('entered_service_state', params.state);
  if (params.conflict) query = query.eq('conflict', params.conflict);
  if (params.branch) query = query.eq('branch', params.branch);
  if (params.posthumous !== undefined) query = query.eq('posthumous', params.posthumous);
  if (params.pow !== undefined) query = query.eq('pow', params.pow);

  if (params.award) {
    const { data: awardData } = await getSupabase()
      .from('awards')
      .select('id')
      .eq('slug', params.award)
      .single();
    if (awardData) {
      const { data: recipientIds } = await getSupabase()
        .from('recipient_awards')
        .select('recipient_id')
        .eq('award_id', awardData.id)
        .limit(10000);
      if (recipientIds) {
        query = query.in('id', recipientIds.map((r) => r.recipient_id));
      }
    }
  }

  query = query.order('last_name').range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  const total = count ?? 0;

  return {
    recipients: data ?? [],
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

  let query = getSupabase()
    .from('recipients')
    .select('*', { count: 'exact' })
    .textSearch('search_vector', params.q, { type: 'websearch' });

  if (params.branch) query = query.eq('branch', params.branch);
  if (params.conflict) query = query.eq('conflict', params.conflict);
  if (params.state) query = query.eq('entered_service_state', params.state);
  if (params.posthumous !== undefined) query = query.eq('posthumous', params.posthumous);
  if (params.pow !== undefined) query = query.eq('pow', params.pow);

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    results: data ?? [],
    total: count ?? 0,
  };
}

export async function getAwardStats(slug: string) {
  const award = await getAwardBySlug(slug);
  if (!award) return null;

  const { data: recipientAwards } = await getSupabase()
    .from('recipient_awards')
    .select('*, recipients(*)')
    .eq('award_id', award.id)
    .limit(10000);

  const records = recipientAwards ?? [];

  const byConflict: Record<string, number> = {};
  const byBranch: Record<string, number> = {};
  const byState: Record<string, number> = {};
  let posthumousCount = 0;
  let withValorCount = 0;

  for (const ra of records) {
    const r = (ra as any).recipients as Recipient;
    if (r?.conflict) byConflict[r.conflict] = (byConflict[r.conflict] ?? 0) + 1;
    if (r?.branch) byBranch[r.branch] = (byBranch[r.branch] ?? 0) + 1;
    if (r?.entered_service_state) byState[r.entered_service_state] = (byState[r.entered_service_state] ?? 0) + 1;
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
  // Use count: 'exact' for the total, but limit returned rows
  const { data: recipients, count } = await getSupabase()
    .from('recipients')
    .select('*', { count: 'exact' })
    .eq('entered_service_state', stateCode)
    .limit(10000);

  if (!recipients) return null;

  const recipientIds = recipients.map((r) => r.id);
  const { data: recipientAwards } = await getSupabase()
    .from('recipient_awards')
    .select('*, awards(*)')
    .in('recipient_id', recipientIds)
    .limit(10000);

  const awardBreakdown: Record<string, number> = {};
  for (const ra of recipientAwards ?? []) {
    const slug = (ra as any).awards?.slug;
    if (slug) awardBreakdown[slug] = (awardBreakdown[slug] ?? 0) + 1;
  }

  return {
    state: stateCode,
    totalRecipients: count ?? 0,
    awardBreakdown,
    topRecipients: recipients.slice(0, 5),
  };
}

export async function getLeaderboard(params: {
  conflict?: string;
  branch?: string;
  state?: string;
  limit?: number;
}) {
  const limit = params.limit ?? 50;

  let query = getSupabase()
    .from('recipients')
    .select('*, recipient_awards(*, awards(*))')
    .limit(10000);

  if (params.conflict) query = query.eq('conflict', params.conflict);
  if (params.branch) query = query.eq('branch', params.branch);
  if (params.state) query = query.eq('entered_service_state', params.state);

  const { data, error } = await query;
  if (error) throw error;

  const scored = (data ?? []).map((r: any) => {
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

  scored.sort((a: any, b: any) => b.score - a.score);
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
