'use client';

import { useState, useEffect } from 'react';
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
  dateKey: string; // YYYY-MM-DD for dedup
  contracts: number;
}

interface MonthlyDataPoint {
  month: string;
  y2025: number | null;
  y2026: number | null;
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

interface DemandChartProps {
  metal?: MetalType;
  deliveryData?: DeliveryDataProp | null;
}

// ============================================
// BASELINE DATA — Historical data that won't change
// These provide the foundation; live API data merges on top.
// ============================================

// Monthly delivery data (by month, comparing years)
// 2025 data is finalized. 2026 data updates via API/delivery.json.
const baselineMonthlyData: Record<MetalType, MonthlyDataPoint[]> = {
  gold: [
    { month: 'Jan', y2025: 2370, y2026: 11862 },
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
    { month: 'Dec', y2025: 37098, y2026: null },
  ],
  silver: [
    { month: 'Jan', y2025: 3083, y2026: 9889 },
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
    { month: 'Dec', y2025: 12946, y2026: null },
  ],
  aluminum: [
    { month: 'Jan', y2025: 209, y2026: 156 },
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
  copper: [
    { month: 'Jan', y2025: 4200, y2026: 15999 },
    { month: 'Feb', y2025: 3800, y2026: null },
    { month: 'Mar', y2025: 4500, y2026: null },
    { month: 'Apr', y2025: 5100, y2026: null },
    { month: 'May', y2025: 4700, y2026: null },
    { month: 'Jun', y2025: 4300, y2026: null },
    { month: 'Jul', y2025: 3900, y2026: null },
    { month: 'Aug', y2025: 4100, y2026: null },
    { month: 'Sep', y2025: 4600, y2026: null },
    { month: 'Oct', y2025: 5200, y2026: null },
    { month: 'Nov', y2025: 4400, y2026: null },
    { month: 'Dec', y2025: 20871, y2026: null },
  ],
};

// Daily delivery baseline — recent trading days
// New days from API/delivery.json merge onto this list
const baselineDailyData: Record<MetalType, DailyDataPoint[]> = {
  gold: [
    { day: 'Jan 22', dateKey: '2026-01-22', contracts: 651 },
    { day: 'Jan 23', dateKey: '2026-01-23', contracts: 1090 },
    { day: 'Jan 24', dateKey: '2026-01-24', contracts: 445 },
    { day: 'Jan 27', dateKey: '2026-01-27', contracts: 25 },
    { day: 'Jan 28', dateKey: '2026-01-28', contracts: 8234 },
    { day: 'Jan 29', dateKey: '2026-01-29', contracts: 20484 },
    { day: 'Jan 30', dateKey: '2026-01-30', contracts: 7036 },
    { day: 'Feb 2', dateKey: '2026-02-02', contracts: 639 },
    { day: 'Feb 3', dateKey: '2026-02-03', contracts: 1153 },
    { day: 'Feb 4', dateKey: '2026-02-04', contracts: 2692 },
  ],
  silver: [
    { day: 'Jan 22', dateKey: '2026-01-22', contracts: 139 },
    { day: 'Jan 23', dateKey: '2026-01-23', contracts: 165 },
    { day: 'Jan 24', dateKey: '2026-01-24', contracts: 148 },
    { day: 'Jan 27', dateKey: '2026-01-27', contracts: 79 },
    { day: 'Jan 28', dateKey: '2026-01-28', contracts: 246 },
    { day: 'Jan 29', dateKey: '2026-01-29', contracts: 1881 },
    { day: 'Jan 30', dateKey: '2026-01-30', contracts: 633 },
    { day: 'Feb 2', dateKey: '2026-02-02', contracts: 251 },
    { day: 'Feb 3', dateKey: '2026-02-03', contracts: 190 },
    { day: 'Feb 4', dateKey: '2026-02-04', contracts: 608 },
  ],
  aluminum: [
    { day: 'Jan 22', dateKey: '2026-01-22', contracts: 20 },
    { day: 'Jan 23', dateKey: '2026-01-23', contracts: 15 },
    { day: 'Jan 24', dateKey: '2026-01-24', contracts: 18 },
    { day: 'Jan 27', dateKey: '2026-01-27', contracts: 12 },
    { day: 'Jan 28', dateKey: '2026-01-28', contracts: 18 },
    { day: 'Jan 29', dateKey: '2026-01-29', contracts: 0 },
    { day: 'Jan 30', dateKey: '2026-01-30', contracts: 0 },
    { day: 'Feb 2', dateKey: '2026-02-02', contracts: 4 },
    { day: 'Feb 3', dateKey: '2026-02-03', contracts: 65 },
    { day: 'Feb 4', dateKey: '2026-02-04', contracts: 0 },
  ],
  copper: [
    { day: 'Jan 22', dateKey: '2026-01-22', contracts: 356 },
    { day: 'Jan 23', dateKey: '2026-01-23', contracts: 400 },
    { day: 'Jan 24', dateKey: '2026-01-24', contracts: 358 },
    { day: 'Jan 27', dateKey: '2026-01-27', contracts: 237 },
    { day: 'Jan 28', dateKey: '2026-01-28', contracts: 432 },
    { day: 'Jan 29', dateKey: '2026-01-29', contracts: 2976 },
    { day: 'Jan 30', dateKey: '2026-01-30', contracts: 1544 },
    { day: 'Feb 2', dateKey: '2026-02-02', contracts: 607 },
    { day: 'Feb 3', dateKey: '2026-02-03', contracts: 323 },
    { day: 'Feb 4', dateKey: '2026-02-04', contracts: 439 },
  ],
};

// Baseline monthly stats (2025 totals for reference)
const baselineMonthlyStats: Record<MetalType, { total2025: number; previous2025: Record<string, number> }> = {
  gold: {
    total2025: 91202,
    previous2025: { Jan: 2370, Feb: 3300, Mar: 2400, Apr: 6200, May: 2100, Jun: 5500, Jul: 2200, Aug: 4800, Sep: 2300, Oct: 5100, Nov: 2400, Dec: 37098 },
  },
  silver: {
    total2025: 50150,
    previous2025: { Jan: 3083, Feb: 2800, Mar: 5100, Apr: 3200, May: 4500, Jun: 3800, Jul: 5200, Aug: 3600, Sep: 4900, Oct: 3400, Nov: 4200, Dec: 12946 },
  },
  aluminum: {
    total2025: 1724,
    previous2025: { Jan: 209, Feb: 98, Mar: 159, Apr: 300, May: 169, Jun: 148, Jul: 81, Aug: 45, Sep: 111, Oct: 41, Nov: 46, Dec: 317 },
  },
  copper: {
    total2025: 53600,
    previous2025: { Jan: 4200, Feb: 3800, Mar: 4500, Apr: 5100, May: 4700, Jun: 4300, Jul: 3900, Aug: 4100, Sep: 4600, Oct: 5200, Nov: 4400, Dec: 20871 },
  },
};

// ============================================
// METAL CONFIG
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
// HELPERS
// ============================================

function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // ISO datetime like "2026-02-05T00:00:00.000Z"
  const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) return isoMatch[1];
  // Long date string like "Thu Feb 05 2026 00:00:00 GMT..." — parse it
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return dateStr;
}

