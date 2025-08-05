'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// --- Type definitions (can be moved to a shared types file) ---
type Item = {
  id: string;
  fields: {
    'Item ID': string;
    'Name': string;
    'Status': string;
    'Barcode': {text: string};
    [key: string]: any;
  };
};

type LogEntry = { 
  logId: string; 
  items: Item[] 
};

export default function OutgoingCustomerPage() {
  const { operationId, customerId } = useParams() as { operationId: string, customerId: string };
  
  const [itemsToScan, setItemsToScan] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loggedItemIds, setLoggedItemIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const [activeTab, setActiveTab] = useState<'scan' | 'logs'>('scan');

  useEffect(() => {
    async function fetchCustomerItems() {
      if (!customerId) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/airtable/items-outgoing?customerId=${customerId}`);
        if (!res.ok) throw new Error('Failed to fetch customer items.');
        const data = await res.json();
        setItemsToScan(data.items);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomerItems();
  }, [customerId]);

  // --- Barcode Scanner Listener ---
    useEffect(() => {
      const handleKeyPress = (event: KeyboardEvent) => {
        const currentTime = Date.now();
        if (event.key === 'Enter') {
          const scannedBarcode = barcodeBuffer.trim();
          if (scannedBarcode) {
            handleBarcodeScanned(scannedBarcode);
            setBarcodeBuffer('');
          }
          return;
        }
        if (currentTime - lastKeyTime > 100) {
          setBarcodeBuffer(event.key);
        } else {
          setBarcodeBuffer(prev => prev + event.key);
        }
        setLastKeyTime(currentTime);
      };
  
      window.addEventListener('keypress', handleKeyPress);
      return () => window.removeEventListener('keypress', handleKeyPress);
    }, [barcodeBuffer, lastKeyTime, itemsToScan]);
  
    // --- Event Handlers ---
    const handleBarcodeScanned = (barcode: string) => {
      // Check if it's an item first
      const foundItem = itemsToScan.find(item => item.fields['Barcode'].text === barcode);
      if (foundItem) {
        if (!loggedItemIds.has(foundItem.id)) {
          setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            newSet.add(foundItem.id);
            return newSet;
          });
        }
        return;
      }
    };
    
    const handleUnselectItem = (itemIdToUnselect: string) => {
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemIdToUnselect);
        return newSet;
      });
    };
  
    const handleAddLog = () => {
      if (selectedItemIds.size === 0) {
        alert('Please select at least one item.');
        return;
      }
  
      const selectedItems = itemsToScan.filter(item => selectedItemIds.has(item.id));
      const newLog: LogEntry = {
        logId: `log-${Date.now()}`,
        items: selectedItems,
      };
      setLogs(prev => [newLog, ...prev]);
      setLoggedItemIds(prev => new Set([...prev, ...selectedItemIds]));
      setSelectedItemIds(new Set());
    };
  
    const handleEditLog = (logIdToEdit: string) => {
      if (selectedItemIds.size > 0) {
          alert('Please log your currently selected items before editing another log.');
          return;
      }
      const logToEdit = logs.find(log => log.logId === logIdToEdit);
      if (!logToEdit) return;
  
      // Restore selected items
      setSelectedItemIds(new Set(logToEdit.items.map(item => item.id)));
  
      // Then, remove the log as if it were being cleared
      handleClearLog(logIdToEdit);
    };
  
    const handleClearLog = (logIdToRemove: string) => {
      const logToRemove = logs.find(log => log.logId === logIdToRemove);
      if (!logToRemove) return;
  
      setLogs(prevLogs => prevLogs.filter(log => log.logId !== logIdToRemove));
      const itemIdsToUnlog = new Set(logToRemove.items.map(item => item.id));
      // Remove these item IDs from the master set of logged items
      setLoggedItemIds(prevLoggedIds => {
        const newLoggedIds = new Set(prevLoggedIds);
        itemIdsToUnlog.forEach(id => newLoggedIds.delete(id));
        return newLoggedIds;
      });
    };
  
  
    const handleSubmitToAirtable = async () => {
      if (logs.length === 0) return alert('No logs to submit.');
      setIsSubmitting(true);
      setError('');
  
      try {
        const res = await fetch('/api/airtable/submit-outgoing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs }),
        });
  
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to submit.');
        }
        
        alert('Successfully submitted to Airtable!');
        setLogs([]);
        // You might want to refetch items here to show their new status
        
      } catch (err: any) {
        setError(err.message);
        alert(`Error: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const getDisplayValue = (value: any): string => {
      if (typeof value === 'object' && value !== null && value.text) {
        return value.text;
      }
      return String(value || '');
    };
  
    // --- Render Logic ---
    if (loading) return <div className="text-center p-10">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  
    const SelectedItemsList = () => (
      <ul className="text-sm list-none font-mono pr-2">
        {itemsToScan.filter(i => selectedItemIds.has(i.id)).map(i => (
          <li key={i.id} className="flex justify-between items-center bg-gray-100 mb-1 p-1 rounded">
            <span>{getDisplayValue(i.fields['Barcode'])}</span>
            <button 
              onClick={() => handleUnselectItem(i.id)}
              className="text-red-500 font-bold px-2 rounded hover:bg-red-100"
              aria-label={`Remove item ${getDisplayValue(i.fields['Barcode'])}`}
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
    );
  
    const LogList = () => (
      <ul className="space-y-3">
        {logs.map(log => (
          <li key={log.logId} className="text-sm bg-gray-50 p-2 rounded flex justify-between items-start">
            <div>
              <ul className="list-disc list-inside pl-4 font-mono">
              {log.items.map(item => <li key={item.id}>{getDisplayValue(item.fields['Barcode'])}</li>)}
              </ul>
            </div>
            <div className="flex items-center gap-2">
              {/* Edit button */}
              <button 
                onClick={() => handleEditLog(log.logId)}
                className="bg-blue-500 text-white font-bold w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-blue-600 text-xs"
                aria-label={`Edit log: ${log.logId}`}
              >
                &#9998; {/* Pencil icon */}
              </button>
              {/* Delete button */}
              <button 
                onClick={() => handleClearLog(log.logId)}
                className="bg-red-500 text-white font-bold w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-red-600"
                aria-label={`Clear log: ${log.logId}`}
              >
                &times;
              </button>
            </div>
          </li>
        ))}
      </ul>
    )

  return (
    <>
      {/* --- Desktop Layout --- */}
      <div className="hidden md:flex flex-col h-screen bg-gray-100 text-black">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          {/* Back Button */}
          <Link href="/dashboard/outgoing" className="bg-gray-200 text-black px-4 py-2 rounded font-semibold hover:bg-gray-300">
            &larr; Back to Outgoing Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Customer: {customerId}</h1>
          <div style={{ width: '250px' }}></div> 
        </header>

        <main className="flex-grow flex p-4 gap-4 overflow-hidden">
            {/* Selected Items Panel */}
            <div className="w-1/4 bg-white rounded-lg shadow p-4 flex flex-col">
              <h2 className="text-lg font-semibold mb-2 border-b pb-2 flex-shrink-0">Selected Items ({selectedItemIds.size})</h2>
              <div className="flex-grow overflow-y-auto pr-2">
                <SelectedItemsList />
                <div className="border-t pt-4 mt-2 flex-shrink-0">
                  <button onClick={handleAddLog} disabled={selectedItemIds.size === 0} className="w-full bg-blue-600 text-white rounded py-2 font-semibold disabled:bg-gray-400">Add to Log</button>
                </div>
              </div>
            </div>
            {/* Item Grid */}
            <div className="flex-grow bg-white rounded-lg shadow p-4 flex-grow flex flex-col overflow-y-auto">
              <h2 className="text-lg font-semibold mb-3 border-b pb-2">Scan Items for Operation</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {itemsToScan.map(item => {
                  const isSelected = selectedItemIds.has(item.id);
                  const isLogged = loggedItemIds.has(item.id);
                  const barcodeValue = getDisplayValue(item.fields['Barcode']);
                  return (<div key={item.id} className={`p-3 rounded border text-center font-mono text-sm break-all transition-colors ${isLogged ? 'bg-gray-200 text-gray-500' : isSelected ? 'bg-green-500 text-white' : 'hover:bg-gray-50 cursor-pointer'}`} onClick={() => !isLogged && handleBarcodeScanned(barcodeValue)}>{barcodeValue}</div>);
                })}
              </div>
            </div>
        </main>
        <footer className="bg-white shadow-up p-4 h-1/3 flex gap-4">
          <div className="flex-grow border rounded-lg p-4 flex flex-col overflow-y-auto">
            <h2 className="text-lg font-semibold border-b pb-2 mb-3">Session Logs ({logs.length})</h2>
            <div className="flex-grow overflow-y-auto">
              <LogList />
              </div>
            <div className="flex-shrink-0">
              <button onClick={handleSubmitToAirtable} disabled={logs.length === 0 || isSubmitting} className="w-full bg-green-600 text-white rounded py-2 font-semibold disabled:bg-gray-400">{isSubmitting ? 'Submitting...' : `Submit All Logs`}</button>
            </div>
          </div>
        </footer>
      </div>

      {/* --- Mobile Layout --- */}
      <div className="md:hidden flex flex-col h-screen bg-gray-100 text-black">
        <header className="bg-white shadow p-4 flex justify-between items-center">
          {/* Back Button */}
          <Link href="/dashboard/outgoing" className="text-sm bg-gray-200 px-3 py-1 rounded font-semibold">
            &larr; Back
          </Link>
          <h1 className="text-lg font-bold">Op: {operationId}</h1>
          <div style={{ width: '68px' }}></div>
        </header>
        <main className="flex-grow p-4 overflow-y-auto">
          {activeTab === 'scan' && (
            <div>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg font-semibold mb-2">2. Selected Items ({selectedItemIds.size})</h2>
                <div className="max-h-24 overflow-y-auto"><SelectedItemsList /></div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-2">3. Scan Items</h2>
                <div className="grid grid-cols-3 gap-2">
                  {itemsToScan.map(item => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isLogged = loggedItemIds.has(item.id);
                    const barcodeValue = getDisplayValue(item.fields['Barcode']);
                    return (<div key={item.id} className={`p-2 rounded border text-center font-mono text-xs break-all transition-colors ${isLogged ? 'bg-gray-200 text-gray-500' : isSelected ? 'bg-green-500 text-white' : 'hover:bg-gray-50'}`} onClick={() => !isLogged && handleBarcodeScanned(barcodeValue)}>{barcodeValue}</div>);
                  })}
                </div>
              </div>
              <button onClick={handleAddLog} disabled={selectedItemIds.size === 0} className="w-full bg-blue-600 text-white rounded py-3 font-semibold disabled:bg-gray-400 mt-4">Add {selectedItemIds.size} Items to Log</button>
            </div>
          )}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Review Logs ({logs.length})</h2>
              <div className="overflow-y-auto"><LogList /></div>
              <button onClick={handleSubmitToAirtable} disabled={logs.length === 0 || isSubmitting} className="w-full bg-green-600 text-white rounded py-3 font-semibold disabled:bg-gray-400 mt-4">{isSubmitting ? 'Submitting...' : `Submit All Logs`}</button>
            </div>
          )}
        </main>
        <footer className="bg-white shadow-up grid grid-cols-2 gap-px">
          <button onClick={() => setActiveTab('scan')} className={`py-4 text-sm font-medium transition-colors ${activeTab === 'scan' ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
            SCAN <span className="text-xs">({selectedItemIds.size})</span>
          </button>
          <button onClick={() => setActiveTab('logs')} className={`py-4 text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
            LOGS <span className="text-xs">({logs.length})</span>
          </button>
        </footer>
      </div>
    </>
  );
}