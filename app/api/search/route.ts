import { NextRequest, NextResponse } from 'next/server';
import { searchRecipients, getRecipients } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const branch = searchParams.get('branch') ?? undefined;
    const conflict = searchParams.get('conflict') ?? undefined;
    const state = searchParams.get('state') ?? undefined;
    const posthumous = searchParams.has('posthumous') ? searchParams.get('posthumous') === 'true' : undefined;
    const pow = searchParams.has('pow') ? searchParams.get('pow') === 'true' : undefined;
    const awardsParam = searchParams.get('awards');
    const award = awardsParam?.split(',')[0] ?? undefined;

    // If no search query, use the browse/filter endpoint
    if (!q) {
      const data = await getRecipients({
        branch,
        conflict,
        state,
        award,
        posthumous,
        pow,
        page,
        limit,
      });
      return NextResponse.json(
        { results: data.recipients, total: data.total },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const data = await searchRecipients({
      q,
      awards: awardsParam ? awardsParam.split(',') : undefined,
      branch,
      conflict,
      state,
      posthumous,
      pow,
      page,
      limit,
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
