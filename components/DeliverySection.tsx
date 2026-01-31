'use client';

interface DeliveryData {
  metal: string;
  symbol: string;
  contract_month: string;
  settlement: number;
  daily_issued: number;
  daily_stopped: number;
  month_to_date: number;
}

interface DeliverySectionProps {
  data: {
    business_date: string;
    parsed_date: string;
    deliveries: DeliveryData[];
    last_updated: string;
  };
}

const metalColors: Record<string, { text: string; bg: string }> = {
  Gold: { text: 'text-amber-500', bg: 'bg-amber-500' },
  Silver: { text: 'text-slate-400', bg: 'bg-slate-400' },
  Copper: { text: 'text-orange-500', bg: 'bg-orange-500' },
  Platinum: { text: 'text-cyan-500', bg: 'bg-cyan-500' },
  Palladium: { text: 'text-violet-500', bg: 'bg-violet-500' },
};

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatCurrency(num: number): string {
  if (num >= 1000) {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toFixed(2)}`;
}

export default function DeliverySection({ data }: DeliverySectionProps) {
  // Sort deliveries by daily_issued descending
  const sortedDeliveries = [...data.deliveries].sort((a, b) => b.daily_issued - a.daily_issued);

  // Calculate totals
  const totalDailyIssued = sortedDeliveries.reduce((sum, d) => sum + d.daily_issued, 0);
  const totalDailyStopped = sortedDeliveries.reduce((sum, d) => sum + d.daily_stopped, 0);
  const totalMTD = sortedDeliveries.reduce((sum, d) => sum + d.month_to_date, 0);

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16 gap-4">
        <div className="max-w-xl space-y-3 sm:space-y-8">
          <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
            Delivery Notices
          </h2>
          <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
            DAILY ISSUES & STOPS — {data.business_date}
          </p>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Today</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black tabular-nums text-slate-900 dark:text-white">
              {formatNumber(totalDailyIssued)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">MTD</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black tabular-nums text-emerald-500">
              {formatNumber(totalMTD)}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none sm:rounded-xl border-y sm:border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-black/40 backdrop-blur-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Metal
              </th>
              <th className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Contract
              </th>
              <th className="px-4 sm:px-6 py-4 text-right text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Settlement
              </th>
              <th className="px-4 sm:px-6 py-4 text-right text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Issued
              </th>
              <th className="px-4 sm:px-6 py-4 text-right text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Stopped
              </th>
              <th className="px-4 sm:px-6 py-4 text-right text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                MTD
              </th>
              <th className="px-4 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:table-cell">
                % of MTD
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDeliveries.map((delivery, index) => {
              const colors = metalColors[delivery.metal] || metalColors.Gold;
              // Calculate what % of the month's total deliveries happened today
              const pctOfMTD = delivery.month_to_date > 0 
                ? (delivery.daily_issued / delivery.month_to_date) * 100 
                : 0;
              // Highlight if today's deliveries are significant (> 10% of MTD)
              const isSignificant = pctOfMTD > 10;

              return (
                <tr 
                  key={delivery.symbol}
                  className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                    index === sortedDeliveries.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  {/* Metal */}
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-2 h-8 rounded-full ${colors.bg}`} />
                      <div>
                        <p className={`text-sm sm:text-base font-bold ${colors.text}`}>
                          {delivery.metal}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-semibold">
                          {delivery.symbol}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Contract */}
                  <td className="px-4 sm:px-6 py-4">
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {delivery.contract_month}
                    </p>
                  </td>

                  {/* Settlement */}
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <p className="text-sm sm:text-base font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(delivery.settlement)}
                    </p>
                  </td>

                  {/* Issued */}
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <p className="text-sm sm:text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatNumber(delivery.daily_issued)}
                    </p>
                  </td>

                  {/* Stopped */}
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <p className="text-sm sm:text-base font-bold tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(delivery.daily_stopped)}
                    </p>
                  </td>

                  {/* MTD */}
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <p className="text-sm sm:text-base font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(delivery.month_to_date)}
                    </p>
                  </td>

                  {/* % of MTD */}
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(pctOfMTD, 100)}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSignificant ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-bold tabular-nums min-w-[45px] text-right ${
                        isSignificant ? 'text-emerald-500' : 'text-slate-400'
                      }`}>
                        {pctOfMTD.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals Footer */}
          <tfoot>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
              <td className="px-4 sm:px-6 py-4">
                <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                  Total
                </p>
              </td>
              <td className="px-4 sm:px-6 py-4"></td>
              <td className="px-4 sm:px-6 py-4"></td>
              <td className="px-4 sm:px-6 py-4 text-right">
                <p className="text-sm sm:text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatNumber(totalDailyIssued)}
                </p>
              </td>
              <td className="px-4 sm:px-6 py-4 text-right">
                <p className="text-sm sm:text-base font-black tabular-nums text-slate-600 dark:text-slate-300">
                  {formatNumber(totalDailyStopped)}
                </p>
              </td>
              <td className="px-4 sm:px-6 py-4 text-right">
                <p className="text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-white">
                  {formatNumber(totalMTD)}
                </p>
              </td>
              <td className="px-4 sm:px-6 py-4 hidden sm:table-cell"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Note */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-[10px] sm:text-xs font-medium text-slate-400">
          Data from CME Group Daily Delivery Notices • Updated {data.last_updated?.split('T')[0]}
        </p>
      </div>
    </section>
  );
}
