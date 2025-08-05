'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Operation } from '../lib/airtableClient';

export default function DashboardClient({ 
  initialOperations,
  flowType 
}: { 
  initialOperations: Operation[];
  flowType: 'incoming' | 'outgoing';
}) {
  const [operations] = useState<Operation[]>(initialOperations);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const filteredOperations = useMemo(() => {
    if (!searchQuery) return operations;
    return operations.filter(op =>
      op.fields['Operation ID']?.toString().startsWith(searchQuery)
    );
  }, [searchQuery, operations]);

  async function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedOperationRecordId = e.target.value;
    const selectedOperation = operations.find(op => op.id === selectedOperationRecordId);
    
    if (!selectedOperation) return;

    const operationId = selectedOperation.fields['Operation ID'];

    if (flowType === 'incoming') {
      router.push(`/operations/incoming/${operationId}`);

    } else {
      const customerRecordId = selectedOperation.fields['Customer ID']?.[0];
      
      if (!customerRecordId) {
        alert('Error: This outgoing operation is not linked to a customer.');
        return;
      }
      
      setIsNavigating(true);
      try {
        const res = await fetch(`/api/airtable/customers?customerRecordId=${customerRecordId}`);
        if (!res.ok) throw new Error('Customer lookup failed.');
        const { customer } = await res.json();
        
        if (customer && customer.customerId) {
          router.push(`/operations/outgoing/${operationId}/customer/${customer.customerId}`);
        } else {
          throw new Error('Customer custom ID not found.');
        }

      } catch (error) {
        alert('An error occurred while finding the customer.');
        setIsNavigating(false);
      }
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
        value=""
        disabled={isNavigating}
      >
        <option value="" disabled>
          {isNavigating ? 'Loading...' : `Select from ${filteredOperations.length} operations...`}
        </option>
        {filteredOperations.map(op => (
          // Use the Airtable Record ID as the value for easy lookup
          <option key={op.id} value={op.id}>
            {op.fields['Operation ID']}
          </option>
        ))}
      </select>
    </div>
  );
}