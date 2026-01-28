import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const metadata = {
  title: 'What is Coverage Ratio? | COMEX Metals',
  description: 'Learn how the coverage ratio measures supply and demand dynamics in COMEX precious metals markets.',
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
              <strong className="text-slate-900 dark:text-white">Eligible → Registered:</strong> Low registered doesn't guarantee shortage. Eligible can be registered quickly.
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
