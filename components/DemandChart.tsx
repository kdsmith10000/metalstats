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
  Label,
  TooltipProps,
} from 'recharts';
import { useTheme } from 'next-themes';

// Monthly delivery data (by month, comparing years)
const monthlyDeliveryData = {
  gold: [
    { month: 'Jan', y2025: 2370, y2026: 7750 },
    { month: 'Feb', y2025: 3300, y2026: null },
    { month: 'Mar', y2025: 2400, y2026: null },
    { month: 'Apr', y2025: 6200, y2026: null },
    { month: 'May', y2025: 2100, y2026: null },
    { month: 'Jun', y2025: 5500, y2026: null },
    { month: 'Jul', y2025: 2200, y2026: null },
    { month: 'Aug', y2025: 4800, y2026: null },
    { month: 'Sep', y2025: 2300, y2026: null },
    { month: 'Oct', y2025: 5100, y2026: null },
    { month: 'Nov', y2025: 2400, y2026: null },
    { month: 'Dec', y2025: 52532, y2026: null },
  ],
  silver: [
    { month: 'Jan', y2025: 3083, y2026: 13200 },
    { month: 'Feb', y2025: 2800, y2026: null },
    { month: 'Mar', y2025: 5100, y2026: null },
    { month: 'Apr', y2025: 3200, y2026: null },
    { month: 'May', y2025: 4500, y2026: null },
    { month: 'Jun', y2025: 3800, y2026: null },
    { month: 'Jul', y2025: 5200, y2026: null },
    { month: 'Aug', y2025: 3600, y2026: null },
    { month: 'Sep', y2025: 4900, y2026: null },
    { month: 'Oct', y2025: 3400, y2026: null },
    { month: 'Nov', y2025: 4200, y2026: null },
    { month: 'Dec', y2025: 6367, y2026: null },
  ],
  aluminum: [
    { month: 'Jan', y2025: 209, y2026: 242 },
    { month: 'Feb', y2025: 98, y2026: null },
    { month: 'Mar', y2025: 159, y2026: null },
    { month: 'Apr', y2025: 300, y2026: null },
    { month: 'May', y2025: 169, y2026: null },
    { month: 'Jun', y2025: 148, y2026: null },
    { month: 'Jul', y2025: 81, y2026: null },
    { month: 'Aug', y2025: 45, y2026: null },
    { month: 'Sep', y2025: 111, y2026: null },
    { month: 'Oct', y2025: 41, y2026: null },
    { month: 'Nov', y2025: 46, y2026: null },
    { month: 'Dec', y2025: 317, y2026: null },
  ],
};

// Daily delivery data (last 30 days of January 2026)
const dailyDeliveryData = {
  gold: [
    { day: 'Jan 2', contracts: 312 },
    { day: 'Jan 3', contracts: 428 },
    { day: 'Jan 6', contracts: 521 },
    { day: 'Jan 7', contracts: 389 },
    { day: 'Jan 8', contracts: 467 },
    { day: 'Jan 9', contracts: 534 },
    { day: 'Jan 10', contracts: 612 },
    { day: 'Jan 13', contracts: 445 },
    { day: 'Jan 14', contracts: 523 },
    { day: 'Jan 15', contracts: 478 },
    { day: 'Jan 16', contracts: 567 },
    { day: 'Jan 17', contracts: 634 },
    { day: 'Jan 21', contracts: 589 },
    { day: 'Jan 22', contracts: 651 },
  ],
  silver: [
    { day: 'Jan 2', contracts: 845 },
    { day: 'Jan 3', contracts: 923 },
    { day: 'Jan 6', contracts: 1102 },
    { day: 'Jan 7', contracts: 876 },
    { day: 'Jan 8', contracts: 1034 },
    { day: 'Jan 9', contracts: 1156 },
    { day: 'Jan 10', contracts: 1289 },
    { day: 'Jan 13', contracts: 978 },
    { day: 'Jan 14', contracts: 1123 },
    { day: 'Jan 15', contracts: 1045 },
    { day: 'Jan 16', contracts: 1234 },
    { day: 'Jan 17', contracts: 1367 },
    { day: 'Jan 21', contracts: 1189 },
    { day: 'Jan 22', contracts: 1039 },
  ],
  aluminum: [
    { day: 'Jan 2', contracts: 12 },
    { day: 'Jan 3', contracts: 18 },
    { day: 'Jan 6', contracts: 21 },
    { day: 'Jan 7', contracts: 15 },
    { day: 'Jan 8', contracts: 19 },
    { day: 'Jan 9', contracts: 23 },
    { day: 'Jan 10', contracts: 17 },
    { day: 'Jan 13', contracts: 14 },
    { day: 'Jan 14', contracts: 22 },
    { day: 'Jan 15', contracts: 16 },
    { day: 'Jan 16', contracts: 25 },
    { day: 'Jan 17', contracts: 19 },
    { day: 'Jan 21', contracts: 21 },
    { day: 'Jan 22', contracts: 20 },
  ],
};

