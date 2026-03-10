import { NextRequest, NextResponse } from 'next/server';
import { getRecipients } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const data = await getRecipients({
      state: searchParams.get('state') ?? undefined,
      award: searchParams.get('award') ?? undefined,
      conflict: searchParams.get('conflict') ?? undefined,
      branch: searchParams.get('branch') ?? undefined,
      posthumous: searchParams.has('posthumous') ? searchParams.get('posthumous') === 'true' : undefined,
      pow: searchParams.has('pow') ? searchParams.get('pow') === 'true' : undefined,
      withValor: searchParams.has('withValor') ? searchParams.get('withValor') === 'true' : undefined,
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20)),
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
