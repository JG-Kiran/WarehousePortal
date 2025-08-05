import { NextRequest, NextResponse } from 'next/server';
import { getStoredItemsForCustomer } from '@/app/lib/airtableClient';

export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId query parameter' }, { status: 400 });
  }

  try {
    const items = await getStoredItemsForCustomer(customerId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}