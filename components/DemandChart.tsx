'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { useTheme } from 'next-themes';

// ============================================
// TYPES
// ============================================

type TimeRange = 'daily' | 'monthly';
type MetalType = 'gold' | 'silver' | 'aluminum' | 'copper';

interface DailyDataPoint {
  day: string;
  contracts: number;
}

interface MonthlyDataPoint {
  month: string;
  [key: string]: string | number | null; // y2025, y2026, etc.
}

interface DailyStats {
  todayContracts: number;
  weekTotal: number;
  avgDaily: number;
  label: string;
  previousLabel: string;
}

interface MonthlyStats {
  totalPreviousYear: number;
  currentMTD: number;
  previousYearSameMonth: number;
  label: string;
  previousLabel: string;
}

interface DeliveryDataProp {
  business_date: string;
  parsed_date: string;
  deliveries: Array<{
    metal: string;
    symbol: string;
    contract_month: string;
    settlement: number;
    daily_issued: number;
    daily_stopped: number;
    month_to_date: number;
  }>;
  last_updated: string;
}

interface DailyHistoryItem {
  date: string;
  dailyIssued: number;
  monthToDate: number;
}

interface MonthlyHistoryItem {
  year: number;
  month: number;
  monthName: string;
  total: number;
}

interface DemandChartProps {
  metal?: MetalType;
  deliveryData?: DeliveryDataProp | null;
}

// ============================================
// METAL TO DB NAME MAPPING
// ============================================

const metalDbNames: Record<MetalType, string> = {
  gold: 'Gold',
  silver: 'Silver',
  copper: 'Copper',
  aluminum: 'Aluminum',
};

const metalLabels: Record<MetalType, string> = {
  gold: 'Gold',
  silver: 'Silver',
  copper: 'Copper',
  aluminum: 'Aluminum',
};

// ============================================
// HELPER: Format date for display
// ============================================

