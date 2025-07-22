'use client'

import Image from "next/image";
import { useState } from 'react';
import { getCustomerById } from './airtableClient';

export default function Home() {
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY);
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const customer = await getCustomerById(customerId.trim());
      if (!customer) {
        setError('Customer not found.');
      } else {
        // Placeholder: navigate to tracked objects page
        alert(`Customer found: ${customer.fields.name || customer.id}`);
        // In a real app, use router.push(`/customer/${customerId}`)
      }
    } catch (err) {
      setError('Error fetching customer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Agent Portal</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="customerId" className="font-medium">Customer ID</label>
          <input
            id="customerId"
            type="text"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            className="border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
            placeholder="Enter customer ID"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded py-2 font-semibold hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </form>
      </div>
    </main>
  );
}
