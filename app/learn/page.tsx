import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const metadata = {
  title: 'What is Coverage Ratio? | COMEX Metals',
  description: 'Learn how the coverage ratio measures supply and demand dynamics in COMEX precious metals markets.',
};

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
            What is Coverage Ratio?
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400">
            Understanding supply and demand dynamics in COMEX precious metals markets
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Definition */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Definition
            </h2>
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                The <strong className="text-slate-900 dark:text-white">Coverage Ratio</strong> measures how many months of delivery demand the current registered inventory can satisfy. It's a key metric for understanding the balance between available supply and market demand for physical metal.
              </p>
              <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-center">
                <span className="text-slate-500 dark:text-slate-400">Coverage Ratio = </span>
                <span className="text-slate-900 dark:text-white font-bold">Registered Inventory</span>
                <span className="text-slate-500 dark:text-slate-400"> ÷ </span>
                <span className="text-slate-900 dark:text-white font-bold">Monthly Delivery Demand</span>
              </div>
            </div>
          </section>

          {/* Status Levels */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
              What the Numbers Mean
            </h2>
            <div className="grid gap-4">
              {/* Adequate */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">12x or Higher</h3>
                      <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                        Adequate
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Inventory can cover 12+ months of deliveries. This represents a comfortable supply buffer with minimal concern about delivery constraints.
                    </p>
                  </div>
                </div>
              </div>

              {/* Watch */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Info className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">5x to 12x</h3>
                      <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg">
                        Watch
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Inventory covers 5-12 months of deliveries. Supply is adequate but warrants monitoring, especially if demand trends are increasing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stress */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">Below 5x</h3>
                      <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                        Stress
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      Inventory covers less than 5 months of deliveries. This indicates potential supply tightness and could signal competitive pressure for available metal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* High vs Low */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
              High vs Low Coverage: What It Signals
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Low Coverage */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Low Coverage Ratio</h3>
                </div>
                <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>Tighter supply relative to demand</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>Registered inventory being drawn down</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>Potential for delivery squeezes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>May indicate upward price pressure</span>
                  </li>
                </ul>
              </div>

              {/* High Coverage */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">High Coverage Ratio</h3>
                </div>
                <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Ample supply buffer exists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Less concern about delivery failures</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Market can absorb large deliveries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Generally more price stability</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Key Terms */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Key Terms
            </h2>
            <div className="space-y-4">
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Registered Inventory</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Metal that has been warranted and is available for delivery against COMEX futures contracts. This is the "deliverable supply" that backs futures positions standing for delivery.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Eligible Inventory</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Metal stored in COMEX-approved vaults that meets exchange specifications but has not been warranted for delivery. Owners can register this metal if they choose, providing a potential supply buffer.
                </p>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Monthly Delivery Demand</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  The volume of physical metal delivered through COMEX futures contracts in a given month. We calculate this based on actual recent delivery data (contracts delivered × contract size).
                </p>
              </div>
            </div>
          </section>

          {/* Caveats */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Important Considerations
            </h2>
            <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <ul className="space-y-4 text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">1.</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white">Eligible can become Registered:</strong> A low registered inventory doesn't guarantee a shortage. Eligible metal can be registered relatively quickly if owners choose to make it deliverable.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">2.</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white">Demand fluctuates:</strong> Monthly delivery demand varies significantly. Major delivery months (March, May, July, September, December) typically see higher volumes than minor months.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">3.</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white">Not all contracts deliver:</strong> Most futures positions are closed or rolled before delivery. Only a fraction of open interest actually results in physical delivery.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-slate-900 dark:text-white">4.</span>
                  <span>
                    <strong className="text-slate-900 dark:text-white">This is not investment advice:</strong> The coverage ratio is one metric among many. It should not be used as the sole basis for investment decisions.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* CTA */}
          <section className="pt-8">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              View Current Coverage Ratios
            </Link>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <p className="text-xs text-slate-400">
            Data sourced from CME Group. This site provides informational data only and does not constitute financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
