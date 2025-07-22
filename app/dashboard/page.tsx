'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Customer = {
  id: string;
  name: string;
  customerId: string;
};

export default function AgentDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/airtable/customers');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCustomers(data.customers);
      } catch (err) {
        setError('Failed to fetch customers');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedId(e.target.value);
    if (e.target.value) {
      router.push(`/customer/${e.target.value}`);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 text-black">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Agent Dashboard</h1>
        <p className="text-center mb-6">Welcome to the agent dashboard!<br/>Select a customer to view their items.</p>
        {loading ? (
          <div className="text-center">Loading customers...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <select
            className="w-full border rounded px-3 py-2 mb-4 text-black"
            value={selectedId}
            onChange={handleSelect}
          >
            <option value="">Select a customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.customerId}>
                {c.name} - ({c.customerId})
              </option>
            ))}
          </select>
        )}
      </div>
    </main>
  );
} 