'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Line,
  ComposedChart,
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

interface DeliveryYTDSectionProps {
  data: DeliveryYTDData;
  mtdData?: DeliveryMTDData | null;
}

type ViewMode = 'monthly' | 'daily';

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

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(parts[0]) - 1;
  const day = parseInt(parts[1]);
  return `${monthNames[month]} ${day}`;
}

function getCurrentMonthLabel(mtdData: DeliveryMTDData | null | undefined): string {
  if (!mtdData?.business_date) return 'Daily';
  const parts = mtdData.business_date.split('/');
  if (parts.length !== 3) return 'Daily';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(parts[0]) - 1;
  return monthNames[month] || 'Daily';
}

function SortIndicator({ column, current, direction }: { column: string; current: string; direction: 'asc' | 'desc' }) {
  if (current !== column) {
    return <span className="text-[8px] opacity-30 ml-0.5">&#x25B2;&#x25BC;</span>;
  }
  return (
    <span className="text-[8px] ml-0.5">
      {direction === 'asc' ? '\u25B2' : '\u25BC'}
    </span>
  );
}

export default function DeliveryYTDSection({ data, mtdData }: DeliveryYTDSectionProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const mainProducts = data.products.filter(p =>
    ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium', 'Aluminum'].includes(p.metal)
  );

  const [selectedMetal, setSelectedMetal] = useState<string>(
    mainProducts.find(p => p.metal === 'Gold')?.metal || mainProducts[0]?.metal || 'Gold'
  );
  const [showAllFirms, setShowAllFirms] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [sortColumn, setSortColumn] = useState<string>('total_activity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'name' || column === 'org' ? 'asc' : 'desc');
    }
  }, [sortColumn]);

  const product = mainProducts.find(p => p.metal === selectedMetal);
  if (!product) return null;

  const color = metalColors[selectedMetal] || '#94a3b8';
  const hasMtdData = mtdData?.contracts && mtdData.contracts.length > 0;
  const mtdContract = hasMtdData
    ? mtdData!.contracts.find(c => c.metal === selectedMetal)
    : null;
  const currentMonthLabel = getCurrentMonthLabel(mtdData);

  // Monthly chart data
  const monthKeys = Object.keys(product.monthly_totals);
  const monthlyChartData = monthKeys.map(key => ({
    month: MONTH_DISPLAY[key] || key,
    total: product.monthly_totals[key] || 0,
    key,
  }));

  const grandTotal = Object.values(product.monthly_totals).reduce((s, v) => s + v, 0);

  // Daily chart data (from MTD)
  const dailyChartData = mtdContract
    ? mtdContract.daily_data.map(d => ({
        date: formatShortDate(d.date),
        daily: d.daily,
        cumulative: d.cumulative,
      }))
    : [];

  const activeDays = mtdContract
    ? mtdContract.daily_data.filter(d => d.daily > 0)
    : [];
  const activeDayCount = activeDays.length;
  const totalDays = mtdContract?.daily_data.length || 0;
  const avgDaily = activeDayCount > 0 ? Math.round((mtdContract?.total_cumulative || 0) / activeDayCount) : 0;
  const maxDay = mtdContract?.daily_data.reduce((max, d) => d.daily > max.daily ? d : max, mtdContract.daily_data[0]);
  const maxDayLabel = maxDay ? formatShortDate(maxDay.date) : '';

  const sortedFirms = useMemo(() => {
    const firms = [...product.firms];
    const dir = sortDirection === 'asc' ? 1 : -1;
    firms.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      if (sortColumn === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortColumn === 'org') {
        aVal = a.org;
        bVal = b.org;
      } else if (sortColumn === 'total_issued') {
        aVal = a.total_issued;
        bVal = b.total_issued;
      } else if (sortColumn === 'total_stopped') {
        aVal = a.total_stopped;
        bVal = b.total_stopped;
      } else if (sortColumn === 'total_activity') {
        aVal = a.total_activity;
        bVal = b.total_activity;
      } else if (sortColumn.startsWith('month_')) {
        const key = sortColumn.replace('month_', '');
        aVal = (a.issued[key] || 0) - (a.stopped[key] || 0);
        bVal = (b.issued[key] || 0) - (b.stopped[key] || 0);
      }
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
    return firms;
  }, [product.firms, sortColumn, sortDirection]);

  const displayFirms = showAllFirms ? sortedFirms : sortedFirms.slice(0, 10);

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16 gap-4">
        <div className="space-y-3 sm:space-y-8">
          <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
            Year-to-Date Deliveries
          </h2>
          <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase whitespace-nowrap">
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

      {/* Controls Row — metal tabs left, toggle right */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Metal Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800/50 w-max sm:w-fit">
            {mainProducts.map(p => (
              <button
                key={p.metal}
                onClick={() => { setSelectedMetal(p.metal); setShowAllFirms(false); }}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                  selectedMetal === p.metal
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                {p.metal}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly / Daily Toggle */}
        {hasMtdData && (
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
        )}
      </div>

      {/* Chart Area */}
      {viewMode === 'monthly' || !mtdContract ? (
        /* Monthly Totals Bar Chart */
        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Monthly Delivery Totals
          </h3>
          <div className="h-48 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
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
                  formatter={(value: any) => [formatNumber(Number(value) || 0), 'Contracts']}
                  labelStyle={{ color: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontWeight: 800, marginBottom: 4 }}
                  cursor={false}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
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
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
            * Dec = previous year December. Current month may be partial.
          </p>
        </div>
      ) : (
        /* Daily Delivery Chart */
        <div className="space-y-6 mb-6 sm:mb-8">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Cumulative
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums" style={{ color }}>
                {formatNumber(mtdContract.total_cumulative)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Active Days
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums text-slate-900 dark:text-white">
                {activeDayCount}<span className="text-sm text-slate-400 font-bold">/{totalDays}</span>
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                Avg / Active Day
              </p>
              <p className="text-lg sm:text-xl font-black tabular-nums text-slate-900 dark:text-white">
                {formatNumber(avgDaily)}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/40 rounded-none border border-slate-200 dark:border-slate-700/30 text-center">
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

          {/* Daily ComposedChart */}
          <div className="h-48 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                <Bar yAxisId="left" dataKey="daily" name="daily" radius={[4, 4, 0, 0]}>
                  {dailyChartData.map((entry, index) => (
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
        </div>
      )}

      {/* Firm-Level Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none border-y sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-black/40 backdrop-blur-xl">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Top Firms — {selectedMetal}
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th
                onClick={() => handleSort('name')}
                className="px-4 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  Firm
                  <SortIndicator column="name" current={sortColumn} direction={sortDirection} />
                </span>
              </th>
              <th
                onClick={() => handleSort('org')}
                className="px-3 sm:px-4 py-3 text-center text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="inline-flex items-center justify-center gap-1">
                  Type
                  <SortIndicator column="org" current={sortColumn} direction={sortDirection} />
                </span>
              </th>
              <th
                onClick={() => handleSort('total_issued')}
                className="px-3 sm:px-4 py-3 text-right text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-widest cursor-pointer select-none hover:text-emerald-400 transition-colors"
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Issued
                  <SortIndicator column="total_issued" current={sortColumn} direction={sortDirection} />
                </span>
              </th>
              <th
                onClick={() => handleSort('total_stopped')}
                className="px-3 sm:px-4 py-3 text-right text-[10px] sm:text-xs font-black text-orange-500 uppercase tracking-widest cursor-pointer select-none hover:text-orange-400 transition-colors"
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Stopped
                  <SortIndicator column="total_stopped" current={sortColumn} direction={sortDirection} />
                </span>
              </th>
              <th
                onClick={() => handleSort('total_activity')}
                className="px-3 sm:px-4 py-3 text-right text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="inline-flex items-center justify-end gap-1">
                  Total
                  <SortIndicator column="total_activity" current={sortColumn} direction={sortDirection} />
                </span>
              </th>
              {monthKeys.map(key => (
                <th
                  key={key}
                  onClick={() => handleSort(`month_${key}`)}
                  className="px-2 sm:px-3 py-3 text-right text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center justify-end gap-0.5">
                    {MONTH_DISPLAY[key] || key}
                    <SortIndicator column={`month_${key}`} current={sortColumn} direction={sortDirection} />
                  </span>
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
