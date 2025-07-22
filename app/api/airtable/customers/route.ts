import { NextResponse } from 'next/server';
import { getAllCustomers } from '../../../lib/airtableClient';

export async function GET() {
  try {
    const customers = await getAllCustomers();
    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
} 