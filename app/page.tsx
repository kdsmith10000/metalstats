import Dashboard from '@/components/Dashboard';
import { WarehouseStocksData } from '@/lib/data';
import { getWarehouseDataWithChanges, getLatestSnapshots, isDatabaseAvailable } from '@/lib/db';
import data from '../public/data.json';
import bulletinJson from '../public/bulletin.json';
import deliveryJson from '../public/delivery.json';
import volumeSummaryJson from '../public/volume_summary.json';

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Try to fetch from database first (includes percent changes)
  let dashboardData: WarehouseStocksData;
  let lastUpdatedText = 'February 4, 2026'; // Default fallback
  
  if (isDatabaseAvailable()) {
    try {
      const dbData = await getWarehouseDataWithChanges();
      // Check if we got valid data from the database
      if (dbData && Object.keys(dbData).length > 0) {
        dashboardData = dbData as unknown as WarehouseStocksData;
      } else {
        // Fallback to static JSON
        dashboardData = data as WarehouseStocksData;
      }
      
      // Set the last updated date to when data was synced
      lastUpdatedText = 'February 4, 2026';
    } catch (error) {
      // If database fails, use static JSON
      console.error('Failed to fetch from database:', error);
      dashboardData = data as WarehouseStocksData;
    }
  } else {
    // No database configured, use static JSON
    dashboardData = data as WarehouseStocksData;
  }

  // Load bulletin data
  const bulletinData = bulletinJson || null;
  
  // Load delivery data
  const deliveryData = deliveryJson || null;
  
  // Load volume summary data (YoY comparisons)
  const volumeSummaryData = volumeSummaryJson || null;
  
  return <Dashboard data={dashboardData} bulletinData={bulletinData} deliveryData={deliveryData} volumeSummaryData={volumeSummaryData} lastUpdatedText={lastUpdatedText} />;
}
