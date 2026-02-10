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
  Line,
  ComposedChart,
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
  // dateStr = "02/03/2026" -> "Feb 3"
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(parts[0]) - 1;
  const day = parseInt(parts[1]);
  return `${monthNames[month]} ${day}`;
}

export default function DeliveryMTDChart({ data }: DeliveryMTDChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Filter to main metals only (skip micro contracts)
  const mainContracts = data.contracts.filter(c => 
    ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium', 'Aluminum'].includes(c.metal)
  );

  // Default to Gold
  const [selectedMetal, setSelectedMetal] = useState<string>(
    mainContracts.find(c => c.metal === 'Gold')?.metal || mainContracts[0]?.metal || 'Gold'
  );

  const contract = mainContracts.find(c => c.metal === selectedMetal);
  if (!contract) return null;

  const color = metalColors[selectedMetal] || '#94a3b8';

  // Build chart data
  const chartData = contract.daily_data.map(d => ({
    date: formatShortDate(d.date),
    daily: d.daily,
    cumulative: d.cumulative,
  }));

  // Calculate stats
  const totalDays = contract.daily_data.length;
  const avgDaily = totalDays > 0 ? Math.round(contract.total_cumulative / totalDays) : 0;
  const maxDay = contract.daily_data.reduce((max, d) => d.daily > max.daily ? d : max, contract.daily_data[0]);
  const maxDayLabel = maxDay ? formatShortDate(maxDay.date) : '';

  return (
    <div className="space-y-6">
      {/* Metal Selector */}
      <div className="flex flex-wrap gap-2">
        {mainContracts.map(c => (
          <button
            key={c.metal}
            onClick={() => setSelectedMetal(c.metal)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
              selectedMetal === c.metal
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {c.metal}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 bg-white/40 dark:bg-black/40 rounded-xl border border-white/30 dark:border-slate-700/30 text-center">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
            Cumulative
          </p>
          <p className="text-lg sm:text-xl font-black tabular-nums" style={{ color }}>
            {formatNumber(contract.total_cumulative)}
          </p>
        </div>
        <div className="p-3 sm:p-4 bg-white/40 dark:bg-black/40 rounded-xl border border-white/30 dark:border-slate-700/30 text-center">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
            Avg Daily
          </p>
          <p className="text-lg sm:text-xl font-black tabular-nums text-slate-900 dark:text-white">
            {formatNumber(avgDaily)}
          </p>
        </div>
        <div className="p-3 sm:p-4 bg-white/40 dark:bg-black/40 rounded-xl border border-white/30 dark:border-slate-700/30 text-center">
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

      {/* Chart */}
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDark ? '#334155' : '#e2e8f0'} 
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
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
              formatter={(value: any, name: any) => [
                formatNumber(Number(value) || 0),
                name === 'daily' ? 'Daily' : 'Cumulative',
              ]}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 800, marginBottom: 4 }}
            />
            <Bar
              yAxisId="left"
              dataKey="daily"
              fill={color}
              opacity={0.8}
              radius={[4, 4, 0, 0]}
              name="daily"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke={isDark ? '#e2e8f0' : '#334155'}
              strokeWidth={2.5}
              dot={{ fill: isDark ? '#e2e8f0' : '#334155', r: 3 }}
              name="cumulative"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.8 }} />
          <span>Daily Deliveries</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: isDark ? '#e2e8f0' : '#334155' }} />
          <span>Cumulative</span>
        </div>
      </div>
    </div>
  );
}
