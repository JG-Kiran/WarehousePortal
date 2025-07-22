'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ObjectItem } from '../../lib/airtableClient';

export default function CustomerObjectsPage() {
  const { customerId } = useParams() as { customerId: string };
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchObjects() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/airtable/items?customerId=${customerId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setObjects(data.items);
      } catch (err) {
        setError('Failed to fetch objects.');
      } finally {
        setLoading(false);
      }
    }
    fetchObjects();
  }, [customerId]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-4 text-center">Tracked Objects</h1>
        <button className="w-full mb-4 bg-blue-600 text-white rounded py-2 font-semibold hover:bg-blue-700 transition">
          Scan QR Code
        </button>
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : objects.length === 0 ? (
          <div className="text-center">No objects found for this customer.</div>
        ) : (
          <ul className="space-y-3">
            {objects.map(obj => (
              <li key={obj.id} className="bg-white rounded shadow p-4 flex flex-col gap-1">
                <div className="font-semibold">ID: {obj.id}</div>
                {Object.entries(obj.fields).map(([key, value]) => (
                  <div key={key} className="text-sm text-gray-700">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
} 