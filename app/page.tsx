'use client'

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  // useEffect(() => {
  //   router.push('/dashboard');
  // }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Warehouse Logger</h1>
        <p className="text-lg text-gray-600 mb-8">Please select the type of move you are performing.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/dashboard/incoming" prefetch={true} className="block p-8 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-all text-center">
          <h2 className="text-2xl font-bold">Scan Incoming Items</h2>
          <p>For items moving into the warehouse.</p>
        </Link>
        <Link href="/dashboard/outgoing" className="block p-8 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-all text-center">
          <h2 className="text-2xl font-bold">Scan Outgoing Items</h2>
          <p>For items moving out for delivery.</p>
        </Link>
      </div>
    </main>
  );
}
