import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Admin deduplication endpoint — removes duplicate recipients.
 *
 * Identifies exact duplicates (same name + same citation start) and keeps
 * only one copy.  Re-points any recipient_awards links to the surviving
 * recipient before deleting duplicates.
 *
 * GET /api/admin/deduplicate          — dry run (preview)
 * GET /api/admin/deduplicate?confirm=true — actually delete duplicates
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const confirm = url.searchParams.get('confirm') === 'true';

  try {
    const supabase = getServiceClient();

    // 1. Fetch all recipients
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
          .order('id', { ascending: true }) as any
    );

    // 2. Group duplicates using multiple strategies:
    //    - Primary: name + citation first 100 chars (strongest signal)
    //    - Secondary: name + branch + conflict + date_of_action (for records without citations)
    const groups = new Map<
      string,
      Array<{
        id: string;
        first_name: string;
        last_name: string;
      }>
    >();

    for (const r of allRecipients) {
      // Use citation-based key when citation exists, otherwise fall back to
      // name + branch + conflict + date_of_action
      const key = r.citation
        ? [
            r.first_name.toLowerCase().trim(),
            r.last_name.toLowerCase().trim(),
            (r.citation || '').slice(0, 100).toLowerCase().trim(),
          ].join('|')
        : [
            r.first_name.toLowerCase().trim(),
            r.last_name.toLowerCase().trim(),
            (r.branch || '').toLowerCase().trim(),
            (r.conflict || '').toLowerCase().trim(),
            (r.date_of_action || '').toLowerCase().trim(),
          ].join('|');

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // 3. Identify duplicates to remove (keep first by id)
    const idsToDelete: string[] = [];
    const remapLinks: Array<{ fromId: string; toId: string }> = [];

    for (const [, members] of groups) {
      if (members.length <= 1) continue;
      // Sort by id ascending — keep the first one
      members.sort((a, b) => a.id.localeCompare(b.id));
      const keepId = members[0].id;
      for (let i = 1; i < members.length; i++) {
        idsToDelete.push(members[i].id);
        remapLinks.push({ fromId: members[i].id, toId: keepId });
      }
    }

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY RUN — add ?confirm=true to execute',
        totalRecipients: allRecipients.length,
        duplicateGroupsFound: Array.from(groups.values()).filter((g) => g.length > 1).length,
        duplicateRowsToDelete: idsToDelete.length,
        afterDedup: allRecipients.length - idsToDelete.length,
        linksToRemap: remapLinks.length,
      });
    }

    // 4. Remap recipient_awards links
    let remapped = 0;
    let remapErrors = 0;

    // Process in batches — update links pointing to duplicate IDs
    for (const { fromId, toId } of remapLinks) {
      // First try to update the link
      const { error: updateErr } = await supabase
        .from('recipient_awards')
        .update({ recipient_id: toId })
        .eq('recipient_id', fromId);

      if (updateErr) {
        // If update fails (likely unique constraint), just delete the orphan links
        const { error: delErr } = await supabase
          .from('recipient_awards')
          .delete()
          .eq('recipient_id', fromId);

        if (delErr) {
          remapErrors++;
        } else {
          remapped++;
        }
      } else {
        remapped++;
      }
    }

    // 5. Delete duplicate recipients in batches
    let deleted = 0;
    let deleteErrors = 0;
    const BATCH = 100;

    for (let i = 0; i < idsToDelete.length; i += BATCH) {
      const batch = idsToDelete.slice(i, i + BATCH);
      const { error } = await supabase
        .from('recipients')
        .delete()
        .in('id', batch);

      if (error) {
        deleteErrors += batch.length;
      } else {
        deleted += batch.length;
      }
    }

    // 6. Final count
    const { count } = await supabase
      .from('recipients')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      mode: 'EXECUTED',
      originalRecipients: allRecipients.length,
      duplicateGroupsFound: Array.from(groups.values()).filter((g) => g.length > 1).length,
      linksRemapped: remapped,
      remapErrors,
      recipientsDeleted: deleted,
      deleteErrors,
      finalRecipientCount: count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Deduplication failed', detail: error?.message },
      { status: 500 }
    );
  }
}
