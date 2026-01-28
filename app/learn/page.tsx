import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'What is Coverage Ratio? | COMEX Metals',
  description: 'Learn how the coverage ratio measures supply and demand dynamics in COMEX precious metals markets.',
};

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/30">
        <div className="w-full px-6 sm:px-12 lg:px-24 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-6 sm:px-12 lg:px-24 py-12 sm:py-20">
        {/* Title */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
            Coverage Ratio
          </h1>
          <p className="text-xl sm:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
            How many months of delivery demand can current inventory cover?
          </p>
        </div>

        {/* Formula Card */}
        <div className="mb-16 p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap text-lg sm:text-xl">
            <span className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white">
              Coverage Ratio
            </span>
            <span className="text-slate-400 text-2xl">=</span>
            <span className="px-5 py-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl font-semibold text-emerald-700 dark:text-emerald-400">
              Registered Inventory
            </span>
            <span className="text-slate-400 text-2xl">÷</span>
            <span className="px-5 py-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl font-semibold text-amber-700 dark:text-amber-400">
              Monthly Demand
            </span>
          </div>
        </div>

        {/* Status Levels - Compact */}
        <div className="mb-16">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Status Levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">12x+</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-2">Adequate</p>
            </div>
            <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Info className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">5-12x</p>
              <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 uppercase mt-2">Watch</p>
            </div>
            <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">&lt;5x</p>
              <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 uppercase mt-2">Stress</p>
            </div>
          </div>
        </div>

        {/* What It Signals - Two Column */}
        <div className="mb-16">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">What It Signals</h2>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="p-8 sm:p-10 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-200 dark:border-red-900/30 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <TrendingDown className="w-8 h-8 text-red-500" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Low Ratio</h3>
              </div>
              <ul className="space-y-3 text-lg text-slate-600 dark:text-slate-300">
                <li>Tighter supply vs demand</li>
                <li>Inventory being drawn down</li>
                <li>Potential delivery squeeze</li>
                <li>Possible price pressure</li>
              </ul>
            </div>
            <div className="p-8 sm:p-10 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-200 dark:border-emerald-900/30 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">High Ratio</h3>
              </div>
              <ul className="space-y-3 text-lg text-slate-600 dark:text-slate-300">
                <li>Ample supply buffer</li>
                <li>No delivery concerns</li>
                <li>Absorbs large orders</li>
                <li>More price stability</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Terms - Compact */}
        <div className="mb-16">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Key Terms</h2>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl mb-3">Registered</h3>
              <p className="text-lg text-slate-500 dark:text-slate-400">Metal available for futures delivery</p>
            </div>
            <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl mb-3">Eligible</h3>
              <p className="text-lg text-slate-500 dark:text-slate-400">In vaults but not yet deliverable — can be registered</p>
            </div>
            <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl mb-3">Monthly Demand</h3>
              <p className="text-lg text-slate-500 dark:text-slate-400">Physical metal delivered via COMEX contracts per month</p>
            </div>
          </div>
        </div>

        {/* Important Notes - Compact */}
        <div className="mb-16">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Keep in Mind</h2>
          <div className="p-8 sm:p-10 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl mx-auto">
            <ul className="space-y-5 text-lg text-slate-600 dark:text-slate-300 text-center">
              <li className="flex items-center justify-center gap-4">
                <HelpCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <span>Eligible metal can be registered quickly — low ratio ≠ guaranteed shortage</span>
              </li>
              <li className="flex items-center justify-center gap-4">
                <HelpCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <span>Demand varies by month — major months (Mar, May, Jul, Sep, Dec) are higher</span>
              </li>
              <li className="flex items-center justify-center gap-4">
                <HelpCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <span>Most futures contracts are rolled, not delivered</span>
              </li>
              <li className="flex items-center justify-center gap-4">
                <HelpCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <span>This is informational only — not investment advice</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            View Coverage Ratios
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-6 sm:px-12 lg:px-24 text-center">
          <p className="text-base text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
