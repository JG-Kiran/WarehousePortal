import { NextResponse } from 'next/server';
import { getObjectsForCustomer } from '../../../lib/airtableClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
  }
  try {
    const items = await getObjectsForCustomer(customerId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
