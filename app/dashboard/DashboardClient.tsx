'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Operation } from '../lib/airtableClient';

export default function DashboardClient({ initialOperations }: { initialOperations: Operation[] }) {
  const [operations] = useState<Operation[]>(initialOperations);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const filteredOperations = useMemo(() => {
    if (!searchQuery) return operations;
    return operations.filter(op =>
      op.fields['Operation ID']?.toString().startsWith(searchQuery)
    );
  }, [searchQuery, operations]);

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const operationId = e.target.value;
    if (operationId) {
      router.push(`/operations/${operationId}`);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    setSearchQuery(numericValue);
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Type to filter Operation ID..."
        className="w-full border rounded px-3 py-2 text-black text-center mb-4"
      />
      <select
        className="w-full border rounded px-3 py-2 text-black"
        onChange={handleSelect}
        value="" // Reset value to show the placeholder
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
  );
}