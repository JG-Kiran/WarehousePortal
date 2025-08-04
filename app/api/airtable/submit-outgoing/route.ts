import { NextRequest, NextResponse } from 'next/server';
import { updateOutgoingItems } from '@/app/lib/airtableClient';

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json();
    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json({ error: 'Missing or invalid logs' }, { status: 400 });
    }

    await updateOutgoingItems(logs);

    return NextResponse.json({ success: true, message: 'Outgoing items updated successfully.' });

  } catch (error: any) {
    console.error('Error submitting outgoing logs:', error);
    return NextResponse.json({ error: 'Failed to submit logs to Airtable' }, { status: 500 });
  }
}