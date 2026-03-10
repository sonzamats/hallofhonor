import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Admin audit endpoint — reports database health and duplicate detection.
 *
 * GET /api/admin/audit
 */
export async function GET() {
  try {
    const supabase = getServiceClient();

    // 1. Count recipients
    const allRecipients = await fetchAllRows<{
      id: string;
      first_name: string;
      last_name: string;
      rank: string | null;
      branch: string | null;
      conflict: string | null;
      date_of_action: string | null;
      citation: string | null;
    }>(
      () =>
        supabase
          .from('recipients')
          .select('id, first_name, last_name, rank, branch, conflict, date_of_action, citation')
          .order('first_name')
          .order('last_name') as any
    );

    // 2. Count awards
    const { data: awards } = await supabase
      .from('awards')
      .select('id, slug, name');

    // 3. Count recipient_awards
    const allLinks = await fetchAllRows<{
      id: string;
      recipient_id: string;
      award_id: string;
    }>(
      () =>
        supabase
          .from('recipient_awards')
          .select('id, recipient_id, award_id') as any
    );

    // 4. Detect duplicate recipients by (first_name, last_name, branch, conflict)
    const dupeMap = new Map<string, { ids: string[]; name: string; branch: string | null; conflict: string | null }>();
    for (const r of allRecipients) {
      const key = `${r.first_name.toLowerCase()}|${r.last_name.toLowerCase()}|${(r.branch || '').toLowerCase()}|${(r.conflict || '').toLowerCase()}`;
      if (!dupeMap.has(key)) {
        dupeMap.set(key, {
          ids: [],
          name: `${r.first_name} ${r.last_name}`,
          branch: r.branch,
          conflict: r.conflict,
        });
      }
      dupeMap.get(key)!.ids.push(r.id);
    }

    const duplicateGroups = Array.from(dupeMap.values())
      .filter((g) => g.ids.length > 1)
      .sort((a, b) => b.ids.length - a.ids.length);

    const totalDuplicateRows = duplicateGroups.reduce(
      (sum, g) => sum + (g.ids.length - 1),
      0
    );

    // 5. Detect exact duplicate recipients (same citation = definitely same person)
    const exactDupeMap = new Map<string, string[]>();
    for (const r of allRecipients) {
      if (!r.citation) continue;
      const key = `${r.first_name.toLowerCase()}|${r.last_name.toLowerCase()}|${(r.citation || '').slice(0, 100).toLowerCase()}`;
      if (!exactDupeMap.has(key)) {
        exactDupeMap.set(key, []);
      }
      exactDupeMap.get(key)!.push(r.id);
    }

    const exactDuplicateGroups = Array.from(exactDupeMap.entries())
      .filter(([, ids]) => ids.length > 1)
      .map(([, ids]) => ids);

    const totalExactDuplicateRows = exactDuplicateGroups.reduce(
      (sum, ids) => sum + (ids.length - 1),
      0
    );

    // 6. Award link counts per award
    const awardLinkCounts: Record<string, number> = {};
    const awardIdToSlug: Record<string, string> = {};
    for (const a of awards || []) {
      awardIdToSlug[a.id] = a.slug;
      awardLinkCounts[a.slug] = 0;
    }
    for (const link of allLinks) {
      const slug = awardIdToSlug[link.award_id];
      if (slug) awardLinkCounts[slug]++;
    }

    // 7. Orphan links (links to recipients that would be removed as dupes)
    const allRecipientIds = new Set(allRecipients.map((r) => r.id));
    const orphanLinks = allLinks.filter((l) => !allRecipientIds.has(l.recipient_id));

    // 8. Unique recipient estimate (after dedup)
    const uniqueRecipientCount = allRecipients.length - totalExactDuplicateRows;

    return NextResponse.json({
      summary: {
        totalRecipients: allRecipients.length,
        uniqueRecipientsEstimate: uniqueRecipientCount,
        exactDuplicateRows: totalExactDuplicateRows,
        nameBranchConflictDuplicateRows: totalDuplicateRows,
        totalAwards: (awards || []).length,
        totalRecipientAwardLinks: allLinks.length,
        orphanLinks: orphanLinks.length,
      },
      awardLinkCounts,
      duplicateSample: duplicateGroups.slice(0, 20).map((g) => ({
        name: g.name,
        branch: g.branch,
        conflict: g.conflict,
        count: g.ids.length,
        ids: g.ids,
      })),
      exactDuplicateGroupCount: exactDuplicateGroups.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Audit failed', detail: error?.message },
      { status: 500 }
    );
  }
}
