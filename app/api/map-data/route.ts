import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { extractStateCode, fetchAllRows } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const award = searchParams.get('award') ?? undefined;

    // If filtering by award, resolve recipient IDs first
    let recipientIdFilter: string[] | null = null;
    if (award) {
      const { data: awardData } = await getSupabase()
        .from('awards')
        .select('id')
        .eq('slug', award)
        .single();

      if (!awardData) {
        return NextResponse.json({}, {
          headers: { 'Cache-Control': 'public, s-maxage=3600' },
        });
      }

      const awardRecipients = await fetchAllRows<{ recipient_id: string }>(
        () => getSupabase()
          .from('recipient_awards')
          .select('recipient_id')
          .eq('award_id', awardData.id) as any
      );
      if (awardRecipients.length === 0) {
        return NextResponse.json({}, {
          headers: { 'Cache-Control': 'public, s-maxage=3600' },
        });
      }
      recipientIdFilter = awardRecipients.map((r) => r.recipient_id);
    }

    // Paginate through ALL recipients to avoid Supabase row-limit caps
    const allRows = await fetchAllRows<{ entered_service_state: string | null }>(
      () => {
        let q = getSupabase().from('recipients').select('entered_service_state');
        if (recipientIdFilter) {
          q = q.in('id', recipientIdFilter);
        }
        return q as any;
      }
    );

    // Aggregate counts by normalized 2-letter state code
    const stateCounts: Record<string, number> = {};
    for (const row of allRows) {
      const raw = row.entered_service_state;
      if (!raw) continue;
      const code = extractStateCode(raw);
      if (code) {
        stateCounts[code] = (stateCounts[code] ?? 0) + 1;
      }
    }

    return NextResponse.json(stateCounts, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
