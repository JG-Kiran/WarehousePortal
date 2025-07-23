'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Item = {
  id: string; // Airtable record ID
  fields: {
    'Item ID': string;
    'Name': string;
    'Status': string;
    'Barcode': {text: string};
    [key: string]: any;
  };
};

type Pallet = {
  id: string; // Pallet barcode ID
};

type LogEntry = {
  logId: string; // A unique ID for the log entry (e.g., timestamp)
  pallet: Pallet;
  items: Item[];
};

// --- Main Component ---
export default function OperationPage() {
  const { operationId } = useParams() as { operationId: string };

  // --- State Management ---
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [currentPallet, setCurrentPallet] = useState<Pallet | null>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loggedItemIds, setLoggedItemIds] = useState<Set<string>>(new Set());

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'scan' | 'logs'>('scan');

  const getDisplayValue = (value: any): string => {
    if (typeof value === 'object' && value !== null && value.text) {
      return value.text;
    }
    return String(value || '');
  };

  // --- Data Fetching for Items ---
  useEffect(() => {
    async function fetchItems() {
      if (!operationId) return;
      setLoading(true);
      setError('');
      try {
        const itemsRes = await fetch(`/api/airtable/items?operationId=${operationId}`);
        if (!itemsRes.ok) throw new Error('Failed to fetch items for operation.');
        const itemsData = await itemsRes.json();
        setItems(itemsData.items);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [operationId]);
  
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
  }, [barcodeBuffer, lastKeyTime, items]);

  // --- Event Handlers ---
  const handleBarcodeScanned = (barcode: string) => {
    // Check if it's an item first
    const foundItem = items.find(item => item.fields['Barcode'].text === barcode);
    if (foundItem) {
      if (!loggedItemIds.has(foundItem.id)) {
        setSelectedItemIds(prev => {
          const newSet = new Set(prev);
          newSet.has(foundItem.id) ? newSet.delete(foundItem.id) : newSet.add(foundItem.id);
          return newSet;
        });
      }
      return;
    }
    // If not an item, assume it's a pallet and replace the current one
    console.log(`Pallet with barcode ${barcode} scanned.`);
    setCurrentPallet({ id: barcode });
  };
  
  const handleAddPalletClick = () => {
    const palletBarcode = prompt("Scanner not detected. Please enter pallet barcode manually:");
    if (palletBarcode) {
        handleBarcodeScanned(palletBarcode);
    }
  };

  const handleAddLog = () => {
    if (selectedItemIds.size === 0 || !currentPallet) {
      alert('Please select at least one item and scan a pallet.');
      return;
    }

    const selectedItems = items.filter(item => selectedItemIds.has(item.id));

    const newLog: LogEntry = {
      logId: `log-${Date.now()}`,
      pallet: currentPallet,
      items: selectedItems,
    };
    setLogs(prev => [newLog, ...prev]);

    setLoggedItemIds(prev => new Set([...prev, ...selectedItemIds]));
    setSelectedItemIds(new Set());
  };

  const handleSubmitToAirtable = async () => {
    if (logs.length === 0) {
      alert('No logs to submit.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/airtable/submit?operationId=${operationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit to Airtable.');
      }
      
      alert('Successfully submitted to Airtable!');
      setLogs([]); 
      
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // --- Render Logic ---
  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <>
      {/* --- Desktop Layout (Visible on medium screens and up) --- */}
      <div className="hidden md:flex flex-col h-screen bg-gray-100 text-black">
        <header className="bg-white shadow-md p-4 text-center">
          <h1 className="text-2xl font-bold">Operation: {operationId}</h1>
        </header>
        <main className="flex-grow flex p-4 gap-4 overflow-hidden">
          <div className="w-1/4 bg-white rounded-lg shadow p-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">Scanned Pallet</h2>
            <div className="flex-grow">
              {currentPallet ? (
                <div className="p-4 rounded border bg-blue-100 border-blue-400 text-center">
                  <span className="font-bold text-lg font-mono">{currentPallet.id}</span>
                </div>
              ) : (
                <div className="text-center text-gray-500 pt-10">Scan a pallet to begin.</div>
              )}
            </div>
            <button onClick={handleAddPalletClick} className="w-full bg-indigo-600 text-white rounded py-2 font-semibold">
              Add Pallet Manually
            </button>
          </div>
          <div className="flex-grow bg-white rounded-lg shadow p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">Items for Operation</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {items.map(item => {
                const isSelected = selectedItemIds.has(item.id);
                const isLogged = loggedItemIds.has(item.id);
                const barcodeValue = getDisplayValue(item.fields['Barcode']);
                return (
                  <div key={item.id} className={`p-3 rounded border text-center font-mono text-sm break-all transition-colors ${isLogged ? 'bg-gray-200 text-gray-500' : isSelected ? 'bg-green-500 text-white' : 'hover:bg-gray-50 cursor-pointer'}`} onClick={() => !isLogged && handleBarcodeScanned(barcodeValue)}>
                    {barcodeValue}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
        <footer className="bg-white shadow-up p-4 h-1/3 flex flex-col gap-4">
          <div className="flex-grow flex gap-4 overflow-hidden">
            <div className="w-1/3 border rounded-lg p-4 flex flex-col">
              <h3 className="font-semibold text-lg mb-2">Current Session</h3>
              <div className="mb-2"><strong>Scanned Pallet: </strong><span className="font-mono">{currentPallet?.id || 'None'}</span></div>
              <div className="mb-4 flex-grow">
                <strong>Selected Items ({selectedItemIds.size}):</strong>
                <ul className="text-sm list-disc list-inside font-mono">{items.filter(i => selectedItemIds.has(i.id)).map(i => <li key={i.id}>{getDisplayValue(i.fields['Barcode'])}</li>)}</ul>
              </div>
              <button onClick={handleAddLog} disabled={selectedItemIds.size === 0 || !currentPallet} className="w-full bg-blue-600 text-white rounded py-2 font-semibold disabled:bg-gray-400">Add to Log</button>
            </div>
            <div className="flex-grow border rounded-lg p-4 overflow-y-auto">
              <h3 className="font-semibold text-lg mb-2">Session Logs ({logs.length})</h3>
              <ul className="space-y-3">{logs.map(log => (<li key={log.logId} className="text-sm bg-gray-50 p-2 rounded"><strong>Pallet: {log.pallet.id}</strong><ul className="list-disc list-inside pl-4 font-mono">{log.items.map(item => <li key={item.id}>{getDisplayValue(item.fields['Barcode'])}</li>)}</ul></li>))}</ul>
            </div>
          </div>
          <button onClick={handleSubmitToAirtable} disabled={logs.length === 0 || isSubmitting} className="w-full bg-green-600 text-white rounded py-2 font-semibold disabled:bg-gray-400">{isSubmitting ? 'Submitting...' : `Submit All Logs`}</button>
        </footer>
      </div>

      {/* --- Mobile Layout (Visible on small screens) --- */}
      <div className="md:hidden flex flex-col h-screen bg-gray-100 text-black">
        <header className="bg-white shadow p-4 text-center">
          <h1 className="text-xl font-bold">Op: {operationId}</h1>
        </header>

        {/* --- Main Content Area (Switches based on active tab) --- */}
        <main className="flex-grow p-4 overflow-y-auto">
          {activeTab === 'scan' && (
            <div>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg font-semibold mb-2">1. Scan Pallet</h2>
                {currentPallet ? (
                  <div className="p-3 rounded bg-blue-100 text-center font-mono font-bold">{currentPallet.id}</div>
                ) : (
                  <button onClick={handleAddPalletClick} className="w-full bg-indigo-600 text-white rounded py-2">Tap to Add Pallet</button>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-2">2. Scan Items</h2>
                <div className="grid grid-cols-3 gap-2">
                  {items.map(item => {
                    const isSelected = selectedItemIds.has(item.id);
                    const isLogged = loggedItemIds.has(item.id);
                    const barcodeValue = getDisplayValue(item.fields['Barcode']);
                    return (<div key={item.id} className={`p-2 rounded border text-center font-mono text-xs break-all transition-colors ${isLogged ? 'bg-gray-200 text-gray-500' : isSelected ? 'bg-green-500 text-white' : 'hover:bg-gray-50'}`} onClick={() => !isLogged && handleBarcodeScanned(barcodeValue)}>{barcodeValue}</div>);
                  })}
                </div>
              </div>
              <button onClick={handleAddLog} disabled={selectedItemIds.size === 0 || !currentPallet} className="w-full bg-blue-600 text-white rounded py-3 font-semibold disabled:bg-gray-400 mt-4">Add {selectedItemIds.size} Items to Log</button>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Review Logs ({logs.length})</h2>
              <ul className="space-y-3">{logs.map(log => (<li key={log.logId} className="text-sm bg-gray-50 p-2 rounded"><strong>Pallet: {log.pallet.id}</strong><ul className="list-disc list-inside pl-4 font-mono">{log.items.map(item => <li key={item.id}>{getDisplayValue(item.fields['Barcode'])}</li>)}</ul></li>))}</ul>
              <button onClick={handleSubmitToAirtable} disabled={logs.length === 0 || isSubmitting} className="w-full bg-green-600 text-white rounded py-3 font-semibold disabled:bg-gray-400 mt-4">{isSubmitting ? 'Submitting...' : `Submit All Logs`}</button>
            </div>
          )}
        </main>
        
        {/* --- Mobile Tab Bar --- */}
        <footer className="bg-white shadow-up grid grid-cols-2 gap-px">
          <button onClick={() => setActiveTab('scan')} className={`py-4 text-sm font-medium transition-colors ${activeTab === 'scan' ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
            SCAN
            {selectedItemIds.size > 0 && <span className="ml-2 inline-block bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">{selectedItemIds.size}</span>}
          </button>
          <button onClick={() => setActiveTab('logs')} className={`py-4 text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
            LOGS
            {logs.length > 0 && <span className="ml-2 inline-block bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">{logs.length}</span>}
          </button>
        </footer>
      </div>
    </>
  );
}