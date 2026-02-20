import Dashboard from '@/components/Dashboard';
import { WarehouseStocksData } from '@/lib/data';
import { getWarehouseDataWithChanges, getLatestSnapshots, isDatabaseAvailable } from '@/lib/db';
import data from '../public/data.json';
import bulletinJson from '../public/bulletin.json';
import deliveryJson from '../public/delivery.json';
import volumeSummaryJson from '../public/volume_summary.json';
import deliveryMtdJson from '../public/delivery_mtd.json';
import deliveryYtdJson from '../public/delivery_ytd.json';

// ISR: re-generate at most every 5 minutes (COMEX data only changes once/day)
export const revalidate = 300;

export default async function Home() {
  // Try to fetch from database first (includes percent changes)
  let dashboardData: WarehouseStocksData;
  
  // Derive last updated date from when data was actually processed/published
  // Priority: bulletin last_updated > delivery last_updated > bulletin parsed_date > warehouse report_date
  let lastUpdatedText = 'Unknown';
  const bulletinLastUpdated = bulletinJson?.last_updated;
  const bulletinParsedDate = bulletinJson?.parsed_date;
  const deliveryParsedDate = deliveryJson?.parsed_date;
  const reportDate = data?.Gold?.report_date || data?.Silver?.report_date;

  const timestampStr = bulletinLastUpdated || (deliveryJson as Record<string, unknown>)?.last_updated as string | undefined;
  if (timestampStr) {
    try {
      const d = new Date(timestampStr);
      if (!isNaN(d.getTime())) {
        lastUpdatedText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch { /* fall through */ }
  }

  if (lastUpdatedText === 'Unknown') {
    const reportDateStr = bulletinParsedDate || deliveryParsedDate;
    if (reportDateStr) {
      try {
        const d = new Date(reportDateStr + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          lastUpdatedText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
      } catch { /* fall through */ }
    }
  }

  if (lastUpdatedText === 'Unknown' && reportDate) {
    try {
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
        // Keep lastUpdatedText from bulletin/delivery sync date (already set above)
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
  
  // Load MTD and YTD delivery data (cast to bypass strict JSON type inference)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deliveryMtdData = (deliveryMtdJson as any) || null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deliveryYtdData = (deliveryYtdJson as any) || null;
  
  return (
    <>
      {/* SEO: Semantic header content for search engines */}
      <header className="sr-only">
        <h1>Precious Metal Stats — COMEX Gold, Silver & Platinum Inventory Dashboard</h1>
        <p>
          Free daily precious metal statistics from CME Group. Track COMEX warehouse inventory
          for gold, silver, copper, platinum, palladium, and aluminum. View registered and eligible
          stock levels, coverage ratios, paper vs physical ratios, delivery notices, and market
          risk scores. All data updated nightly from official CME Group sources.
        </p>
      </header>

      <Dashboard data={dashboardData} bulletinData={bulletinData} deliveryData={deliveryData} volumeSummaryData={volumeSummaryData} deliveryMtdData={deliveryMtdData} deliveryYtdData={deliveryYtdData} lastUpdatedText={lastUpdatedText} />

    </>
  );
}
