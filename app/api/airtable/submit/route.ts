import { NextRequest, NextResponse } from 'next/server';
import { updateItems } from '@/app/lib/airtableClient';

export async function POST(request: NextRequest) {  
  try {
    const { logs } = await request.json();
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid logs' }, { status: 400 });
    }

    await updateItems(logs);
    
    return NextResponse.json({ success: true, message: 'Operation and items updated successfully.' });

  } catch (error: any) {
    console.error('Error submitting operation logs:', error);
    return NextResponse.json({ error: 'Failed to submit logs to Airtable' }, { status: 500 });
  }
}