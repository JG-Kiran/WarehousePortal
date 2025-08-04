import { getOutgoingOperations } from '@/app/lib/airtableClient';
import DashboardClient from '../DashboardClient';

export default async function OutgoingDashboardPage() {
  const operations = await getOutgoingOperations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 text-black">
      <h1 className="text-2xl font-bold mb-4 text-center">Incoming Dashboard</h1>
      <p className="text-center mb-6">Find an incoming operation by typing its ID.</p>
      <DashboardClient initialOperations={operations} />
    </main>
  );
}