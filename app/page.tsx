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
  
  // Derive last updated date dynamically from the data
  const reportDate = data?.Gold?.report_date || data?.Silver?.report_date;
  let lastUpdatedText = 'Unknown';
  if (reportDate) {
    try {
      // Handle MM/DD/YYYY format
      const parts = reportDate.split('/');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        lastUpdatedText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        const d = new Date(reportDate);
        if (!isNaN(d.getTime())) {
          lastUpdatedText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
    } catch {
      lastUpdatedText = reportDate;
    }
  }
  
  if (isDatabaseAvailable()) {
    try {
      const dbData = await getWarehouseDataWithChanges();
      // Check if we got valid data from the database
      if (dbData && Object.keys(dbData).length > 0) {
        dashboardData = dbData as unknown as WarehouseStocksData;
        // Update lastUpdatedText from DB data if available
        const firstMetal = Object.values(dbData)[0];
        if (firstMetal?.report_date) {
          try {
            const d = new Date(firstMetal.report_date);
            if (!isNaN(d.getTime())) {
              lastUpdatedText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
          } catch { /* keep existing */ }
        }
      } else {
        // Fallback to static JSON
        dashboardData = data as WarehouseStocksData;
      }
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
