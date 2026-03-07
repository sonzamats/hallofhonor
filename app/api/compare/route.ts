import { NextRequest, NextResponse } from 'next/server';
import { getCompareStates } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statesParam = searchParams.get('states');

    if (!statesParam) {
      return NextResponse.json({ error: 'Query parameter "states" is required' }, { status: 400 });
    }

    const states = statesParam.split(',');

    if (states.length !== 2) {
      return NextResponse.json({ error: 'Exactly 2 state codes are required' }, { status: 400 });
    }

    const data = await getCompareStates(states[0], states[1]);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
