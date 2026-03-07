import { NextRequest, NextResponse } from 'next/server';
import { getAwardStats } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const stats = await getAwardStats(params.slug);

    if (!stats) {
      return NextResponse.json({ error: 'Award not found' }, { status: 404 });
    }

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