// Stats for each metal - Monthly view
const monthlyStats = {
  gold: {
    total2025: 91202,
    current2026: 7750,
    previous2025: 2370,
    label: 'Jan 2026',
    previousLabel: 'vs Jan 2025',
  },
  silver: {
    total2025: 50150,
    current2026: 13200,
    previous2025: 3083,
    label: 'Jan 2026',
    previousLabel: 'vs Jan 2025',
  },
  aluminum: {
    total2025: 1724,
    current2026: 242,
    previous2025: 209,
    label: 'Jan 2026',
    previousLabel: 'vs Jan 2025',
  },
};

// Stats for each metal - Daily view
const dailyStats = {
  gold: {
    todayContracts: 651,
    weekTotal: 2474,
    avgDaily: 495,
    label: 'Today',
    previousLabel: 'vs 7-day avg',
  },
  silver: {
    todayContracts: 1039,
    weekTotal: 5852,
    avgDaily: 1076,
    label: 'Today',
    previousLabel: 'vs 7-day avg',
  },
  aluminum: {
    todayContracts: 20,
    weekTotal: 101,
    avgDaily: 19,
    label: 'Today',
    previousLabel: 'vs 7-day avg',
  },
};

type TimeRange = 'daily' | 'monthly';
type MetalType = 'gold' | 'silver' | 'aluminum';

interface DemandChartProps {
  metal?: MetalType;
}

// Custom Tooltip for Daily view
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

