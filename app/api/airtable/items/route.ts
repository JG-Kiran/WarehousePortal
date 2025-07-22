import { NextResponse } from 'next/server';
import { getObjectsForCustomer, findItemByBarcode, updateItemStatus } from '../../../lib/airtableClient';

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

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  if (!customerId) {
    return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
  }
  
  try {
    const { barcode } = await request.json();
    if (!barcode) {
      return NextResponse.json({ error: 'Missing barcode' }, { status: 400 });
    }

    // Find item by barcode
    const item = await findItemByBarcode(customerId, barcode);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if status is "On the way" (only update if it is)
    const currentStatus = item.fields.Status;
    if (currentStatus !== 'On the way') {
      return NextResponse.json({ 
        error: `Item status is "${currentStatus}", not "On the way"` 
      }, { status: 400 });
    }

    // Update status to "In Storage"
    await updateItemStatus(item.id, 'In Storage');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Item status updated to In Storage',
      itemId: item.id 
    });
    
  } catch (error) {
    console.error('Error updating item status:', error);
    return NextResponse.json({ error: 'Failed to update item status' }, { status: 500 });
  }
}
