import Dashboard from '@/components/Dashboard';
import { WarehouseStocksData } from '@/lib/data';
import { getWarehouseDataWithChanges } from '@/lib/db';
import data from '../public/data.json';

export default async function Home() {
  // Try to fetch from database first (includes percent changes)
  let dashboardData: WarehouseStocksData;
  
  try {
    const dbData = await getWarehouseDataWithChanges();
    // Check if we got valid data from the database
    if (dbData && Object.keys(dbData).length > 0) {
      dashboardData = dbData as unknown as WarehouseStocksData;
    } else {
      // Fallback to static JSON
      dashboardData = data as WarehouseStocksData;
    }
  } catch (error) {
    // If database fails, use static JSON
    console.error('Failed to fetch from database:', error);
    dashboardData = data as WarehouseStocksData;
  }
  
  return <Dashboard data={dashboardData} />;
}
