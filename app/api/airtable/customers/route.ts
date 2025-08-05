import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByRecordId } from '@/app/lib/airtableClient';

export async function GET(request: NextRequest) {
  const recordId = request.nextUrl.searchParams.get('customerRecordId');

  if (!recordId) {
    return NextResponse.json({ error: 'Missing customer record ID' }, { status: 400 });
  }

  try {
    const customer = await getCustomerByRecordId(recordId);
    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer by record ID:', error);
    return NextResponse.json({ error: 'Failed to find customer' }, { status: 500 });
  }
}