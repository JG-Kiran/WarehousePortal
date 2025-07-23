import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
if (!apiKey || !baseId) {
  throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variable');
}
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey,
});

const base = new Airtable().base(baseId);


// Type for an object item (Airtable record)
export type ObjectItem = {
  id: string;
  fields: Record<string, any>;
};

export type LogEntry = {
  pallet: { id: string; fields: Record<string, any> };
  items: { id: string; fields: Record<string, any> }[];
};

// Fetch all items for a given customerId
export async function getObjectsForCustomer(customerId: string): Promise<ObjectItem[]> {
  try {
    const records = await base('Item').select({
      filterByFormula: `{Customer ID} = '${customerId}'`,
      view: 'Grid view',
    }).all();
    return records.map(record => ({ id: record.id, fields: record.fields }));
  } catch (err) {
    console.error('Error fetching items for customer:', err);
    throw err;
  }
}

export async function getOnTheWayOperations() {
  try {
    const records = await base('Operation').select({
      filterByFormula: `{Status} = 'On the way'`,
      view: 'Grid view',
    }).all();
    return records.map(record => ({ id: record.id, fields: record.fields }));
  } catch (err) {
    console.error('Error fetching on the way operations:', err);
    throw err;
  }
}

export async function getItemsForOperation(operationId: string) {
  try {
    const records = await base('Item').select({
      filterByFormula: `{Operation ID} = '${operationId}'`,
      view: 'Grid view',
    }).all();
    return records.map(record => ({ id: record.id, fields: record.fields }));
  } catch (err) {
    console.error('Error fetching items for operation:', err);
    throw err;
  }
}

export async function updateItemsAndOperation(operationId: string, logs: LogEntry[]) {
  try {
    const itemUpdates = logs.flatMap(log => 
      log.items.map(item => ({
        id: item.id,
        fields: {
          'Pallet ID': { text: log.pallet.id}, 
          'Status': 'In Storage'
        }
      }))
    );

    // Airtable's update method can handle up to 10 records at a time.
    // This loop processes the updates in chunks of 10.
    for (let i = 0; i < itemUpdates.length; i += 10) {
      const chunk = itemUpdates.slice(i, i + 10);
      await base('Item').update(chunk as any);
    }

    // Finally, update the operation status.
    const operationRecords = await base('Operations').select({
        filterByFormula: `{Operation ID} = '${operationId}'`,
        maxRecords: 1
    }).firstPage();

    if (operationRecords.length > 0) {
        const operationRecordId = operationRecords[0].id;
        await base('Operations').update([
            {
                id: operationRecordId,
                fields: { 'Status': 'In Storage' }
            }
        ]);
    } else {
        throw new Error(`Operation with ID ${operationId} not found.`);
    }

  } catch (err) {
    console.error('Error in batch update to Airtable:', err);
    throw err;
  }
}

// Update item status by record ID
export async function updateItemStatus(recordId: string, status: string) {
  try {
    await base('Item').update([
      {
        id: recordId,
        fields: {
          'Status': status
        }
      }
    ]);
    console.log(`Successfully updated item ${recordId} status to ${status}`);
  } catch (err) {
    console.error('Error updating item status:', err);
    throw err;
  }
}

// Find item by barcode within a customer's items
export async function findItemByBarcode(customerId: string, barcode: string): Promise<ObjectItem | null> {
  try {
    // Try different possible barcode field names
    const possibleFieldNames = ['Barcode', 'Code', 'QR Code', 'Item Code', 'Barcode Number'];
    
    for (const fieldName of possibleFieldNames) {
      const records = await base('Item').select({
        filterByFormula: `AND({Customer ID} = '${customerId}', {${fieldName}} = '${barcode}')`,
        view: 'Grid view',
      }).all();
      
      if (records.length > 0) {
        return { id: records[0].id, fields: records[0].fields };
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error finding item by barcode:', err);
    throw err;
  }
}