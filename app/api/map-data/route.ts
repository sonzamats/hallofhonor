import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const award = searchParams.get('award') ?? undefined;

    let query = getSupabase()
      .from('recipients')
      .select('entered_service_state');

    if (award) {
      // Filter by award slug: look up the award id, then filter recipients
      const { data: awardData } = await getSupabase()
        .from('awards')
        .select('id')
        .eq('slug', award)
        .single();

      if (awardData) {
        const { data: recipientIds } = await getSupabase()
          .from('recipient_awards')
          .select('recipient_id')
          .eq('award_id', awardData.id);

        if (recipientIds && recipientIds.length > 0) {
          query = query.in(
            'id',
            recipientIds.map((r) => r.recipient_id)
          );
        } else {
          return NextResponse.json({}, {
            headers: { 'Cache-Control': 'public, s-maxage=3600' },
          });
        }
      }
    }

    // Supabase defaults to 1000 rows; we need all recipients
    query = query.limit(10000);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate counts by state
    const stateCounts: Record<string, number> = {};
    for (const row of data ?? []) {
      const st = row.entered_service_state;
      if (st) {
        stateCounts[st] = (stateCounts[st] ?? 0) + 1;
      }
    }

    return NextResponse.json(stateCounts, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