function formatDateLabel(dateStr: string): string {
  // dateStr is like "2026-02-04" — format as "Feb 4"
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid TZ issues
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// CUSTOM TOOLTIPS
// ============================================

const DailyTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length) return null;

  const data = props.data || [];
  const isDark = props.isDark || false;
  const currentValue = payload[0].value as number;
  const currentIndex = data.findIndex((d: any) => d.day === label);
  const previousValue = currentIndex > 0 ? data[currentIndex - 1]?.contracts : null;

  let percentChange = null;
  if (previousValue !== null && previousValue !== undefined && previousValue > 0) {
    percentChange = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
  }

  return (
    <div
      style={{
        backgroundColor: isDark ? 'hsl(240 10% 10%)' : 'hsl(0 0% 100%)',
        border: `1px solid ${isDark ? 'hsl(240 3.7% 20%)' : 'hsl(240 5.9% 90%)'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: isDark ? '0 4px 12px rgb(0 0 0 / 0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
    >
      <p style={{
        fontWeight: 600,
        marginBottom: 8,
        color: isDark ? '#ffffff' : '#0f172a',
        fontSize: '14px'
      }}>
        {label}
      </p>
      <p style={{
        color: isDark ? '#e2e8f0' : '#334155',
        fontWeight: 500,
        fontSize: '16px',
        marginBottom: percentChange !== null ? '4px' : 0
      }}>
        {currentValue.toLocaleString()} Contracts
      </p>
      {percentChange !== null && (
        <p style={{
          color: Number(percentChange) >= 0 ? '#10b981' : '#ef4444',
          fontWeight: 600,
          fontSize: '12px',
          marginTop: '4px'
        }}>
          {Number(percentChange) >= 0 ? '+' : ''}{percentChange}% from previous day
        </p>
      )}
    </div>
  );
};

const MonthlyTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length) return null;

  const isDark = props.isDark || false;
  const yearKeys = props.yearKeys || [];

  return (
    <div
      style={{
        backgroundColor: isDark ? 'hsl(240 10% 10%)' : 'hsl(0 0% 100%)',
        border: `1px solid ${isDark ? 'hsl(240 3.7% 20%)' : 'hsl(240 5.9% 90%)'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: isDark ? '0 4px 12px rgb(0 0 0 / 0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
    >
      <p style={{
        fontWeight: 600,
        marginBottom: 8,
        color: isDark ? '#ffffff' : '#0f172a',
        fontSize: '14px'
      }}>
        {label}
      </p>
      {yearKeys.map((yearKey: string) => {
        const entry = payload.find((p: any) => p.dataKey === yearKey);
        if (!entry || entry.value === null || entry.value === undefined) return null;
        const year = yearKey.replace('y', '');
        return (
          <div key={yearKey} style={{ marginBottom: 4 }}>
            <p style={{
              color: isDark ? '#e2e8f0' : '#334155',
              fontWeight: 500,
              fontSize: '14px',
            }}>
              {year}: {Number(entry.value).toLocaleString()} contracts
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function DemandChart({ metal = 'gold', deliveryData }: DemandChartProps) {
  const { theme } = useTheme();
  const [selectedMetal, setSelectedMetal] = useState<MetalType>(metal);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const isDark = theme === 'dark';

  // Data states
  const [dailyData, setDailyData] = useState<Record<MetalType, DailyDataPoint[]>>({
    gold: [], silver: [], aluminum: [], copper: [],
  });
  const [monthlyData, setMonthlyData] = useState<Record<MetalType, MonthlyDataPoint[]>>({
    gold: [], silver: [], aluminum: [], copper: [],
  });
  const [dailyStatsMap, setDailyStatsMap] = useState<Record<MetalType, DailyStats>>({
    gold: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
    silver: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
    aluminum: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
    copper: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
  });
  const [monthlyStatsMap, setMonthlyStatsMap] = useState<Record<MetalType, MonthlyStats>>({
    gold: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
    silver: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
    aluminum: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
    copper: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
  });
  const [yearKeys, setYearKeys] = useState<string[]>(['y2025', 'y2026']);
  const [loading, setLoading] = useState(true);

  // Build data from delivery.json prop (current day) as fallback/supplement
  const buildFromDeliveryJson = useCallback(() => {
    if (!deliveryData?.deliveries) return;

    const newDailyData: Record<MetalType, DailyDataPoint[]> = {
      gold: [], silver: [], aluminum: [], copper: [],
    };
    const newDailyStats: Record<MetalType, DailyStats> = {
      gold: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
      silver: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
      aluminum: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
      copper: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
    };
    const newMonthlyStats: Record<MetalType, MonthlyStats> = {
      gold: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
      silver: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
      aluminum: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
      copper: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
    };

    for (const delivery of deliveryData.deliveries) {
      const metalKey = delivery.metal.toLowerCase() as MetalType;
      if (!newDailyData[metalKey]) continue;

      const dateLabel = formatDateLabel(deliveryData.parsed_date);
      newDailyData[metalKey] = [{ day: dateLabel, contracts: delivery.daily_issued }];

      newDailyStats[metalKey] = {
        todayContracts: delivery.daily_issued,
        weekTotal: delivery.month_to_date,
        avgDaily: delivery.month_to_date > 0 ? Math.round(delivery.month_to_date / Math.max(1, new Date(deliveryData.parsed_date).getDate())) : 0,
        label: 'Today',
        previousLabel: 'vs daily avg',
      };

      const parsedDate = new Date(deliveryData.parsed_date + 'T12:00:00');
      const monthName = parsedDate.toLocaleDateString('en-US', { month: 'short' });
      const year = parsedDate.getFullYear();
      newMonthlyStats[metalKey] = {
        totalPreviousYear: 0,
        currentMTD: delivery.month_to_date,
        previousYearSameMonth: 0,
        label: `${monthName} ${year}`,
        previousLabel: `vs ${monthName} ${year - 1}`,
      };
    }

    setDailyData(newDailyData);
    setDailyStatsMap(newDailyStats);
    setMonthlyStatsMap(newMonthlyStats);
  }, [deliveryData]);

  // Fetch historical data from API
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      const metals: MetalType[] = ['gold', 'silver', 'aluminum', 'copper'];
      const newDailyData: Record<MetalType, DailyDataPoint[]> = {
        gold: [], silver: [], aluminum: [], copper: [],
      };
      const newMonthlyData: Record<MetalType, MonthlyDataPoint[]> = {
        gold: [], silver: [], aluminum: [], copper: [],
      };
      const newDailyStats: Record<MetalType, DailyStats> = {
        gold: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
        silver: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
        aluminum: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
        copper: { todayContracts: 0, weekTotal: 0, avgDaily: 0, label: 'Today', previousLabel: 'vs 5-day avg' },
      };
      const newMonthlyStats: Record<MetalType, MonthlyStats> = {
        gold: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
        silver: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
        aluminum: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
        copper: { totalPreviousYear: 0, currentMTD: 0, previousYearSameMonth: 0, label: 'Current Month', previousLabel: 'vs last year' },
      };

      let allYears = new Set<number>();
      let apiSucceeded = false;

      try {
        // Fetch daily and monthly data in parallel for all metals
        const fetches = metals.flatMap(m => [
          fetch(`/api/delivery/history?metal=${metalDbNames[m]}&days=30&aggregate=daily`).then(r => r.ok ? r.json() : null),
          fetch(`/api/delivery/history?metal=${metalDbNames[m]}&days=730&aggregate=monthly`).then(r => r.ok ? r.json() : null),
        ]);

        const results = await Promise.all(fetches);

        for (let i = 0; i < metals.length; i++) {
          const m = metals[i];
          const dailyResult = results[i * 2];
          const monthlyResult = results[i * 2 + 1];

          // Process daily data
          if (dailyResult?.history?.length > 0) {
            apiSucceeded = true;
            const history: DailyHistoryItem[] = dailyResult.history;
            newDailyData[m] = history.map(h => ({
              day: formatDateLabel(h.date),
              contracts: h.dailyIssued,
            }));

            // Calculate daily stats
            const latest = history[history.length - 1];
            const last5 = history.slice(-5);
            const weekTotal = latest.monthToDate;
            const avgDaily = last5.length > 0
              ? Math.round(last5.reduce((sum, h) => sum + h.dailyIssued, 0) / last5.length)
              : 0;

            newDailyStats[m] = {
              todayContracts: latest.dailyIssued,
              weekTotal,
              avgDaily,
              label: 'Today',
              previousLabel: 'vs 5-day avg',
            };
          }

          // Process monthly data
          if (monthlyResult?.history?.length > 0) {
            apiSucceeded = true;
            const monthlyHistory: MonthlyHistoryItem[] = monthlyResult.history;

            // Collect all years
            monthlyHistory.forEach(h => allYears.add(h.year));

            // Build month-based data: { month: 'Jan', y2025: 1234, y2026: 5678, ... }
            const monthMap: Record<string, MonthlyDataPoint> = {};
            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Initialize all months
            monthOrder.forEach(month => {
              monthMap[month] = { month };
            });

            for (const h of monthlyHistory) {
              const yearKey = `y${h.year}`;
              monthMap[h.monthName] = {
                ...monthMap[h.monthName],
                [yearKey]: h.total,
              };
            }

            newMonthlyData[m] = monthOrder.map(month => monthMap[month]);

            // Calculate monthly stats
            const sortedYears = Array.from(allYears).sort();
            const currentYear = sortedYears[sortedYears.length - 1];
            const previousYear = sortedYears.length > 1 ? sortedYears[sortedYears.length - 2] : currentYear - 1;
            
            const currentYearData = monthlyHistory.filter(h => h.year === currentYear);
            const previousYearData = monthlyHistory.filter(h => h.year === previousYear);
            
            // Get the latest month in current year
            const latestMonth = currentYearData.length > 0 
              ? currentYearData[currentYearData.length - 1] 
              : null;
            
            const previousYearTotal = previousYearData.reduce((sum, h) => sum + h.total, 0);
            const previousYearSameMonth = latestMonth 
              ? previousYearData.find(h => h.month === latestMonth.month)?.total || 0 
              : 0;

            const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            newMonthlyStats[m] = {
              totalPreviousYear: previousYearTotal,
              currentMTD: latestMonth?.total || 0,
              previousYearSameMonth,
              label: latestMonth ? `${monthNames[latestMonth.month]} ${currentYear}` : 'Current Month',
              previousLabel: latestMonth ? `vs ${monthNames[latestMonth.month]} ${previousYear}` : `vs last year`,
            };
          }
        }
      } catch (err) {
        console.warn('Failed to fetch delivery history from API, using fallback:', err);
      }

      if (cancelled) return;

      if (apiSucceeded) {
        setDailyData(newDailyData);
        setMonthlyData(newMonthlyData);
        setDailyStatsMap(newDailyStats);
        setMonthlyStatsMap(newMonthlyStats);

        // Set year keys for the bar chart
        const sortedYears = Array.from(allYears).sort();
        setYearKeys(sortedYears.map(y => `y${y}`));
      } else {
        // Fallback: use delivery.json prop data
        buildFromDeliveryJson();
      }

      setLoading(false);
    }

    fetchData();

    return () => { cancelled = true; };
  }, [buildFromDeliveryJson]);

  const isDaily = timeRange === 'daily';
  const data = isDaily ? dailyData[selectedMetal] : monthlyData[selectedMetal];
  const dailyStatsData = dailyStatsMap[selectedMetal];
  const monthlyStatsData = monthlyStatsMap[selectedMetal];

  // Calculate change percentage
  const changeValue = isDaily
    ? dailyStatsData.todayContracts - dailyStatsData.avgDaily
    : monthlyStatsData.currentMTD - monthlyStatsData.previousYearSameMonth;
  const changePercent = isDaily
    ? dailyStatsData.avgDaily > 0 ? ((dailyStatsData.todayContracts - dailyStatsData.avgDaily) / dailyStatsData.avgDaily * 100).toFixed(0) : '0'
    : monthlyStatsData.previousYearSameMonth > 0 ? ((monthlyStatsData.currentMTD - monthlyStatsData.previousYearSameMonth) / monthlyStatsData.previousYearSameMonth * 100).toFixed(0) : '0';
  const isPositive = Number(changePercent) >= 0;

  // Determine which years to display
  const sortedYearKeys = [...yearKeys].sort();
  const currentYearKey = sortedYearKeys[sortedYearKeys.length - 1] || 'y2026';
  const previousYearKey = sortedYearKeys.length > 1 ? sortedYearKeys[sortedYearKeys.length - 2] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Metal Tabs */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800/50 w-max sm:w-fit">
              {Object.entries(metalLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetal(key as MetalType)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                    selectedMetal === key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Toggle */}
          <div className="flex gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800/50 w-full sm:w-fit">
            <button
              onClick={() => setTimeRange('daily')}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                timeRange === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeRange('monthly')}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                timeRange === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 sm:h-72 md:h-80">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground animate-pulse">Loading delivery data...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground">No delivery data available for {metalLabels[selectedMetal]}</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {isDaily ? (
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  >
                    <Label
                      value="Date"
                      position="bottom"
                      offset={10}
                      style={{
                        fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    />
                  </XAxis>
                  <YAxis
                    tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  >
                    <Label
                      value="Contracts Delivered"
                      angle={-90}
                      position="insideLeft"
                      offset={10}
                      style={{
                        fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAnchor: 'middle'
                      }}
                    />
                  </YAxis>
                  <Tooltip
                    content={(props) => <DailyTooltip {...props} data={data} isDark={isDark} />}
                    cursor={false}
                  />
                  <Bar
                    dataKey="contracts"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Contracts"
                    background={false}
                  />
                </BarChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  >
                    <Label
                      value="Month"
                      position="bottom"
                      offset={10}
                      style={{
                        fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    />
                  </XAxis>
                  <YAxis
                    tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  >
                    <Label
                      value="Contracts Delivered"
                      angle={-90}
                      position="insideLeft"
                      offset={10}
                      style={{
                        fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAnchor: 'middle'
                      }}
                    />
                  </YAxis>
                  <Tooltip
                    content={(props) => <MonthlyTooltip {...props} isDark={isDark} yearKeys={sortedYearKeys} />}
                    cursor={false}
                  />
                  {previousYearKey && (
                    <Bar
                      dataKey={previousYearKey}
                      fill={isDark ? 'hsl(240 3.7% 25%)' : 'hsl(240 5.9% 85%)'}
                      radius={[4, 4, 0, 0]}
                      name={previousYearKey.replace('y', '')}
                      background={false}
                    />
                  )}
                  <Bar
                    dataKey={currentYearKey}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name={currentYearKey.replace('y', '')}
                    background={false}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
          {isDaily ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Daily Deliveries</span>
            </div>
          ) : (
            <>
              {previousYearKey && (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-muted-foreground/30" />
                  <span className="text-muted-foreground">{previousYearKey.replace('y', '')}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-emerald-500" />
                <span className="text-muted-foreground">{currentYearKey.replace('y', '')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-3 lg:grid-cols-1 lg:flex lg:flex-col lg:justify-between gap-4 p-4 sm:p-6 lg:h-[26rem] bg-slate-50/50 dark:bg-slate-900/30 lg:bg-transparent">
        {isDaily ? (
          <>
            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">MTD Total</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{dailyStatsData.weekTotal.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">contracts</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{dailyStatsData.label}</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{dailyStatsData.todayContracts.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">contracts</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">Change</p>
              <p className={`text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">{dailyStatsData.previousLabel}</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{previousYearKey ? `${previousYearKey.replace('y', '')} Total` : 'Previous Year'}</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{monthlyStatsData.totalPreviousYear.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">delivered</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{monthlyStatsData.label}</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{monthlyStatsData.currentMTD.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">MTD</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">YoY Change</p>
              <p className={`text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">{monthlyStatsData.previousLabel}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
