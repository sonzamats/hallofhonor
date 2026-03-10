import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * One-time admin endpoint to repair missing recipient_awards links.
 *
 * The original seed script matched recipients by full_name, but the DB's
 * generated full_name (first + last) drops middle names, causing ~68% of
 * links to be missed.  Since ALL recipients in this dataset are Medal of
 * Honor recipients, we simply ensure every recipient is linked to MOH.
 *
 * GET /api/admin/fix-linkage
 */
export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Get the Medal of Honor award ID
    const { data: mohAward, error: awardErr } = await supabase
      .from('awards')
      .select('id')
      .eq('slug', 'medal-of-honor')
      .single();

    if (awardErr || !mohAward) {
      return NextResponse.json(
        { error: 'Medal of Honor award not found in DB', detail: awardErr?.message },
        { status: 404 }
      );
    }

    const mohAwardId = mohAward.id;

    // 2. Get all recipient IDs
    const allRecipients = await fetchAllRows<{ id: string }>(
      () => supabase.from('recipients').select('id') as any
    );

    // 3. Get existing links (so we don't create duplicates)
    const existingLinks = await fetchAllRows<{ recipient_id: string }>(
      () =>
        supabase
          .from('recipient_awards')
          .select('recipient_id')
          .eq('award_id', mohAwardId) as any
    );

    const linkedIds = new Set<string>();
    for (const link of existingLinks) {
      linkedIds.add(link.recipient_id);
    }

    // 4. Find recipients missing the MOH link
    const missing = allRecipients.filter((r) => !linkedIds.has(r.id));

    if (missing.length === 0) {
      return NextResponse.json({
        message: 'All recipients already linked to Medal of Honor',
        totalRecipients: allRecipients.length,
        existingLinks: existingLinks.length,
        created: 0,
      });
    }

    // 5. Upsert missing links in batches
    const BATCH = 100;
    let created = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH).map((r) => ({
        recipient_id: r.id,
        award_id: mohAwardId,
        award_number: 1,
        with_valor: false,
        oak_leaf_clusters: 0,
      }));

      const { data, error } = await supabase
        .from('recipient_awards')
        .upsert(batch, { onConflict: 'recipient_id,award_id' })
        .select('id');

      if (error) {
        errors += batch.length;
        if (errorDetails.length < 5) {
          errorDetails.push(`Batch ${i}: ${error.message} (code: ${error.code})`);
        }
      } else {
        created += data?.length ?? 0;
      }
    }

    return NextResponse.json({
      message: 'Fix-linkage complete',
      totalRecipients: allRecipients.length,
      existingLinks: existingLinks.length,
      created,
      errors,
      ...(errorDetails.length > 0 && { errorDetails }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Fix-linkage failed', detail: error?.message },
      { status: 500 }
    );
  }
}
