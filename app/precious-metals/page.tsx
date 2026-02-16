import Link from 'next/link';
import { ArrowLeft, BarChart3, Coins, TrendingUp, TrendingDown, Shield, Database, Activity, Scale, Truck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Precious Metal Stats — Gold, Silver, Platinum & Copper Market Data',
  description: 'Comprehensive precious metal statistics: COMEX gold, silver, platinum, palladium & copper inventory data, supply/demand analysis, coverage ratios, paper vs physical ratios, and delivery trends. Free daily updates from CME Group.',
  keywords: [
    'precious metal stats',
    'precious metal statistics',
    'precious metals data',
    'gold stats',
    'silver stats',
    'platinum stats',
    'palladium stats',
    'copper stats',
    'precious metals market data',
    'gold market statistics',
    'silver market statistics',
    'precious metals supply demand',
    'gold supply demand',
    'silver supply demand',
    'precious metals inventory',
    'precious metals tracker',
    'precious metals dashboard',
    'gold silver platinum data',
    'metals market analysis',
    'commodity market statistics',
    'precious metals trends',
    'gold silver inventory levels',
    'free precious metals data',
    'precious metals chart',
    'precious metals today',
  ],
  alternates: {
    canonical: 'https://heavymetalstats.com/precious-metals',
  },
  openGraph: {
    title: 'Precious Metal Stats — Free Gold, Silver, Platinum & Copper Data',
    description: 'Comprehensive precious metal statistics updated daily from CME Group. Track gold, silver, platinum inventory levels, supply/demand ratios, delivery data, and market risk scores.',
    url: 'https://heavymetalstats.com/precious-metals',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Precious Metal Stats — Gold, Silver, Platinum Data',
    description: 'Free daily precious metals statistics: COMEX inventory, coverage ratios, paper vs physical, and delivery data from CME Group.',
  },
};

