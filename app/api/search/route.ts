import { NextRequest, NextResponse } from 'next/server';
import { searchRecipients } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q');

    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const awardsParam = searchParams.get('awards');

    const data = await searchRecipients({
      q,
      awards: awardsParam ? awardsParam.split(',') : undefined,
      branch: searchParams.get('branch') ?? undefined,
      conflict: searchParams.get('conflict') ?? undefined,
      state: searchParams.get('state') ?? undefined,
      yearFrom: searchParams.has('yearFrom') ? parseInt(searchParams.get('yearFrom')!, 10) : undefined,
      yearTo: searchParams.has('yearTo') ? parseInt(searchParams.get('yearTo')!, 10) : undefined,
      posthumous: searchParams.has('posthumous') ? searchParams.get('posthumous') === 'true' : undefined,
      pow: searchParams.has('pow') ? searchParams.get('pow') === 'true' : undefined,
      withValor: searchParams.has('withValor') ? searchParams.get('withValor') === 'true' : undefined,
      page: parseInt(searchParams.get('page') ?? '1', 10),
      limit: parseInt(searchParams.get('limit') ?? '20', 10),
    });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
