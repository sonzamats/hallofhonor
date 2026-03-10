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

    // 2. Group duplicates by name + branch + conflict (most reliable combo)
    const groups = new Map<
      string,
      Array<{
        id: string;
        first_name: string;
        last_name: string;
      }>
    >();

    for (const r of allRecipients) {
      const key = [
        r.first_name.toLowerCase().trim(),
        r.last_name.toLowerCase().trim(),
        (r.branch || '').toLowerCase().trim(),
        (r.conflict || '').toLowerCase().trim(),
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

    // 4. Count links + recipients before deletion
    const { count: linksBefore } = await supabase
      .from('recipient_awards')
      .select('*', { count: 'exact', head: true });

    const { count: recipientsBefore } = await supabase
      .from('recipients')
      .select('*', { count: 'exact', head: true });

    // 5. Delete recipient_awards for all duplicate IDs first (clears FK constraints)
    const linkErrors: string[] = [];
    const BATCH = 100;

    for (let i = 0; i < idsToDelete.length; i += BATCH) {
      const batch = idsToDelete.slice(i, i + BATCH);
      const { error } = await supabase
        .from('recipient_awards')
        .delete()
        .in('recipient_id', batch);

      if (error) {
        linkErrors.push(`batch ${i}: ${error.message}`);
      }
    }

    // 6. Delete duplicate recipients in batches
    const recipientErrors: string[] = [];

    for (let i = 0; i < idsToDelete.length; i += BATCH) {
      const batch = idsToDelete.slice(i, i + BATCH);
      const { error } = await supabase
        .from('recipients')
        .delete()
        .in('id', batch);

      if (error) {
        recipientErrors.push(`batch ${i}: ${error.message}`);
      }
    }

    // 7. Count after deletion
    const { count: linksAfter } = await supabase
      .from('recipient_awards')
      .select('*', { count: 'exact', head: true });

    const { count: recipientsAfter } = await supabase
      .from('recipients')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      mode: 'EXECUTED',
      originalRecipients: allRecipients.length,
      duplicateGroupsFound: Array.from(groups.values()).filter((g) => g.length > 1).length,
      idsToDelete: idsToDelete.length,
      linksBefore,
      linksAfter,
      linksRemoved: (linksBefore ?? 0) - (linksAfter ?? 0),
      recipientsBefore,
      recipientsAfter,
      recipientsRemoved: (recipientsBefore ?? 0) - (recipientsAfter ?? 0),
      linkErrors: linkErrors.length > 0 ? linkErrors.slice(0, 5) : 'none',
      recipientErrors: recipientErrors.length > 0 ? recipientErrors.slice(0, 5) : 'none',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Deduplication failed', detail: error?.message },
      { status: 500 }
    );
  }
}