function formatDateLabel(dateStr: string): string {
  const clean = normalizeDate(dateStr);
  if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean || '';
  const d = new Date(clean + 'T12:00:00'); // noon to avoid TZ issues
  if (isNaN(d.getTime())) return clean;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const monthIndexToName: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
};

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

  const data = props.data || [];
  const isDark = props.isDark || false;
  const currentIndex = data.findIndex((d: any) => d.month === label);
  const current2025 = payload.find((p: any) => p.dataKey === 'y2025')?.value as number | null;
  const current2026 = payload.find((p: any) => p.dataKey === 'y2026')?.value as number | null;

  let percentChange2025 = null;
  if (currentIndex > 0 && current2025 !== null && current2025 !== undefined) {
    const previous2025 = data[currentIndex - 1]?.y2025;
    if (previous2025 !== null && previous2025 !== undefined && previous2025 > 0) {
      percentChange2025 = ((current2025 - previous2025) / previous2025 * 100).toFixed(1);
    }
  }

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

// ============================================
// MAIN COMPONENT
// ============================================

export default function DemandChart({ metal = 'gold', deliveryData }: DemandChartProps) {
  const { theme } = useTheme();
  const [selectedMetal, setSelectedMetal] = useState<MetalType>(metal);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const isDark = theme === 'dark';

  // Start with deep-copied baseline data
  const [dailyData, setDailyData] = useState<Record<MetalType, DailyDataPoint[]>>(() => {
    const copy: Record<MetalType, DailyDataPoint[]> = { gold: [], silver: [], aluminum: [], copper: [] };
    for (const m of ['gold', 'silver', 'aluminum', 'copper'] as MetalType[]) {
      copy[m] = baselineDailyData[m].map(d => ({ ...d }));
    }
    return copy;
  });

  const [monthlyData, setMonthlyData] = useState<Record<MetalType, MonthlyDataPoint[]>>(() => {
    const copy: Record<MetalType, MonthlyDataPoint[]> = { gold: [], silver: [], aluminum: [], copper: [] };
    for (const m of ['gold', 'silver', 'aluminum', 'copper'] as MetalType[]) {
      copy[m] = baselineMonthlyData[m].map(d => ({ ...d }));
    }
    return copy;
  });

  // Merge live data from API + delivery.json onto baseline
  useEffect(() => {
    let cancelled = false;

    async function fetchAndMerge() {
      const metals: MetalType[] = ['gold', 'silver', 'aluminum', 'copper'];

      // Start with deep copies of baseline
      const mergedDaily: Record<MetalType, DailyDataPoint[]> = { gold: [], silver: [], aluminum: [], copper: [] };
      const mergedMonthly: Record<MetalType, MonthlyDataPoint[]> = { gold: [], silver: [], aluminum: [], copper: [] };
      for (const m of metals) {
        mergedDaily[m] = baselineDailyData[m].map(d => ({ ...d }));
        mergedMonthly[m] = baselineMonthlyData[m].map(d => ({ ...d }));
      }

      // Step 1: Merge delivery.json (current day) into daily + monthly
      if (deliveryData?.deliveries && deliveryData.parsed_date) {
        for (const delivery of deliveryData.deliveries) {
          const metalKey = delivery.metal.toLowerCase() as MetalType;
          if (!mergedDaily[metalKey]) continue;

          const dateKey = normalizeDate(deliveryData.parsed_date);
          const dayLabel = formatDateLabel(dateKey);

          // Merge into daily: update existing or append
          const existingIdx = mergedDaily[metalKey].findIndex(d => d.dateKey === dateKey);
          if (existingIdx >= 0) {
            mergedDaily[metalKey][existingIdx].contracts = delivery.daily_issued;
          } else {
            mergedDaily[metalKey].push({ day: dayLabel, dateKey, contracts: delivery.daily_issued });
          }

          // Merge into monthly: update current month's y2026
          const parsedDate = new Date(dateKey + 'T12:00:00');
          const monthName = monthIndexToName[parsedDate.getMonth() + 1];
          if (monthName) {
            const monthEntry = mergedMonthly[metalKey].find(d => d.month === monthName);
            if (monthEntry) {
              // Use month_to_date as it's the cumulative total for the month
              const currentVal = monthEntry.y2026;
              if (currentVal === null || delivery.month_to_date > currentVal) {
                monthEntry.y2026 = delivery.month_to_date;
              }
            }
          }
        }
      }

      // Step 2: Fetch from API and merge (API data takes priority)
      try {
        const fetches = metals.flatMap(m => [
          fetch(`/api/delivery/history?metal=${metalDbNames[m]}&days=60&aggregate=daily`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/delivery/history?metal=${metalDbNames[m]}&days=730&aggregate=monthly`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        const results = await Promise.all(fetches);
        if (cancelled) return;

        for (let i = 0; i < metals.length; i++) {
          const m = metals[i];
          const dailyResult = results[i * 2];
          const monthlyResult = results[i * 2 + 1];

          // Merge API daily data
          if (dailyResult?.history?.length > 0) {
            for (const h of dailyResult.history) {
              const dateKey = normalizeDate(String(h.date));
              const dayLabel = formatDateLabel(dateKey);
              const existingIdx = mergedDaily[m].findIndex(d => d.dateKey === dateKey);
              if (existingIdx >= 0) {
                // API overrides baseline for matching dates
                mergedDaily[m][existingIdx].contracts = h.dailyIssued;
              } else {
                // New date from API — add it
                mergedDaily[m].push({ day: dayLabel, dateKey, contracts: h.dailyIssued });
              }
            }
          }

          // Merge API monthly data
          if (monthlyResult?.history?.length > 0) {
            for (const h of monthlyResult.history) {
              const monthName = h.monthName;
              const monthEntry = mergedMonthly[m].find(d => d.month === monthName);
              if (monthEntry) {
                if (h.year === 2026) {
                  const currentVal = monthEntry.y2026;
                  if (currentVal === null || h.total > currentVal) {
                    monthEntry.y2026 = h.total;
                  }
                } else if (h.year === 2025) {
                  // API 2025 data overrides baseline if available
                  monthEntry.y2025 = h.total;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch delivery history from API:', err);
      }

      if (cancelled) return;

      // Filter out invalid entries, sort by dateKey, keep last 15 days
      for (const m of metals) {
        mergedDaily[m] = mergedDaily[m]
          .filter(d => d.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(d.dateKey) && d.day && !d.day.includes('Invalid'))
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        // Keep only the last 15 trading days for a clean chart
        if (mergedDaily[m].length > 15) {
          mergedDaily[m] = mergedDaily[m].slice(-15);
        }
      }

      setDailyData(mergedDaily);
      setMonthlyData(mergedMonthly);
    }

    fetchAndMerge();
    return () => { cancelled = true; };
  }, [deliveryData]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isDaily = timeRange === 'daily';
  const currentDailyData = dailyData[selectedMetal];
  const currentMonthlyData = monthlyData[selectedMetal];
  const data = isDaily ? currentDailyData : currentMonthlyData;

  // Daily stats
  const latestDay = currentDailyData[currentDailyData.length - 1];
  const last5Days = currentDailyData.slice(-5);
  const avgDaily = last5Days.length > 0
    ? Math.round(last5Days.reduce((sum, d) => sum + d.contracts, 0) / last5Days.length)
    : 0;

  // Find the current month's MTD from monthly data or delivery.json
  let currentMTD = 0;
  if (deliveryData?.deliveries) {
    const delivery = deliveryData.deliveries.find(
      d => d.metal.toLowerCase() === selectedMetal
    );
    if (delivery) currentMTD = delivery.month_to_date;
  }
  // Fallback: sum last few daily if no MTD
  if (currentMTD === 0 && latestDay) {
    // Use sum of recent days in current month
    const latestMonth = latestDay.dateKey.substring(0, 7);
    currentMTD = currentDailyData
      .filter(d => d.dateKey.startsWith(latestMonth))
      .reduce((sum, d) => sum + d.contracts, 0);
  }

  const todayContracts = latestDay?.contracts ?? 0;

  // Monthly stats
  const stats2025 = baselineMonthlyStats[selectedMetal];
  // Find the latest month with 2026 data
  const latestMonthWith2026 = [...currentMonthlyData].reverse().find(d => d.y2026 !== null && d.y2026 > 0);
  const currentMonthName = latestMonthWith2026?.month ?? 'Feb';
  const current2026MTD = latestMonthWith2026?.y2026 ?? 0;
  const previous2025SameMonth = stats2025.previous2025[currentMonthName] ?? 0;

  // Change percentage
  const dailyChangePercent = avgDaily > 0
    ? ((todayContracts - avgDaily) / avgDaily * 100).toFixed(0)
    : '0';
  const monthlyChangePercent = previous2025SameMonth > 0
    ? ((current2026MTD - previous2025SameMonth) / previous2025SameMonth * 100).toFixed(0)
    : '0';

  const changePercent = isDaily ? dailyChangePercent : monthlyChangePercent;
  const isPositive = Number(changePercent) >= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Metal Tabs - Scrollable on mobile */}
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
        <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
          {isDaily ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Daily Deliveries</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-muted-foreground/30" />
                <span className="text-muted-foreground">2025</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-emerald-500" />
                <span className="text-muted-foreground">2026</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Panel - Updates based on selected metal and time range */}
      <div className="grid grid-cols-3 lg:grid-cols-1 lg:flex lg:flex-col lg:justify-between gap-4 p-4 sm:p-6 lg:h-[26rem] bg-slate-50/50 dark:bg-slate-900/30 lg:bg-transparent">
        {isDaily ? (
          <>
            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">MTD Total</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{currentMTD.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">contracts</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">Today</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{todayContracts.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">contracts</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">Change</p>
              <p className={`text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">vs 5-day avg</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">2025 Total</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{stats2025.total2025.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">delivered</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{currentMonthName} 2026</p>
              <p className="text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight">{current2026MTD.toLocaleString()}</p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">MTD</p>
            </div>

            <div className="hidden lg:block border-t border-dashed border-slate-300 dark:border-slate-700" />

            <div className="space-y-1 sm:space-y-2 text-center lg:text-left">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">YoY Change</p>
              <p className={`text-xl sm:text-2xl lg:text-4xl font-bold tabular-nums tracking-tight ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{changePercent}%
              </p>
              <p className="text-[10px] sm:text-sm text-muted-foreground font-medium hidden sm:block">vs {currentMonthName} 2025</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
