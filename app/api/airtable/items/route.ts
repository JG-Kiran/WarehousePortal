import { NextRequest, NextResponse } from 'next/server';
import { getItemsForOperation } from '@/app/lib/airtableClient';

export async function GET(request: NextRequest) {
  const operationId = request.nextUrl.searchParams.get('operationId');

  if (!operationId) {
    return NextResponse.json({ error: 'Missing operationId query parameter' }, { status: 400 });
  }

  try {
    const items = await getItemsForOperation(operationId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}