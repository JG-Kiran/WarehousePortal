'use client';

import { useEffect, useState } from 'react';
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
  const [selectedId, setSelectedId] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchOperations() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/airtable/operations');
        if (!res.ok) throw new Error('Failed to fetch');
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

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const operationId = e.target.value;
    setSelectedId(operationId);
    if (operationId) {
      router.push(`/operations/${operationId}`);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 text-black">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Agent Dashboard</h1>
        <p className="text-center mb-6">Welcome to the agent dashboard!<br/>Select an operation to view its details.</p>
        {loading ? (
          <div className="text-center">Loading operations...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <select
            className="w-full border rounded px-3 py-2 mb-4 text-black"
            value={selectedId}
            onChange={handleSelect}
          >
            <option value="">Select an operation</option>
            {operations.map(op => (
              <option key={op.id} value={op.fields['Operation ID']}>
                {op.fields['Operation ID']}
              </option>
            ))}
          </select>
        )}
      </div>
    </main>
  );
} 