export default function PreciousMetalsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <Link
            href="/learn"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Learn Metrics
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-12 flex flex-col items-center">
        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-8 h-8 text-amber-500" />
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white text-center">
            Precious Metal Stats
          </h1>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 text-center max-w-2xl">
          Free daily statistics for gold, silver, platinum, palladium, copper &amp; aluminum — sourced from CME Group COMEX data.
        </p>

        {/* What We Track */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          What Precious Metals Data Do We Track?
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6 w-full max-w-3xl">
          Heavy Metal Stats aggregates official CME Group data to provide a comprehensive view of precious metals supply and demand. Our{' '}
          <Link href="/" className="underline hover:text-slate-900 dark:hover:text-white">live dashboard</Link>{' '}
          covers six COMEX-traded metals with the following statistics updated every trading day:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mb-10">
          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 text-amber-500 font-semibold mb-2">
              <Database className="w-5 h-5" />
              Warehouse Inventory
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Daily registered and eligible inventory levels for each metal in troy ounces (or pounds for copper/aluminum). Shows how much physical metal is in COMEX-approved vaults.
            </p>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-2">
              <Shield className="w-5 h-5" />
              Coverage Ratio
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Months of delivery demand that current registered inventory can cover. Low ratios signal supply tightness; high ratios indicate ample supply.{' '}
              <Link href="/learn" className="underline">Learn more</Link>.
            </p>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 text-blue-500 font-semibold mb-2">
              <Scale className="w-5 h-5" />
              Paper vs Physical Ratio
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              How many paper claims (futures contracts) exist per unit of deliverable metal. Higher ratios mean more leverage and greater squeeze risk.{' '}
              <Link href="/learn" className="underline">Learn more</Link>.
            </p>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 text-purple-500 font-semibold mb-2">
              <Activity className="w-5 h-5" />
              Risk Score
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              A composite 0-100 score blending coverage ratio, paper/physical leverage, inventory trend, delivery velocity, and market activity into a single risk indicator.{' '}
              <Link href="/learn#risk-score" className="underline">Learn more</Link>.
            </p>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 text-orange-500 font-semibold mb-2">
              <Truck className="w-5 h-5" />
              Delivery Notices
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Daily, month-to-date, and year-to-date physical delivery volumes. Tracks how much metal is actually changing hands via COMEX futures contracts.{' '}
              <Link href="/learn/delivery" className="underline">Learn more</Link>.
            </p>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 text-rose-500 font-semibold mb-2">
              <TrendingUp className="w-5 h-5" />
              Historical Trends
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Year-over-year delivery comparisons, inventory change percentages, and volume summaries to identify long-term supply and demand trends across all metals.
            </p>
          </div>
        </div>

        {/* Metals Covered */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Precious Metals Covered
        </h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[80px]">Symbol</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Metal</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Contract Size</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-3 font-bold text-amber-500">GC</td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Gold</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">100 troy oz</td>
                <td className="px-5 py-3 text-slate-500">Precious Metal</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-slate-400">SI</td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Silver</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">5,000 troy oz</td>
                <td className="px-5 py-3 text-slate-500">Precious Metal</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-violet-400">PL</td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Platinum</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">50 troy oz</td>
                <td className="px-5 py-3 text-slate-500">Precious Metal</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-violet-500">PA</td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Palladium</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">100 troy oz</td>
                <td className="px-5 py-3 text-slate-500">Precious Metal</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-orange-500">HG</td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Copper</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">25,000 lbs</td>
                <td className="px-5 py-3 text-slate-500">Base Metal</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-slate-500">ALI</td>
                <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">Aluminum</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">44,000 lbs</td>
                <td className="px-5 py-3 text-slate-500">Base Metal</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Why Precious Metals Stats Matter */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Why Track Precious Metal Statistics?
        </h2>
        <div className="space-y-4 w-full max-w-3xl mb-10 text-slate-600 dark:text-slate-300">
          <p>
            Precious metals like gold, silver, platinum, and palladium serve as stores of value,
            industrial inputs, and hedges against inflation and currency devaluation. Understanding
            the <strong className="text-slate-900 dark:text-white">supply side</strong> — how
            much physical metal is available in COMEX warehouses — provides critical context that
            price charts alone cannot show.
          </p>
          <p>
            When <strong className="text-slate-900 dark:text-white">registered inventory declines</strong>,
            it signals that physical metal is being withdrawn or delivered, reducing the available
            supply buffer. When <strong className="text-slate-900 dark:text-white">paper claims
            exceed physical supply</strong> by large multiples, the market becomes vulnerable to
            delivery squeezes if sentiment shifts toward physical accumulation.
          </p>
          <p>
            Heavy Metal Stats makes this data freely accessible so investors, analysts, and
            researchers can monitor COMEX supply conditions without expensive terminal subscriptions
            or manual data collection.
          </p>
        </div>

        {/* Supply & Demand Signals */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Key Supply &amp; Demand Signals
        </h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[180px]">Signal</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">What It Means for Precious Metals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-red-500 font-semibold">
                    <TrendingDown className="w-5 h-5" />
                    Declining Inventory
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Physical metal leaving COMEX vaults. Registered inventory dropping means less supply available for futures delivery. Can precede price increases if demand persists.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-amber-500 font-semibold">
                    <Scale className="w-5 h-5" />
                    High Paper/Physical
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Many more paper claims exist than deliverable metal. Market functions normally if most contracts roll, but a shift toward delivery could overwhelm available supply.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-orange-500 font-semibold">
                    <Shield className="w-5 h-5" />
                    Low Coverage Ratio
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Current inventory can only satisfy a few months of delivery demand. Signals potential supply stress and competitive pressure among delivery takers.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-500 font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    Rising Deliveries
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  More futures holders choosing physical delivery over cash settlement. Indicates strong physical demand and can draw down warehouse stocks rapidly.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Data Source & Methodology */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 w-full max-w-3xl">
          Data Source &amp; Methodology
        </h2>
        <div className="space-y-4 w-full max-w-3xl mb-10 text-slate-600 dark:text-slate-300">
          <p>
            All data on Heavy Metal Stats is sourced from official{' '}
            <a href="https://www.cmegroup.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900 dark:hover:text-white">
              CME Group
            </a>{' '}
            delivery reports published daily. Our automated pipeline fetches, parses, and stores
            the latest warehouse stock levels, delivery notices, and open interest data every
            trading day at 9:30 PM EST.
          </p>
          <p>
            Derived metrics like <strong className="text-slate-900 dark:text-white">coverage ratio</strong>,{' '}
            <strong className="text-slate-900 dark:text-white">paper vs physical ratio</strong>, and{' '}
            <strong className="text-slate-900 dark:text-white">risk score</strong> are calculated
            from this raw data using transparent, documented methodologies. See our{' '}
            <Link href="/learn" className="underline hover:text-slate-900 dark:hover:text-white">
              educational guides
            </Link>{' '}
            for detailed explanations of each metric, or visit the{' '}
            <Link href="/api-info" className="underline hover:text-slate-900 dark:hover:text-white">
              data sources page
            </Link>{' '}
            for the full list of CME Group endpoints.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-sm"
          >
            <BarChart3 className="w-5 h-5" />
            View Live Dashboard
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            <Coins className="w-5 h-5" />
            Learn About Metrics
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
          <nav className="mt-2 flex justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</Link>
            <Link href="/learn/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</Link>
            <Link href="/api-info" className="hover:text-slate-600 dark:hover:text-slate-300">API</Link>
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
