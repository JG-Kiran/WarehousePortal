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

// Fetch all customers (IDs and names)
export async function getAllCustomers() {
  try {
    const records = await base('Customer').select({
      view: 'Grid view' 
    }).all();

    console.log('Successfully fetched customers:', records.length);
    const customers = records.map(record => ({
      id: record.id, // The real Airtable Record ID
      customerId: record.get('Customer ID'),
      name: record.get('Name'),
    }));

    return customers;

  } catch (err) {
    console.error('Error fetching customers:', err);
    throw err; // Re-throw the error to be handled by the calling function
  }
}

export type ItemFields = {
  'Item Name': string; // Use the exact field names from Airtable
  'Status': 'In Stock' | 'Sold' | 'In Transit';
  'Value'?: number; // Use '?' for optional fields
  'Customer ID'?: readonly string[]; // Linked records are arrays of strings (Record IDs)
};

// Type for an object item (Airtable record)
export type ObjectItem = {
  id: string;
  fields: ItemFields;
};

// Fetch all items for a given customerId
export async function getObjectsForCustomer(customerId: string): Promise<ObjectItem[]> {
  try {
    const records = await base('Item').select({
      filterByFormula: `{Customer ID} = '${customerId}'`,
      view: 'Grid view',
    }).all();
    return records.map(record => ({ id: record.id, fields: record.fields as ItemFields}));
  } catch (err) {
    console.error('Error fetching items for customer:', err);
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