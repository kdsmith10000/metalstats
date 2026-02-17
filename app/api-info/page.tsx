import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'CME Group Data Sources & API Endpoints for Precious Metals Inventory',
  description: 'Explore the CME Group API endpoints and data sources behind Heavy Metal Stats. Access gold, silver, copper, platinum, palladium and aluminum COMEX warehouse stock data updated daily.',
  keywords: [
    'cme group api',
    'comex data api',
    'precious metals api',
    'gold inventory data source',
    'silver inventory data source',
    'comex warehouse data download',
    'cme delivery reports',
    'precious metals data sources',
  ],
  alternates: {
    canonical: 'https://heavymetalstats.com/api-info',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'CME Group Data Sources & API Endpoints | Heavy Metal Stats',
    description: 'Explore the CME Group API endpoints and data sources powering the precious metals inventory tracker. Gold, silver, copper, platinum data updated daily.',
    url: 'https://heavymetalstats.com/api-info',
  },
};

const endpoints = [
  {
    name: 'Gold Vault Inventory',
    url: 'https://www.cmegroup.com/delivery_reports/Gold_Stocks.xls',
    format: 'XLS',
    description: 'Daily gold warehouse stock levels by depository',
  },
  {
    name: 'Silver Vault Inventory',
    url: 'https://www.cmegroup.com/delivery_reports/Silver_Stocks.xls',
    format: 'XLS',
    description: 'Daily silver warehouse stock levels by depository',
  },
  {
    name: 'Copper Vault Inventory',
    url: 'https://www.cmegroup.com/delivery_reports/Copper_Stocks.xls',
    format: 'XLS',
    description: 'Daily copper warehouse stock levels by depository',
  },
  {
    name: 'YTD Delivery Notices',
    url: 'https://www.cmegroup.com/delivery_reports/MetalsIssuesAndStopsYTDReport.pdf',
    format: 'PDF',
    description: 'Year-to-date delivery issues and stops report',
  },
  {
    name: 'Daily Delivery Notices',
    url: 'https://www.cmegroup.com/clearing/operations-and-deliveries/nymex-delivery-notices.html',
    format: 'HTML',
    description: 'Daily NYMEX delivery notice reports',
  },
];

export default function ApiEndpoints() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/30">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-12 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3 text-center">
          API Endpoints
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 text-center max-w-2xl">
          Data sources used by the COMEX Metals Tracker. All data is publicly available from CME Group&apos;s official delivery reports.
        </p>

        {/* Data Endpoints Section */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl rounded-lg">
          <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Data Endpoints
            </h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {endpoints.map((endpoint, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between gap-6 px-5 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">{endpoint.name}</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                      {endpoint.format}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{endpoint.description}</p>
                </div>
                <a 
                  href={endpoint.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity shrink-0"
                >
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Update Schedule */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Update Schedule
        </h2>
        <div className="space-y-4 mb-10 text-slate-600 dark:text-slate-300 w-full max-w-3xl">
          <p>
            CME Group typically updates these reports around <strong className="text-slate-900 dark:text-white">9:30 PM ET</strong> on business days. Data may be delayed during holidays or market closures.
          </p>
          <p className="text-sm text-slate-500">
            This dashboard refreshes data at 15-minute intervals.
          </p>
        </div>

        {/* Rate Limiting */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Rate Limiting
        </h2>
        <div className="space-y-4 mb-10 text-slate-600 dark:text-slate-300 w-full max-w-3xl">
          <p>
            Please be respectful of CME Group&apos;s servers. Avoid excessive automated requests. For high-frequency data needs, consider CME Group&apos;s official data subscription services.
          </p>
        </div>

        {/* Official Documentation */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Official Documentation
        </h2>
        <div className="space-y-4 mb-10 text-slate-600 dark:text-slate-300 w-full max-w-3xl">
          <p>
            For comprehensive information about CME Group&apos;s data offerings and official API access:
          </p>
          <a 
            href="https://www.cmegroup.com/market-data/reports.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:opacity-80 transition-opacity"
          >
            CME Group Market Data Reports <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-6 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
          <nav className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/precious-metals" className="hover:text-slate-600 dark:hover:text-slate-300">Precious Metal Stats</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</Link>
            <Link href="/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</Link>
            <Link href="/about" className="hover:text-slate-600 dark:hover:text-slate-300">About</Link>
            <Link href="/contact" className="hover:text-slate-600 dark:hover:text-slate-300">Contact</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