// Custom Tooltip for Monthly view
const MonthlyTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (!active || !payload || !payload.length) return null;

  const data = props.data || [];
  const isDark = props.isDark || false;
  const currentIndex = data.findIndex((d: any) => d.month === label);
  const current2025 = payload.find((p: any) => p.dataKey === 'y2025')?.value as number | null;
  const current2026 = payload.find((p: any) => p.dataKey === 'y2026')?.value as number | null;
  
  // Calculate percent change for 2025
  let percentChange2025 = null;
  if (currentIndex > 0 && current2025 !== null && current2025 !== undefined) {
    const previous2025 = data[currentIndex - 1]?.y2025;
    if (previous2025 !== null && previous2025 !== undefined && previous2025 > 0) {
      percentChange2025 = ((current2025 - previous2025) / previous2025 * 100).toFixed(1);
    }
  }
  
  // Calculate percent change for 2026
  let percentChange2026 = null;
  if (currentIndex > 0 && current2026 !== null && current2026 !== undefined) {
    const previous2026 = data[currentIndex - 1]?.y2026;
    if (previous2026 !== null && previous2026 !== undefined && previous2026 > 0) {
      percentChange2026 = ((current2026 - previous2026) / previous2026 * 100).toFixed(1);
    }
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
      {current2025 !== null && current2025 !== undefined && (
        <div style={{ marginBottom: 8 }}>
          <p style={{
            color: isDark ? '#e2e8f0' : '#334155',
            fontWeight: 500,
            fontSize: '14px',
            marginBottom: percentChange2025 !== null ? '2px' : 0
          }}>
            2025: {current2025.toLocaleString()}
          </p>
          {percentChange2025 !== null && (
            <p style={{
              color: Number(percentChange2025) >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 600,
              fontSize: '11px',
              marginLeft: '8px'
            }}>
              {Number(percentChange2025) >= 0 ? '+' : ''}{percentChange2025}% from previous month
            </p>
          )}
        </div>
      )}
      {current2026 !== null && current2026 !== undefined && (
        <div>
          <p style={{
            color: isDark ? '#e2e8f0' : '#334155',
            fontWeight: 500,
            fontSize: '14px',
            marginBottom: percentChange2026 !== null ? '2px' : 0
          }}>
            2026: {current2026.toLocaleString()}
          </p>
          {percentChange2026 !== null && (
            <p style={{
              color: Number(percentChange2026) >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 600,
              fontSize: '11px',
              marginLeft: '8px'
            }}>
              {Number(percentChange2026) >= 0 ? '+' : ''}{percentChange2026}% from previous month
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default function DemandChart({ metal = 'gold' }: DemandChartProps) {
  const { theme } = useTheme();
  const [selectedMetal, setSelectedMetal] = useState<MetalType>(metal);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const isDark = theme === 'dark';
  
  const isDaily = timeRange === 'daily';
  const data = isDaily ? dailyDeliveryData[selectedMetal] : monthlyDeliveryData[selectedMetal];
  const stats = isDaily ? dailyStats[selectedMetal] : monthlyStats[selectedMetal];
  
  // Calculate change percentage
  const changeValue = isDaily 
    ? stats.todayContracts - stats.avgDaily
    : stats.current2026 - stats.previous2025;
  const changePercent = isDaily
    ? stats.avgDaily > 0 ? ((stats.todayContracts - stats.avgDaily) / stats.avgDaily * 100).toFixed(0) : 0
    : stats.previous2025 > 0 ? ((stats.current2026 - stats.previous2025) / stats.previous2025 * 100).toFixed(0) : 0;
  const isPositive = Number(changePercent) >= 0;

  const metalLabels = {
    gold: 'Gold',
    silver: 'Silver',
    aluminum: 'Aluminum',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-6">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Metal Tabs */}
          <div className="flex gap-3 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
            {Object.entries(metalLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedMetal(key as MetalType)}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                  selectedMetal === key 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Time Range Toggle */}
          <div className="flex gap-3 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
            <button
              onClick={() => setTimeRange('daily')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                timeRange === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeRange('monthly')}
              className={`px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
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
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {isDaily ? (
              <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 30 }}>
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
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
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
              <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 30 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
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
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
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
                  content={(props) => <MonthlyTooltip {...props} data={data} isDark={isDark} />}
                  cursor={false}
                />
                <Bar 
                  dataKey="y2025" 
                  fill={isDark ? 'hsl(240 3.7% 25%)' : 'hsl(240 5.9% 85%)'} 
                  radius={[4, 4, 0, 0]} 
                  name="2025"
                  background={false}
                />
                <Bar 
                  dataKey="y2026" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  name="2026"
                  background={false}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          {isDaily ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Jan 2026 Daily</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted-foreground/30" />
                <span className="text-muted-foreground">2025</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-muted-foreground">2026</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Panel - Updates based on selected metal and time range */}
      <div className="flex flex-col justify-between p-6 h-[26rem]">
        {isDaily ? (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">7-Day Total</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.weekTotal.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground font-medium">contracts delivered</p>
            </div>
            
            <div className="border-t border-dashed border-slate-300 dark:border-slate-700" />
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stats.label}</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.todayContracts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground font-medium">contracts</p>
            </div>
            
            <div className="border-t border-dashed border-slate-300 dark:border-slate-700" />
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Daily Change</p>
              <p className={`text-4xl font-bold tabular-nums tracking-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </p>
              <p className="text-sm text-muted-foreground font-medium">{stats.previousLabel}</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">2025 Total</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.total2025.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground font-medium">contracts delivered</p>
            </div>
            
            <div className="border-t border-dashed border-slate-300 dark:border-slate-700" />
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stats.label}</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.current2026.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground font-medium">projected</p>
            </div>
            
            <div className="border-t border-dashed border-slate-300 dark:border-slate-700" />
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">YoY Change</p>
              <p className={`text-4xl font-bold tabular-nums tracking-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </p>
              <p className="text-sm text-muted-foreground font-medium">{stats.previousLabel}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
