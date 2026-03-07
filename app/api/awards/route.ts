import { NextRequest, NextResponse } from 'next/server';
import { getAwards } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const awards = await getAwards();

    return NextResponse.json(awards, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
