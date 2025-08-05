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
export async function getItemsForCustomer(customerId: string): Promise<ObjectItem[]> {
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

export type OperationFields = {
  'Operation ID': string;
  'Name'?: string; // Add any other fields you use, mark optional with '?'
  'Type': 'Incoming' | 'Outgoing';
  'Customer ID'?: readonly string[];
  'Items OTW Count'?: number;
  'Items Stored Count'?: number;
}

export type Operation = {
  id: string;
  fields: OperationFields;
};

async function getOperationsByType(type: 'Incoming' | 'Outgoing'): Promise<Operation[]> {
  const countField = type === 'Incoming' ? '{Items OTW Count}' : '{Items Stored Count}';
  const typeFilter = type === 'Incoming'
    ? "OR({Type} = 'BA-In', {Type} = 'BC')"
    : "OR({Type} = 'BA-Out', {Type} = 'RR')";

  const finalFilter = `AND(${countField} > 0, ${typeFilter})`;

  try {
    const records = await base('operation').select({
      filterByFormula: finalFilter,
      view: 'Grid view',
      fields: ['Operation ID', 'Name', 'Type', 'Customer ID', 'Items OTW Count', 'Items Stored Count'],
    }).all();

    return records.map(record => ({
      id: record.id,
      fields: record.fields as OperationFields,
    }));

  } catch (err) {
    console.error(`Error fetching ${type} operations:`, err);
    throw err;
  }
}

export function getIncomingOperations() {
  return getOperationsByType('Incoming');
}

export function getOutgoingOperations() {
  return getOperationsByType('Outgoing');
}

export async function getOTWItemsForOperation(operationId: string) {
  try {
    const records = await base('Item').select({
      filterByFormula: `AND({Operation ID} = '${operationId}', {Status} = 'Stored')`,
      view: 'Grid view',
    }).all();
    return records.map(record => ({ id: record.id, fields: record.fields }));
  } catch (err) {
    console.error('Error fetching items for operation:', err);
    throw err;
  }
}

export async function getCustomerByRecordId(recordId: string) {
  try {
    const record = await base('customer').find(recordId);
    return {
      id: record.id,
      name: record.get('Name'),
      customerId: record.get('Customer ID'),
    };
  } catch (error) {
    console.error('Error fetching customer by record ID:', error);
    throw error;
  }
}

export async function getStoredItemsForCustomer(customerId: string) {
  try {
    const records = await base('Item').select({
      filterByFormula: `AND({Customer ID} = '${customerId}', {Status} = 'Stored')`,
      view: 'Grid view',
    }).all();
    return records.map(record => ({ id: record.id, fields: record.fields }));
  } catch (err) {
    console.error('Error fetching stored items for customer:', err);
    throw err;
  }
}

export async function updateIncomingItems(logs: LogEntry[]) {
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
    console.log("Item update works");

  } catch (err) {
    console.error('Error in batch update to Airtable:', err);
    throw err;
  }
}

export async function updateOutgoingItems(logs: LogEntry[]) {
  try {
    const itemUpdates = logs.flatMap(log =>
      log.items.map(item => ({
        id: item.id,
        fields: {
          'Pallet ID': { text: '' },
          'Status': 'In transit - Outgoing',
        }
      }))
    );

    // Process updates in chunks of 10
    for (let i = 0; i < itemUpdates.length; i += 10) {
      const chunk = itemUpdates.slice(i, i + 10);
      await base('Item').update(chunk as any);
    }
    console.log("Outgoing item update successful.");

  } catch (err) {
    console.error('Error in batch update for outgoing items:', err);
    throw err;
  }
}