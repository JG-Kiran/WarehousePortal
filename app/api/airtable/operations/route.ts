import { NextResponse } from 'next/server';
import { getOnTheWayOperations } from '@/app/lib/airtableClient';

export async function GET() {
  try {
    const operations = await getOnTheWayOperations();
    return NextResponse.json({ operations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 });
  }
}