import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, FileStack, Coins, Scale } from 'lucide-react';

export const metadata = {
  title: 'Coverage Ratio & Paper vs Physical | COMEX Metals',
  description: 'Learn how coverage ratio and paper vs physical ratio measure supply, demand, and leverage in COMEX precious metals markets.',
};

export default function LearnPage() {
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
          Coverage Ratio
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 text-center max-w-2xl">
          Measures how many months of delivery demand the current registered inventory can satisfy.
        </p>

        {/* Main Table */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* Formula Row */}
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 w-40">
                  Formula
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                    Coverage Ratio = <span className="text-emerald-600 dark:text-emerald-400">Registered Inventory</span> ÷ <span className="text-amber-600 dark:text-amber-400">Monthly Demand</span>
                  </span>
                </td>
              </tr>
              
              {/* What it measures */}
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                  Meaning
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Number of months the current registered inventory can cover based on recent delivery demand.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Status Levels Table */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Status Levels</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[140px]">Level</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[100px]">Ratio</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Adequate
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">12x+</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Comfortable supply buffer. Minimal concern about delivery constraints.</td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                    <Info className="w-5 h-5" />
                    Watch
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">5–12x</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Supply adequate but warrants monitoring, especially if demand is rising.</td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                    <AlertTriangle className="w-5 h-5" />
                    Stress
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">&lt;5x</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Potential supply tightness. Could signal competitive pressure for available metal.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* What It Signals Table */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">What It Signals</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[180px]">Scenario</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Implications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-red-500 font-semibold">
                    <TrendingDown className="w-5 h-5" />
                    Low Ratio
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Tighter supply vs demand • Inventory being drawn down • Potential delivery squeeze • Upward price pressure
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-500 font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    High Ratio
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Ample supply buffer • No delivery concerns • Market absorbs large orders • More price stability
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Key Terms Table */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Key Terms</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[180px]">Term</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Registered</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Metal warranted and available for delivery against COMEX futures contracts.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Eligible</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Metal in COMEX vaults meeting specs but not yet warranted. Can be registered if owner chooses.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Monthly Demand</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Volume of physical metal delivered through COMEX futures contracts in a given month.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Important Notes */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Important Notes</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Eligible → Registered:</strong> Low registered doesn&apos;t guarantee shortage. Eligible can be registered quickly.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Demand varies:</strong> Major months (Mar, May, Jul, Sep, Dec) see higher delivery volumes.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Most contracts roll:</strong> Only a fraction of open interest results in physical delivery.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Not investment advice:</strong> Coverage ratio is one metric among many. Do your own research.
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="w-full max-w-3xl my-16 border-t border-slate-300 dark:border-slate-700" />

        {/* Paper vs Physical Section */}
        <div className="flex items-center gap-3 mb-3">
          <Scale className="w-8 h-8 text-blue-500" />
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white text-center">
            Paper vs Physical
          </h1>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 text-center max-w-2xl">
          Measures how many paper claims (futures contracts) exist for each unit of physical metal available for delivery.
        </p>

        {/* Paper vs Physical Formula Table */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* Formula Row */}
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 w-40">
                  Formula
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                    Paper/Physical = <span className="text-blue-600 dark:text-blue-400">Open Interest × Contract Size</span> ÷ <span className="text-amber-600 dark:text-amber-400">Registered Inventory</span>
                  </span>
                </td>
              </tr>
              
              {/* What it measures */}
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                  Meaning
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  The ratio shows how many ounces/units of &quot;paper&quot; claims exist for every ounce/unit of actual physical metal available for delivery. A ratio of 7:1 means there are 7 paper claims for every 1 unit of deliverable metal.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Paper vs Physical Concepts */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Understanding the Two Markets</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[140px]">Market</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                    <FileStack className="w-5 h-5" />
                    Paper
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  <strong>Futures contracts and ETFs.</strong> These are financial instruments that derive value from metal prices but most never result in physical delivery. Traded by speculators, hedge funds, and algorithms. Highly liquid, leveraged, and fast-moving.
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                    <Coins className="w-5 h-5" />
                    Physical
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  <strong>Actual metal bars in COMEX vaults.</strong> Registered inventory is warranted and immediately available for delivery. This is real, tangible metal that can be physically claimed by contract holders.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Risk Levels Table */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Leverage Risk Levels</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[140px]">Level</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[100px]">Ratio</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    Low
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">≤2:1</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Healthy physical backing. Most paper claims could theoretically be satisfied with available metal.</td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                    <Info className="w-5 h-5" />
                    Moderate
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">2–5:1</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Normal futures market leverage. Standard for well-functioning commodity markets.</td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold">
                    <AlertTriangle className="w-5 h-5" />
                    High
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">5–10:1</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Elevated leverage. Market vulnerable to delivery squeezes if many holders demand physical simultaneously.</td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                    <AlertTriangle className="w-5 h-5" />
                    Extreme
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">&gt;10:1</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Very high paper leverage. If holders demanded delivery simultaneously, COMEX could not fulfill all claims.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Why It Matters */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Why It Matters</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[180px]">Scenario</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Implications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-red-500 font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    High Ratio
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  More paper claims than physical metal • Higher &quot;squeeze&quot; potential • Price more volatile • Paper market dominates price discovery
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-emerald-500 font-semibold">
                    <TrendingDown className="w-5 h-5" />
                    Low Ratio
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Better physical backing • More delivery confidence • Price reflects physical reality • Less manipulation risk
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-blue-500 font-semibold">
                    <Scale className="w-5 h-5" />
                    Price Crash + High Ratio
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                  Paper market selling (leveraged longs liquidating) while physical demand remains strong. Often indicates weak hands being shaken out before recovery.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Key Terms for Paper/Physical */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Key Terms</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-[180px]">Term</th>
                <th className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Open Interest</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Total number of outstanding futures contracts that have not been settled. Each contract represents a claim on physical metal (e.g., 100 oz for gold, 5,000 oz for silver).</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Contract Size</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Amount of metal each futures contract controls. Gold (GC) = 100 oz, Silver (SI) = 5,000 oz, Copper (HG) = 25,000 lbs.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Delivery Squeeze</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">When many contract holders demand physical delivery simultaneously, potentially overwhelming available supply and causing rapid price increases.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">Cash Settlement</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">Most futures contracts are closed out with cash rather than physical delivery. This is why paper claims can exceed physical supply without immediate crisis.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Example Calculation */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Example: Silver</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold mb-2">
                  <FileStack className="w-4 h-4" />
                  Paper Claims
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Open Interest: <strong>156,467 contracts</strong><br />
                  Contract Size: <strong>5,000 oz</strong><br />
                  Total Paper: <strong>782,335,000 oz</strong>
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold mb-2">
                  <Coins className="w-4 h-4" />
                  Physical Metal
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Registered Inventory: <strong>108,157,437 oz</strong><br />
                  Available for delivery
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Paper/Physical Ratio</p>
              <p className="text-3xl font-black text-orange-500">7.23 : 1</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                For every 1 oz of deliverable silver, there are 7.23 oz of paper claims
              </p>
            </div>
          </div>
        </div>

        {/* Important Caveats */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 w-full max-w-3xl">Important Caveats</h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-10 w-full max-w-3xl">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Most never deliver:</strong> The vast majority of futures contracts are rolled or cash-settled before expiration. High ratios don&apos;t guarantee a squeeze.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Eligible backup:</strong> Eligible inventory can be converted to Registered relatively quickly if needed.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Normal for commodities:</strong> Leverage ratios above 1:1 are standard for all commodity futures markets. This is how they function.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Price discovery:</strong> Short-term prices are set by the paper market. Physical tightness affects prices over longer timeframes.
            </li>
            <li className="px-5 py-3 text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">Not investment advice:</strong> This is one metric among many. High ratios can persist for years without a squeeze occurring.
            </li>
          </ul>
        </div>

        {/* CTA */}
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-3 px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-base whitespace-nowrap min-w-[280px]"
        >
          <ArrowLeft className="w-5 h-5" />
          View Coverage Ratios
        </Link>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
