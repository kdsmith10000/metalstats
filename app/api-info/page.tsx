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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-8 lg:px-24">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-16"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-24">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-8">
            API Endpoints
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12">
            Data sources used by the COMEX Metals Tracker
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            The following CME Group endpoints are used to source data for this tracker. All data is publicly available from CME Group&apos;s official delivery reports.
          </p>
        </div>

        <div className="space-y-16">
          {/* Data Endpoints Section */}
          <div className="p-8 lg:p-10 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-8 uppercase tracking-wider">
              Data Endpoints
            </h2>
            <div className="grid gap-6">
              {endpoints.map((endpoint, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between gap-6 p-6 bg-white/50 dark:bg-white/5 backdrop-blur-lg border border-white/40 dark:border-white/10 rounded-2xl"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{endpoint.name}</span>
                      <span className="px-3 py-1 text-xs font-bold bg-white/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full border border-white/40 dark:border-white/10">
                        {endpoint.format}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{endpoint.description}</p>
                  </div>
                  <a 
                    href={endpoint.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:opacity-80 transition-opacity shrink-0"
                  >
                    Open <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Update Schedule */}
          <div className="p-8 lg:p-10 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">
              Update Schedule
            </h2>
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                CME Group typically updates these reports around <strong className="text-slate-900 dark:text-white">9:30 PM ET</strong> on business days. Data may be delayed during holidays or market closures.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                This dashboard refreshes data at 15-minute intervals.
              </p>
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="p-8 lg:p-10 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">
              Rate Limiting
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Please be respectful of CME Group&apos;s servers. Avoid excessive automated requests. For high-frequency data needs, consider CME Group&apos;s official data subscription services.
            </p>
          </div>

          {/* Official Documentation */}
          <div className="p-8 lg:p-10 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">
              Official Documentation
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
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
        </div>

        {/* Footer nav for internal linking / crawlability */}
        <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <nav className="flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/precious-metals" className="hover:text-slate-600 dark:hover:text-slate-300">Precious Metal Stats</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</Link>
            <Link href="/learn/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
