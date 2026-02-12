import Dashboard from '@/components/Dashboard';
import { WarehouseStocksData } from '@/lib/data';
import { getWarehouseDataWithChanges, getLatestSnapshots, isDatabaseAvailable } from '@/lib/db';
import data from '../public/data.json';
import bulletinJson from '../public/bulletin.json';
import deliveryJson from '../public/delivery.json';
import volumeSummaryJson from '../public/volume_summary.json';
import deliveryMtdJson from '../public/delivery_mtd.json';
import deliveryYtdJson from '../public/delivery_ytd.json';

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Try to fetch from database first (includes percent changes)
  let dashboardData: WarehouseStocksData;
  
  // Derive last updated date from the most recent data source
  // Priority: bulletin last_updated > delivery last_updated > warehouse report_date
  let lastUpdatedText = 'Unknown';
  const bulletinLastUpdated = bulletinJson?.last_updated;
  const deliveryLastUpdated = deliveryJson?.last_updated;
  const reportDate = data?.Gold?.report_date || data?.Silver?.report_date;
  
  // Try bulletin/delivery last_updated first (reflects when data was synced)
  const syncDate = bulletinLastUpdated || deliveryLastUpdated;
  if (syncDate) {
    try {
      const d = new Date(syncDate);
      if (!isNaN(d.getTime())) {
        lastUpdatedText = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch { /* fall through */ }
  }
  
  // Fallback to warehouse report_date
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

      {/* SEO: Crawlable content section below the dashboard */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-8 text-sm text-slate-600 dark:text-slate-400">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
            About Heavy Metal Stats — Free Precious Metals Data
          </h2>
          <p className="mb-3">
            Heavy Metal Stats provides free, daily-updated precious metal statistics sourced directly
            from <a href="https://www.cmegroup.com" rel="noopener noreferrer" target="_blank" className="underline hover:text-slate-900 dark:hover:text-white">CME Group</a>.
            Our dashboard tracks COMEX warehouse inventory across six metals: <strong>gold</strong>,{' '}
            <strong>silver</strong>, <strong>copper</strong>, <strong>platinum</strong>,{' '}
            <strong>palladium</strong>, and <strong>aluminum</strong>.
          </p>
          <p className="mb-3">
            Each metal&apos;s data includes <strong>registered inventory</strong> (metal available for
            futures delivery), <strong>eligible inventory</strong> (metal in vaults but not yet
            warranted), <strong>coverage ratios</strong> (months of supply vs. demand),{' '}
            <strong>paper vs physical ratios</strong> (futures leverage over deliverable stock), and{' '}
            <strong>delivery notices</strong> (daily, month-to-date, and year-to-date physical
            delivery volumes).
          </p>
          <p>
            Whether you&apos;re researching precious metals supply and demand, monitoring COMEX warehouse
            drawdowns, tracking gold and silver inventory trends, or analyzing paper vs physical leverage
            in commodity markets, Heavy Metal Stats gives you the data you need — completely free.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
            What Data Is Tracked?
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 list-disc list-inside">
            <li><strong>Warehouse Stocks</strong> — Registered &amp; eligible inventory in troy ounces/pounds</li>
            <li><strong>Coverage Ratio</strong> — Months of supply based on average delivery demand</li>
            <li><strong>Paper vs Physical</strong> — Open interest leverage over deliverable supply</li>
            <li><strong>Delivery Notices</strong> — Daily issues, stops, MTD &amp; YTD deliveries</li>
            <li><strong>Risk Score</strong> — Composite 0-100 score blending supply/demand factors</li>
            <li><strong>Volume Summary</strong> — Year-over-year delivery comparisons by metal</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
            Learn More
          </h2>
          <p>
            New to COMEX data?{' '}
            <a href="/learn" className="underline hover:text-slate-900 dark:hover:text-white">
              Learn what coverage ratio and paper vs physical mean
            </a>{' '}
            or read about{' '}
            <a href="/learn/delivery" className="underline hover:text-slate-900 dark:hover:text-white">
              how COMEX delivery notices work
            </a>.
          </p>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-xs text-slate-400">
          <p>Data sourced from CME Group. Updated nightly at 9:30 PM EST. Informational only — not financial advice.</p>
          <nav className="mt-2 flex justify-center gap-4">
            <a href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</a>
            <a href="/learn/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</a>
            <a href="/api-info" className="hover:text-slate-600 dark:hover:text-slate-300">API</a>
            <a href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</a>
            <a href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</a>
          </nav>
        </footer>
      </section>
    </>
  );
}
