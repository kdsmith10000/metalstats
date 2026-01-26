'use client';

import { Package, TrendingUp, Calendar, ArrowRight } from 'lucide-react';

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

const metalColors: Record<string, { bg: string; text: string; accent: string }> = {
  Gold: { bg: 'from-amber-500/10 to-yellow-500/5', text: 'text-amber-500', accent: 'bg-amber-500' },
  Silver: { bg: 'from-slate-400/10 to-slate-300/5', text: 'text-slate-400', accent: 'bg-slate-400' },
  Copper: { bg: 'from-orange-500/10 to-red-500/5', text: 'text-orange-500', accent: 'bg-orange-500' },
  Platinum: { bg: 'from-cyan-500/10 to-teal-500/5', text: 'text-cyan-500', accent: 'bg-cyan-500' },
  Palladium: { bg: 'from-violet-500/10 to-purple-500/5', text: 'text-violet-500', accent: 'bg-violet-500' },
};

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatCurrency(num: number): string {
  if (num >= 1000) {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toFixed(4)}`;
}

export default function DeliverySection({ data }: DeliverySectionProps) {
  // Sort deliveries by daily_issued descending
  const sortedDeliveries = [...data.deliveries].sort((a, b) => b.daily_issued - a.daily_issued);

  // Calculate totals
  const totalDaily = sortedDeliveries.reduce((sum, d) => sum + d.daily_issued, 0);
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
              {formatNumber(totalDaily)}
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

      {/* Delivery Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {sortedDeliveries.map((delivery, index) => {
          const colors = metalColors[delivery.metal] || metalColors.Gold;
          const mtdProgress = delivery.month_to_date > 0 
            ? Math.min((delivery.daily_issued / (delivery.month_to_date / 22)) * 100, 100) 
            : 0;

          return (
            <div
              key={delivery.symbol}
              className="relative overflow-hidden p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl sm:rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
              
              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${colors.accent} bg-opacity-20 flex items-center justify-center`}>
                      <Package className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {delivery.metal}
                      </h3>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {delivery.contract_month} @ {formatCurrency(delivery.settlement)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded ${colors.accent} bg-opacity-10`}>
                    <span className={`text-[10px] sm:text-xs font-black ${colors.text} uppercase tracking-wider`}>
                      {delivery.symbol}
                    </span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="p-3 sm:p-4 bg-white/50 dark:bg-black/30 rounded-lg border border-white/30 dark:border-white/5">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued</p>
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(delivery.daily_issued)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 bg-white/50 dark:bg-black/30 rounded-lg border border-white/30 dark:border-white/5">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">MTD</p>
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(delivery.month_to_date)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                    <span>Daily vs Avg</span>
                    <span>{mtdProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-800 rounded overflow-hidden">
                    <div
                      style={{ width: `${Math.min(mtdProgress, 100)}%` }}
                      className={`h-full rounded transition-all duration-500 ${colors.accent}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
