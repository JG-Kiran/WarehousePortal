'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Operation = {
  id: string;
  fields: {
    'Operation ID': string;
    [key: string]: any;
  };
};

export default function AgentDashboard() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchOperations() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/airtable/operations');
        if (!res.ok) throw new Error('Failed to fetch operations.');
        const data = await res.json();
        setOperations(data.operations);
      } catch (err) {
        setError('Failed to fetch operations');
      } finally {
        setLoading(false);
      }
    }
    fetchOperations();
  }, []);

  const filteredOperations = useMemo(() => {
    if (!searchQuery) {
      return operations; // Show all operations if search is empty
    }
    return operations.filter(op =>
      op.fields['Operation ID']?.toString().startsWith(searchQuery)
    );
  }, [searchQuery, operations]);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const operationId = e.target.value;
    setSelectedId(operationId);
    if (operationId) {
      router.push(`/operations/${operationId}`);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow only numbers to be typed
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    setSearchQuery(numericValue);
}

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 text-black">
    <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Agent Dashboard</h1>
      <p className="text-center mb-6">Welcome to the agent dashboard!<br/>Find an operation by typing its ID.</p>
      
      {loading && (
          <div className="text-center text-gray-500">Loading operations...</div>
        )}

        {error && (
          <div className="text-red-500 text-center">{error}</div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Type to filter Operation ID..."
                className="w-full border rounded px-3 py-2 text-black text-center"
            />
            <select
              className="w-full border rounded px-3 py-2 text-black"
              onChange={handleSelect}
              value="" // Always reset the select value to show the placeholder
            >
              <option value="" disabled>
                {filteredOperations.length > 0
                  ? `Select from ${filteredOperations.length} matching operations...`
                  : "No operations found."
                }
              </option>
              {filteredOperations.map(op => (
                <option key={op.id} value={op.fields['Operation ID']}>
                  {op.fields['Operation ID']}
                </option>
              ))}
            </select>
          </div>
        )}
    </div>
  </main>
  );
} 