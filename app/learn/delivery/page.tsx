import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Package, Truck, DollarSign, FileText, BarChart3, Scale } from 'lucide-react';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'COMEX Delivery Notices Explained — Issues, Stops & Physical Gold Silver Delivery',
  description: 'Learn how physical delivery works on COMEX: what issues and stops mean for gold, silver, copper & platinum futures, how settlement prices are set, and why delivery data signals precious metals supply stress.',
  keywords: [
    'comex delivery notices explained',
    'what are issues and stops',
    'comex settlement price',
    'futures physical delivery',
    'comex gold delivery',
    'comex silver delivery',
    'comex copper delivery',
    'comex platinum delivery',
    'first notice day',
    'last delivery day',
    'futures contract delivery process',
    'physical gold delivery',
    'physical silver delivery',
    'precious metals delivery',
    'comex delivery data',
    'gold delivery volume',
    'silver delivery volume',
    'precious metals physical demand',
    'comex mtd delivery',
    'comex ytd delivery',
  ],
  alternates: {
    canonical: 'https://heavymetalstats.com/learn/delivery',
  },
  openGraph: {
    title: 'COMEX Delivery Notices: How Physical Gold & Silver Delivery Works',
    description: 'Complete guide to COMEX delivery notices. Learn what issues and stops mean, how physical delivery works for gold, silver, and copper, and why delivery data matters for precious metals analysis.',
    url: 'https://heavymetalstats.com/learn/delivery',
    type: 'article',
  },
};

export default function DeliveryLearnPage() {
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
            Coverage & Paper/Physical
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-12 flex flex-col items-center">
        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <Truck className="w-8 h-8 text-emerald-500" />
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white text-center">
            Delivery Notices
          </h1>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 text-center max-w-2xl">
          How physical metal changes hands through COMEX futures contracts.
        </p>

        {/* Overview */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <div className="p-5 text-slate-600 dark:text-slate-300 space-y-3">
            <p>
              Most futures contracts are closed before expiry through offsetting trades. But when a holder wants to take or make physical delivery, the exchange facilitates the transfer through <strong className="text-slate-900 dark:text-white">delivery notices</strong>.
            </p>
            <p>
              Each delivery notice represents one contract&apos;s worth of physical metal moving from a seller to a buyer through a COMEX-approved warehouse.
            </p>
          </div>
        </div>

        {/* Core Terms Table */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Core Terms</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[160px]">Term</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    Issue
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  A <strong className="text-slate-900 dark:text-white">delivery initiated by the seller</strong> (short position holder). The seller issues a notice declaring they will deliver physical metal against their contract. The clearing house then assigns this notice to a buyer.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                    <Package className="w-5 h-5" />
                    Stop
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  A <strong className="text-slate-900 dark:text-white">delivery accepted by the buyer</strong> (long position holder). The buyer &quot;stops&quot; (accepts) the delivery notice and receives ownership of the physical metal in a COMEX warehouse. Every issue has a matching stop.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                    <DollarSign className="w-5 h-5" />
                    Settlement
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  The <strong className="text-slate-900 dark:text-white">official closing price</strong> of the futures contract for that trading session. This is the price at which all deliveries for that day are valued. It is set by the exchange based on trading activity during the close.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
                    <BarChart3 className="w-5 h-5" />
                    MTD
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">Month-to-date</strong> cumulative total of delivery notices issued since the first delivery day of the current contract month. Shows the pace of physical delivery demand.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* How Delivery Works */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">How the Delivery Process Works</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                <div className="text-3xl font-black text-amber-500 mb-2">1</div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">First Notice Day</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  The first day sellers can issue delivery notices for the current contract month. Long holders who don&apos;t want delivery must exit before this date.
                </p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                <div className="text-3xl font-black text-emerald-500 mb-2">2</div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">Matching</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  The clearing house matches each issue (seller) with a stop (buyer). The oldest long position is typically assigned first. Transfer of warehouse receipts follows.
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <div className="text-3xl font-black text-blue-500 mb-2">3</div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">Last Delivery Day</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  The final day physical delivery can occur for the contract month. After this, any remaining positions are cash-settled or rolled to the next month.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Sizes */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Contract Sizes</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[100px]">Symbol</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Metal</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Per Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-3 font-bold text-amber-500">GC</td>
                <td className="px-5 py-3 text-slate-900 dark:text-white font-semibold">Gold</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">100 troy ounces</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-slate-400">SI</td>
                <td className="px-5 py-3 text-slate-900 dark:text-white font-semibold">Silver</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">5,000 troy ounces</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-orange-500">HG</td>
                <td className="px-5 py-3 text-slate-900 dark:text-white font-semibold">Copper</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">25,000 pounds</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-violet-400">PL</td>
                <td className="px-5 py-3 text-slate-900 dark:text-white font-semibold">Platinum</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">50 troy ounces</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-violet-500">PA</td>
                <td className="px-5 py-3 text-slate-900 dark:text-white font-semibold">Palladium</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">100 troy ounces</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-bold text-slate-500">ALI</td>
                <td className="px-5 py-3 text-slate-900 dark:text-white font-semibold">Aluminum</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">44,000 pounds</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Why It Matters */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Why Delivery Data Matters</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[180px]">Signal</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">What It Means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-500 font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    High MTD
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Strong physical demand. Buyers want the actual metal, not just paper exposure. Draws down registered warehouse inventory.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-red-500 font-semibold">
                    <TrendingDown className="w-5 h-5" />
                    Low MTD
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Weak physical demand. Most holders are rolling or closing positions. Less pressure on warehouse stocks.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-amber-500 font-semibold">
                    <AlertTriangle className="w-5 h-5" />
                    MTD vs Inventory
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Compare MTD deliveries to registered inventory. If deliveries exceed 10-20% of registered stock in a month, it signals potential tightness and supply stress.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-blue-500 font-semibold">
                    <Scale className="w-5 h-5" />
                    Daily Spikes
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Unusually large daily delivery numbers can indicate a single entity accumulating physical metal or a coordinated delivery push.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Important Notes */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Important Notes</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Issues always equal stops:</strong> Every delivery has a seller and a buyer. The numbers match because the clearing house pairs them.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Delivery months vary:</strong> Not every calendar month is a major delivery month. Gold&apos;s primary months are Feb, Apr, Jun, Aug, Oct, Dec.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Settlement is not spot:</strong> The settlement price is the futures contract closing price, which can differ from the spot price due to carry costs and market structure.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Warehouse receipts:</strong> Physical delivery transfers ownership of warehouse receipts, not actual metal bars. The metal stays in the vault; the receipt changes hands.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Not investment advice:</strong> Delivery data is one input among many. High deliveries don&apos;t guarantee price increases.
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex gap-4">
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <Link 
            href="/learn"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Coverage & Paper/Physical
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
          <nav className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/precious-metals" className="hover:text-slate-600 dark:hover:text-slate-300">Precious Metal Stats</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Coverage &amp; Paper/Physical</Link>
            <Link href="/api-info" className="hover:text-slate-600 dark:hover:text-slate-300">API &amp; Data Sources</Link>
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
