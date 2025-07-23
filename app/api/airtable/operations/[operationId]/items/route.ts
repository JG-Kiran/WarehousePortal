import { NextResponse } from 'next/server';
import { getItemsForOperation } from '@/app/lib/airtableClient';

export async function GET(
  request: Request,
  { params }: { params: { operationId: string } }
) {
  const { operationId } = params;

  if (!operationId) {
    return NextResponse.json({ error: 'Missing operationId' }, { status: 400 });
  }

  try {
    const items = await getItemsForOperation(operationId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}