'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell,
} from 'recharts';
import { useTheme } from 'next-themes';

interface DailyEntry {
  date: string;
  iso_date: string;
  daily: number;
  cumulative: number;
}

interface MTDContract {
  metal: string;
  symbol: string;
  contract_name: string;
  contract_month: string;
  daily_data: DailyEntry[];
  total_cumulative: number;
}

interface DeliveryMTDData {
  business_date: string;
  parsed_date: string;
  contracts: MTDContract[];
  last_updated: string;
}

interface DeliveryMTDChartProps {
  data: DeliveryMTDData;
}

const metalColors: Record<string, string> = {
  Gold: '#f59e0b',
  Silver: '#94a3b8',
  Copper: '#f97316',
  Platinum: '#06b6d4',
  Palladium: '#8b5cf6',
  Aluminum: '#64748b',
};

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(parts[0]) - 1;
  const day = parseInt(parts[1]);
  return `${monthNames[month]} ${day}`;
}

type ViewMode = 'monthly' | 'daily';

export default function DeliveryMTDChart({ data }: DeliveryMTDChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const mainContracts = data.contracts.filter(c => 
    ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium', 'Aluminum'].includes(c.metal)
  );

  const [selectedMetal, setSelectedMetal] = useState<string>(
    mainContracts.find(c => c.metal === 'Gold')?.metal || mainContracts[0]?.metal || 'Gold'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const contract = mainContracts.find(c => c.metal === selectedMetal);
  if (!contract) return null;

  const color = metalColors[selectedMetal] || '#94a3b8';

  const chartData = contract.daily_data.map(d => ({
    date: formatShortDate(d.date),
    daily: d.daily,
    cumulative: d.cumulative,
  }));

  const activeDays = contract.daily_data.filter(d => d.daily > 0);
  const activeDayCount = activeDays.length;
  const totalDays = contract.daily_data.length;
  const avgDaily = activeDayCount > 0 ? Math.round(contract.total_cumulative / activeDayCount) : 0;
  const maxDay = contract.daily_data.reduce((max, d) => d.daily > max.daily ? d : max, contract.daily_data[0]);
  const maxDayLabel = maxDay ? formatShortDate(maxDay.date) : '';
  const lastActiveDay = activeDays.length > 0 ? activeDays[activeDays.length - 1] : null;
  const lastActiveLabel = lastActiveDay ? formatShortDate(lastActiveDay.date) : '';
  const isSparse = activeDayCount < totalDays * 0.6;

  // Monthly overview: all metals' cumulative totals
  const monthlyChartData = mainContracts
    .map(c => ({
      metal: c.metal,
      total: c.total_cumulative,
      color: metalColors[c.metal] || '#94a3b8',
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = mainContracts.reduce((sum, c) => sum + c.total_cumulative, 0);

  return (
    <div className="notranslate space-y-6" translate="no">
      {/* Controls Row — metal tabs left, toggle right */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Metal Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800/50 w-max sm:w-fit">
            {mainContracts.map(c => (
              <button
                key={c.metal}
                onClick={() => setSelectedMetal(c.metal)}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                  selectedMetal === c.metal
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                {c.metal}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly / Daily Toggle */}
        <div className="flex gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800/50 w-full sm:w-fit">
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        /* Monthly Overview — all metals comparison */
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              MTD Cumulative by Metal
            </h3>
            <p className="text-xs font-bold text-slate-400 tabular-nums">
              Total: {formatNumber(grandTotal)}
            </p>
          </div>
          <div className="h-48 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
                  vertical={false}
                />
                <XAxis
                  dataKey="metal"
                  tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
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
                  formatter={(value: any) => [formatNumber(Number(value) || 0), 'Contracts MTD']}
                  labelStyle={{ color: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontWeight: 800, marginBottom: 4 }}
                  cursor={false}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {monthlyChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Daily View — per-metal daily breakdown */
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-white dark:bg-black/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Cumulative
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums" style={{ color }}>
                {formatNumber(contract.total_cumulative)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white dark:bg-black/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Active Days
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums text-slate-900 dark:text-white">
                {activeDayCount}<span className="text-sm text-slate-400 font-bold">/{totalDays}</span>
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white dark:bg-black/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Avg / Active Day
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums text-slate-900 dark:text-white">
                {formatNumber(avgDaily)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white dark:bg-black/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Peak Day
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums text-slate-900 dark:text-white">
                {maxDayLabel}
              </p>
              <p className="text-[9px] text-slate-400 font-bold tabular-nums">
                {formatNumber(maxDay?.daily || 0)}
              </p>
            </div>
          </div>

          {isSparse && (
            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
              {selectedMetal} had delivery activity on {activeDayCount} of {totalDays} business days this month.
              {lastActiveDay && activeDays.length < totalDays && (
                <> Last delivery: <span className="font-bold text-slate-500 dark:text-slate-400">{lastActiveLabel}</span> ({formatNumber(lastActiveDay.daily)} contracts).</>
              )}
            </p>
          )}

          {/* Chart */}
          <div className="h-48 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'} 
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
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
                  formatter={(value: any, name: any) => [
                    formatNumber(Number(value) || 0),
                    name === 'daily' ? 'Daily' : 'Cumulative',
                  ]}
                  labelStyle={{ color: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontWeight: 800, marginBottom: 4 }}
                  cursor={false}
                />
                <Bar
                  yAxisId="left"
                  dataKey="daily"
                  name="daily"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.daily > 0 ? color : (isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 96%)')}
                      opacity={entry.daily > 0 ? 0.85 : 0.3}
                      stroke={entry.daily === 0 ? (isDark ? 'hsl(240 3.7% 25%)' : 'hsl(240 5.9% 80%)') : 'none'}
                      strokeWidth={entry.daily === 0 ? 1 : 0}
                      strokeDasharray={entry.daily === 0 ? '2 2' : undefined}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke={isDark ? 'hsl(240 5% 84%)' : 'hsl(240 5.9% 30%)'}
                  strokeWidth={2.5}
                  dot={{ fill: isDark ? 'hsl(240 5% 84%)' : 'hsl(240 5.9% 30%)', r: 3 }}
                  name="cumulative"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color, opacity: 0.85 }} />
              <span>Daily Deliveries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-dashed" style={{ borderColor: isDark ? 'hsl(240 3.7% 25%)' : 'hsl(240 5.9% 80%)' }} />
              <span>No Activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: isDark ? 'hsl(240 5% 84%)' : 'hsl(240 5.9% 30%)' }} />
              <span>Cumulative</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
