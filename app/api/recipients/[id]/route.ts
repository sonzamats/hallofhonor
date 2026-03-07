import { NextRequest, NextResponse } from 'next/server';
import { getRecipientById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipient = await getRecipientById(params.id);

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    return NextResponse.json(recipient, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
