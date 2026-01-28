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
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-16 py-6">
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
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-16 py-12 sm:py-16">
        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
            Coverage Ratio
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400">
            How many months of delivery demand can current inventory cover?
          </p>
        </div>

        {/* Formula Card */}
        <div className="mb-12 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap text-base sm:text-lg">
            <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-900 dark:text-white">
              Coverage Ratio
            </span>
            <span className="text-slate-400 text-xl">=</span>
            <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl font-semibold text-emerald-700 dark:text-emerald-400">
              Registered Inventory
            </span>
            <span className="text-slate-400 text-xl">÷</span>
            <span className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl font-semibold text-amber-700 dark:text-amber-400">
              Monthly Demand
            </span>
          </div>
        </div>

        {/* Status Levels - Compact */}
        <div className="mb-12">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">Status Levels</h2>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">12x+</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-1">Adequate</p>
            </div>
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Info className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">5-12x</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase mt-1">Watch</p>
            </div>
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">&lt;5x</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase mt-1">Stress</p>
            </div>
          </div>
        </div>

        {/* What It Signals - Two Column */}
        <div className="mb-12">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">What It Signals</h2>
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            <div className="p-6 sm:p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-4">
                <TrendingDown className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Low Ratio</h3>
              </div>
              <ul className="space-y-2.5 text-base text-slate-600 dark:text-slate-300">
                <li>• Tighter supply vs demand</li>
                <li>• Inventory being drawn down</li>
                <li>• Potential delivery squeeze</li>
                <li>• Possible price pressure</li>
              </ul>
            </div>
            <div className="p-6 sm:p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-900/30">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">High Ratio</h3>
              </div>
              <ul className="space-y-2.5 text-base text-slate-600 dark:text-slate-300">
                <li>• Ample supply buffer</li>
                <li>• No delivery concerns</li>
                <li>• Absorbs large orders</li>
                <li>• More price stability</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Terms - Compact */}
        <div className="mb-12">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">Key Terms</h2>
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Registered</h3>
              <p className="text-base text-slate-500 dark:text-slate-400">Metal available for futures delivery</p>
            </div>
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Eligible</h3>
              <p className="text-base text-slate-500 dark:text-slate-400">In vaults but not yet deliverable — can be registered</p>
            </div>
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">Monthly Demand</h3>
              <p className="text-base text-slate-500 dark:text-slate-400">Physical metal delivered via COMEX contracts per month</p>
            </div>
          </div>
        </div>

        {/* Important Notes - Compact */}
        <div className="mb-12">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5">Keep in Mind</h2>
          <div className="p-6 sm:p-8 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <ul className="space-y-4 text-base text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>Eligible metal can be registered quickly — low ratio ≠ guaranteed shortage</span>
              </li>
              <li className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>Demand varies by month — major months (Mar, May, Jul, Sep, Dec) are higher</span>
              </li>
              <li className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>Most futures contracts are rolled, not delivered</span>
              </li>
              <li className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
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
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-16 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
