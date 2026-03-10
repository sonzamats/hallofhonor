import { NextRequest, NextResponse } from 'next/server';
import { getStateSummary } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const summary = await getStateSummary(code);

    if (!summary) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 });
    }

    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
