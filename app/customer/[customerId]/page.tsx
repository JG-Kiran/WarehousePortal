'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import type { ObjectItem } from '../../lib/airtableClient';

export default function CustomerObjectsPage() {
  const { customerId } = useParams() as { customerId: string };
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

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

  // Barcode scanner listener (works on both desktop and mobile)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If Enter key is pressed, process the barcode
      if (event.key === 'Enter') {
        if (barcodeBuffer.trim()) {
          handleBarcodeScanned(barcodeBuffer.trim());
          setBarcodeBuffer('');
        }
        // For mobile: clear the hidden input after processing
        if (scannerInputRef.current) {
          scannerInputRef.current.value = '';
        }
        return;
      }
      
      // If too much time has passed, reset buffer (human typing)
      if (currentTime - lastKeyTime > 100) {
        setBarcodeBuffer('');
      }
      
      // Add character to buffer
      setBarcodeBuffer(prev => prev + event.key);
      setLastKeyTime(currentTime);
    };

    // Desktop: Listen to window events
    window.addEventListener('keypress', handleKeyPress);

    // Mobile: Listen to input events and manage focus
    const scannerInput = scannerInputRef.current;
    if (scannerInput) {
      // Ensure input stays focused for scanner
      scannerInput.focus();
      
      const handleInputKeyPress = (event: KeyboardEvent) => handleKeyPress(event);
      const handleFocusLoss = () => {
        // Re-focus if focus is lost (helps with mobile scanner input)
        setTimeout(() => {
          if (scannerInput && document.activeElement !== scannerInput) {
            scannerInput.focus();
          }
        }, 100);
      };

      scannerInput.addEventListener('keypress', handleInputKeyPress);
      scannerInput.addEventListener('blur', handleFocusLoss);
      
      return () => {
        window.removeEventListener('keypress', handleKeyPress);
        scannerInput.removeEventListener('keypress', handleInputKeyPress);
        scannerInput.removeEventListener('blur', handleFocusLoss);
      };
    }

    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [barcodeBuffer, lastKeyTime]);

  const handleBarcodeScanned = (rawBarcode: string) => {
    setScanMessage('Checking item...');
    
    // Extract actual barcode from format "NN<actual_code>- <4_digits>"
    // Remove "NN" prefix and "- XXXX" suffix
    let barcode = rawBarcode;
    if (rawBarcode.startsWith('NN')) {
      barcode = rawBarcode.substring(2); // Remove "NN" prefix
    }
    if (barcode.includes('- ')) {
      barcode = barcode.split('- ')[0]; // Take everything before "- "
    }
    
    console.log('Raw barcode:', rawBarcode);
    console.log('Processed barcode:', barcode);
    
    // Find the item by barcode in current objects - only search barcode field
    console.log('Looking for barcode:', barcode);
    console.log('Available items:', objects.map(obj => ({
      id: obj.id,
      fields: Object.keys(obj.fields),
      barcodeField: obj.fields.Barcode || obj.fields.barcode || obj.fields['Barcode Number'] || obj.fields.Code || obj.fields['QR Code']
    })));
    
    const item = objects.find(obj => {
      // Try common barcode field names
      const possibleBarcodeFields = [
        obj.fields.Barcode,
        obj.fields.barcode, 
        obj.fields['Barcode Number'],
        obj.fields.Code,
        obj.fields['QR Code'],
        obj.fields['Item Code']
      ];
      
      for (const barcodeField of possibleBarcodeFields) {
        if (!barcodeField) continue;
        
                 let extractedBarcode: string = '';
         
         // Handle different value types
         if (typeof barcodeField === 'object' && barcodeField !== null) {
           if (Array.isArray(barcodeField)) {
             const firstItem = barcodeField[0];
             if (typeof firstItem === 'object' && firstItem !== null) {
               extractedBarcode = (firstItem as any).text || (firstItem as any).name || (firstItem as any).id || '';
             } else {
               extractedBarcode = String(firstItem || '');
             }
           } else {
             extractedBarcode = (barcodeField as any).text || (barcodeField as any).name || (barcodeField as any).id || (barcodeField as any).url || '';
           }
         } else {
           extractedBarcode = String(barcodeField || '');
         }
        
        console.log('Comparing:', extractedBarcode, 'with', barcode);
        
        if (extractedBarcode === barcode) {
          console.log('✅ Match found!');
          return true;
        }
      }
      
      return false;
    });
    
    if (!item) {
      setScanMessage('❌ Error: Item not found in current customer');
      setTimeout(() => setScanMessage(''), 3000);
      return;
    }
    
    // Check if status is "On the Way"
    const currentStatus = item.fields.Status;
    if (currentStatus !== 'On the way') {
      setScanMessage(`❌ Error: Item status is "${currentStatus}", not "On the way"`);
      setTimeout(() => setScanMessage(''), 3000);
      return;
    }
    
    // Check if already scanned
    if (scannedItems.has(item.id)) {
      setScanMessage('⚠️ Item already scanned');
      setTimeout(() => setScanMessage(''), 3000);
      return;
    }
    
    // Mark as scanned
    setScannedItems(prev => new Set([...prev, item.id]));
    setScanMessage('✅ Item marked for update!');
    
    // Clear message after 2 seconds
    setTimeout(() => setScanMessage(''), 2000);
  };

  const handleUpdateAirtable = async () => {
    if (scannedItems.size === 0) return;
    
    setUpdating(true);
    setScanMessage('Updating Airtable...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const itemId of scannedItems) {
      const item = objects.find(obj => obj.id === itemId);
      if (!item) continue;
      
             // Find barcode value for this item using same logic as scanning
      const possibleBarcodeFields = [
        item.fields.Barcode,
        item.fields.barcode, 
        item.fields['Barcode Number'],
        item.fields.Code,
        item.fields['QR Code'],
        item.fields['Item Code']
      ];
      
      let barcodeValue: string = '';
      
      for (const barcodeField of possibleBarcodeFields) {
        if (!barcodeField) continue;
        
        // Handle different value types (same as scanning logic)
        if (typeof barcodeField === 'object' && barcodeField !== null) {
          if (Array.isArray(barcodeField)) {
            const firstItem = barcodeField[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              barcodeValue = (firstItem as any).text || (firstItem as any).name || (firstItem as any).id || '';
            } else {
              barcodeValue = String(firstItem || '');
            }
          } else {
            barcodeValue = (barcodeField as any).text || (barcodeField as any).name || (barcodeField as any).id || (barcodeField as any).url || '';
          }
        } else {
          barcodeValue = String(barcodeField || '');
        }
        
        if (barcodeValue) break; // Found a barcode value, stop looking
      }
      
             console.log('Updating item with barcode:', barcodeValue);
       
       if (!barcodeValue) {
         console.error('No barcode value found for item:', item.id);
         errorCount++;
         continue;
       }
       
       try {
         const res = await fetch(`/api/airtable/items?customerId=${customerId}`, {
           method: 'PATCH',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ barcode: barcodeValue }),
         });
        
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }
    
    // Clear scanned items and refresh
    setScannedItems(new Set());
    setUpdating(false);
    
    if (errorCount === 0) {
      setScanMessage(`✅ Successfully updated ${successCount} items!`);
      // Refresh the items list
      try {
        const refreshRes = await fetch(`/api/airtable/items?customerId=${customerId}`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setObjects(refreshData.items);
        }
      } catch (err) {
        // Ignore refresh errors
      }
    } else {
      setScanMessage(`⚠️ Updated ${successCount}, failed ${errorCount} items`);
    }
    
    setTimeout(() => setScanMessage(''), 3000);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      {/* Hidden input for mobile barcode scanner support */}
      <input
        ref={scannerInputRef}
        type="text"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-4 text-center">Tracked Objects</h1>
        
        {/* Scanner Status */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-center">
          <div className="text-sm text-blue-700 font-medium">📱 Scanner Ready</div>
          <div className="text-xs text-blue-600">
            {scannedItems.size === 0 
              ? 'Scan any barcode to mark for update' 
              : `${scannedItems.size} item(s) marked for update`}
          </div>
        </div>

        {/* Update Airtable Button */}
        {scannedItems.size > 0 && (
          <button 
            onClick={handleUpdateAirtable}
            disabled={updating}
            className="w-full mb-4 bg-green-600 text-white rounded py-2 font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {updating ? 'Updating...' : `Update Airtable (${scannedItems.size} items)`}
          </button>
        )}
        
        {/* Scan Messages */}
        {scanMessage && (
          <div className="mb-4 p-3 bg-gray-100 border rounded text-center">
            <div className="text-sm">{scanMessage}</div>
          </div>
        )}
        
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
              <li key={obj.id} className={`bg-white rounded shadow p-4 flex flex-col gap-1 relative ${scannedItems.has(obj.id) ? 'border-2 border-green-300' : ''}`}>
                {/* Green tick for scanned items */}
                {scannedItems.has(obj.id) && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    ✓
                  </div>
                )}
                <div className="font-semibold">ID: {obj.id}</div>
                {Object.entries(obj.fields).map(([key, value]) => {
                  // Handle different value types for better display
                  let displayValue = '';
                  if (value === null || value === undefined) {
                    displayValue = '';
                  } else if (typeof value === 'object') {
                    // For objects, try to extract meaningful data
                    if (Array.isArray(value)) {
                      displayValue = value.map(item => 
                        typeof item === 'object' ? (item.text || item.filename || item.name || item.id || JSON.stringify(item)) : String(item)
                      ).join(', ');
                    } else {
                      displayValue = value.text || value.filename || value.name || value.id || value.url || JSON.stringify(value);
                    }
                  } else {
                    displayValue = String(value);
                  }
                  
                  return (
                    <div key={key} className="text-sm text-gray-700">
                      <span className="font-medium">{key}:</span> {displayValue}
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
} 