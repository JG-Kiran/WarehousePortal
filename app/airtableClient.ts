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

const airtableClient = new Airtable().base(baseId);
export default airtableClient;