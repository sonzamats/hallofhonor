import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const data = await getLeaderboard({
      conflict: searchParams.get('conflict') ?? undefined,
      branch: searchParams.get('branch') ?? undefined,
      state: searchParams.get('state') ?? undefined,
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50)),
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
