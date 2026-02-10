'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from 'next-themes';

interface FirmData {
  code: string;
  name: string;
  org: string;
  issued: Record<string, number>;
  stopped: Record<string, number>;
  total_issued: number;
  total_stopped: number;
  total_activity: number;
}

interface YTDProduct {
  metal: string;
  symbol: string;
  product_name: string;
  monthly_totals: Record<string, number>;
  firms: FirmData[];
}

interface DeliveryYTDData {
  business_date: string;
  parsed_date: string;
  products: YTDProduct[];
  last_updated: string;
}

interface DeliveryYTDSectionProps {
  data: DeliveryYTDData;
}

const metalColors: Record<string, string> = {
  Gold: '#f59e0b',
  Silver: '#94a3b8',
  Copper: '#f97316',
  Platinum: '#06b6d4',
  Palladium: '#8b5cf6',
  Aluminum: '#64748b',
};

const MONTH_DISPLAY: Record<string, string> = {
  prev_dec: 'Dec*',
  jan: 'Jan',
  feb: 'Feb',
  mar: 'Mar',
  apr: 'Apr',
  may: 'May',
  jun: 'Jun',
  jul: 'Jul',
  aug: 'Aug',
  sep: 'Sep',
  oct: 'Oct',
  nov: 'Nov',
  dec: 'Dec',
};

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export default function DeliveryYTDSection({ data }: DeliveryYTDSectionProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Filter to main metals only (skip micro contracts)
  const mainProducts = data.products.filter(p =>
    ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium', 'Aluminum'].includes(p.metal)
  );

  const [selectedMetal, setSelectedMetal] = useState<string>(
    mainProducts.find(p => p.metal === 'Gold')?.metal || mainProducts[0]?.metal || 'Gold'
  );
  const [showAllFirms, setShowAllFirms] = useState(false);

  const product = mainProducts.find(p => p.metal === selectedMetal);
  if (!product) return null;

  const color = metalColors[selectedMetal] || '#94a3b8';

  // Build monthly chart data
  const monthKeys = Object.keys(product.monthly_totals);
  const monthlyChartData = monthKeys.map(key => ({
    month: MONTH_DISPLAY[key] || key,
    total: product.monthly_totals[key] || 0,
    key,
  }));

  // Calculate grand total
  const grandTotal = Object.values(product.monthly_totals).reduce((s, v) => s + v, 0);

  // Top firms (show top 10 by default, all when expanded)
  const displayFirms = showAllFirms ? product.firms : product.firms.slice(0, 10);

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16 gap-4">
        <div className="max-w-xl space-y-3 sm:space-y-8">
          <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
            Year-to-Date Deliveries
          </h2>
          <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
            MONTHLY TOTALS &amp; FIRM-LEVEL BREAKDOWN — {data.business_date}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">
            YTD Total
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black tabular-nums" style={{ color }}>
            {formatNumber(grandTotal)}
          </p>
        </div>
      </div>

      {/* Metal Selector */}
      <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
        {mainProducts.map(p => (
          <button
            key={p.metal}
            onClick={() => { setSelectedMetal(p.metal); setShowAllFirms(false); }}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              selectedMetal === p.metal
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {p.metal}
          </button>
        ))}
      </div>

      {/* Monthly Totals Bar Chart */}
      <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm mb-6 sm:mb-8">
        <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 sm:mb-6">
          Monthly Delivery Totals
        </h3>
        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#334155' : '#e2e8f0'}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '12px',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatNumber(Number(value) || 0), 'Contracts']}
                labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 800, marginBottom: 4 }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {monthlyChartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={color}
                    opacity={index === monthlyChartData.length - 1 ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[9px] sm:text-[10px] text-slate-400 font-medium">
          * Dec = previous year December. Current month may be partial.
        </p>
      </div>

      {/* Firm-Level Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none border-y sm:border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-black/40 backdrop-blur-xl">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Top Firms — {selectedMetal}
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Firm
              </th>
              <th className="px-3 sm:px-4 py-3 text-center text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Type
              </th>
              <th className="px-3 sm:px-4 py-3 text-right text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-widest">
                Issued
              </th>
              <th className="px-3 sm:px-4 py-3 text-right text-[10px] sm:text-xs font-black text-orange-500 uppercase tracking-widest">
                Stopped
              </th>
              <th className="px-3 sm:px-4 py-3 text-right text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Total
              </th>
              {/* Monthly breakdown columns - hidden on mobile */}
              {monthKeys.map(key => (
                <th key={key} className="px-2 sm:px-3 py-3 text-right text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  {MONTH_DISPLAY[key] || key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayFirms.map((firm, index) => {
              const firmGrandTotal = firm.total_issued + firm.total_stopped;
              const pctOfTotal = grandTotal > 0 ? (firmGrandTotal / grandTotal / 2) * 100 : 0;

              return (
                <tr
                  key={`${firm.code}-${firm.org}-${index}`}
                  className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                    index === displayFirms.length - 1 && !showAllFirms ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 sm:px-6 py-3">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                      {firm.name}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold">
                      #{firm.code}
                    </p>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center">
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-black rounded ${
                      firm.org === 'C'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    }`}>
                      {firm.org === 'C' ? 'CLR' : 'HSE'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <p className="text-xs sm:text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatNumber(firm.total_issued)}
                    </p>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <p className="text-xs sm:text-sm font-bold tabular-nums text-orange-600 dark:text-orange-400">
                      {formatNumber(firm.total_stopped)}
                    </p>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <p className="text-xs sm:text-sm font-black tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(firm.total_activity)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold">
                      {pctOfTotal.toFixed(1)}%
                    </p>
                  </td>
                  {/* Monthly breakdown - hidden on mobile */}
                  {monthKeys.map(key => {
                    const issued = firm.issued[key] || 0;
                    const stopped = firm.stopped[key] || 0;
                    const net = issued - stopped;
                    return (
                      <td key={key} className="px-2 sm:px-3 py-3 text-right hidden lg:table-cell">
                        <p className={`text-[10px] font-bold tabular-nums ${
                          net > 0 ? 'text-emerald-500' : net < 0 ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'
                        }`}>
                          {net !== 0 ? (net > 0 ? `+${formatNumber(net)}` : formatNumber(net)) : '—'}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Show More / Less */}
        {product.firms.length > 10 && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              onClick={() => setShowAllFirms(!showAllFirms)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider transition-colors"
            >
              {showAllFirms
                ? 'Show Top 10'
                : `Show All ${product.firms.length} Firms`}
            </button>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-[10px] sm:text-xs font-medium text-slate-400">
          Data from CME Group Year-to-Date Delivery Report • CLR = Clearing / HSE = House • Updated {data.last_updated?.split('T')[0]}
        </p>
      </div>
    </section>
  );
}
