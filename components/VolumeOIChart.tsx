'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
} from 'recharts';
import { useTheme } from 'next-themes';
import { formatVolume } from '@/lib/data';

interface HistoricalDataPoint {
  date: string;
  volume: number;
  openInterest: number;
  settle: number;
  oiChange: number;
}

interface VolumeOIChartProps {
  data: HistoricalDataPoint[];
  symbol: string;
  displayName: string;
  color: string;
}

// Sample data for demo (when no historical data available)
const sampleData: HistoricalDataPoint[] = [
  { date: '2026-01-06', volume: 425000, openInterest: 520000, settle: 4650.50, oiChange: 1200 },
  { date: '2026-01-07', volume: 380000, openInterest: 518500, settle: 4680.25, oiChange: -1500 },
  { date: '2026-01-08', volume: 445000, openInterest: 522000, settle: 4710.00, oiChange: 3500 },
  { date: '2026-01-09', volume: 410000, openInterest: 525000, settle: 4695.75, oiChange: 3000 },
  { date: '2026-01-10', volume: 395000, openInterest: 523000, settle: 4720.50, oiChange: -2000 },
  { date: '2026-01-13', volume: 450000, openInterest: 528000, settle: 4755.00, oiChange: 5000 },
  { date: '2026-01-14', volume: 420000, openInterest: 530000, settle: 4780.25, oiChange: 2000 },
  { date: '2026-01-15', volume: 475000, openInterest: 532000, settle: 4765.50, oiChange: 2000 },
  { date: '2026-01-16', volume: 440000, openInterest: 534000, settle: 4800.00, oiChange: 2000 },
  { date: '2026-01-17', volume: 465000, openInterest: 530000, settle: 4820.75, oiChange: -4000 },
  { date: '2026-01-21', volume: 488000, openInterest: 532000, settle: 4837.50, oiChange: 2000 },
];

export default function VolumeOIChart({ 
  data = sampleData, 
  symbol = 'GC', 
  displayName = 'Gold',
  color = '#fbbf24'
}: Partial<VolumeOIChartProps>) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [metric, setMetric] = useState<'volume' | 'oi' | 'both'>('both');

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const chartData = data.map(d => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  // Calculate statistics
  const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
  const avgOI = data.reduce((sum, d) => sum + d.openInterest, 0) / data.length;
  const latestSettle = data[data.length - 1]?.settle || 0;
  const firstSettle = data[0]?.settle || 0;
  const priceChange = latestSettle - firstSettle;
  const priceChangePercent = firstSettle > 0 ? (priceChange / firstSettle) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {displayName} Volume & Open Interest
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last {data.length} trading days
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {[
            { key: 'both', label: 'Both' },
            { key: 'volume', label: 'Volume' },
            { key: 'oi', label: 'Open Interest' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setMetric(option.key as 'volume' | 'oi' | 'both')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                metric === option.key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Daily Volume</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatVolume(avgVolume)}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Open Interest</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatVolume(avgOI)}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Latest Settle</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">${latestSettle.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Period Change</p>
          <p className={`text-xl font-bold ${priceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id={`volumeGradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatVolume(v)}
              hide={metric === 'oi'}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatVolume(v)}
              hide={metric === 'volume'}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;

                const currentData = payload[0].payload;
                const currentIndex = chartData.findIndex(d => d.date === currentData.date);
                const prevData = currentIndex > 0 ? chartData[currentIndex - 1] : null;
                
                // Calculate percent change from previous bar
                let volChangePercent = null;
                if (prevData && prevData.volume > 0) {
                  volChangePercent = ((currentData.volume - prevData.volume) / prevData.volume * 100).toFixed(1);
                }

                let oiChangePercent = null;
                if (prevData && prevData.openInterest > 0) {
                  oiChangePercent = ((currentData.openInterest - prevData.openInterest) / prevData.openInterest * 100).toFixed(1);
                }

                return (
                  <div
                    style={{
                      backgroundColor: isDark ? 'hsl(240 10% 10%)' : 'hsl(0 0% 100%)',
                      border: `1px solid ${isDark ? 'hsl(240 3.7% 20%)' : 'hsl(240 5.9% 90%)'}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      boxShadow: isDark ? '0 4px 12px rgb(0 0 0 / 0.5)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      minWidth: '200px',
                    }}
                  >
                    <p style={{ 
                      fontWeight: 600, 
                      marginBottom: 8,
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '14px'
                    }}>
                      {currentData.dateLabel}
                    </p>
                    
                    {(metric === 'both' || metric === 'volume') && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{
                          color: isDark ? '#e2e8f0' : '#334155',
                          fontWeight: 500,
                          fontSize: '16px',
                          marginBottom: volChangePercent !== null ? '4px' : 0
                        }}>
                          Contract: {currentData.volume.toLocaleString()}
                        </p>
                        {volChangePercent !== null && (
                          <p style={{
                            color: Number(volChangePercent) >= 0 ? '#10b981' : '#ef4444',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}>
                            {Number(volChangePercent) >= 0 ? '+' : ''}{volChangePercent}% from previous day
                          </p>
                        )}
                      </div>
                    )}

                    {(metric === 'both' || metric === 'oi') && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{
                          color: isDark ? '#e2e8f0' : '#334155',
                          fontWeight: 500,
                          fontSize: '14px',
                          marginBottom: oiChangePercent !== null ? '4px' : 0
                        }}>
                          Open Interest: {currentData.openInterest.toLocaleString()}
                        </p>
                        {oiChangePercent !== null && (
                          <p style={{
                            color: Number(oiChangePercent) >= 0 ? '#10b981' : '#ef4444',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}>
                            {Number(oiChangePercent) >= 0 ? '+' : ''}{oiChangePercent}% from previous day
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div style={{ 
                      paddingTop: '8px', 
                      borderTop: `1px solid ${isDark ? 'hsl(240 3.7% 20%)' : 'hsl(240 5.9% 90%)'}`,
                      marginTop: '4px'
                    }}>
                      <p style={{
                        color: isDark ? '#e2e8f0' : '#334155',
                        fontWeight: 500,
                        fontSize: '14px',
                      }}>
                        Settle: ${currentData.settle.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 20 }}
            />
            
            {(metric === 'both' || metric === 'volume') && (
              <Bar
                yAxisId="left"
                dataKey="volume"
                fill={color}
                name="volume"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
                background={false}
              />
            )}
            
            {(metric === 'both' || metric === 'oi') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="openInterest"
                stroke={isDark ? '#a78bfa' : '#7c3aed'}
                strokeWidth={2}
                dot={false}
                name="openInterest"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        {(metric === 'both' || metric === 'volume') && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-slate-500 dark:text-slate-400">Volume</span>
          </div>
        )}
        {(metric === 'both' || metric === 'oi') && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-violet-500" />
            <span className="text-slate-500 dark:text-slate-400">Open Interest</span>
          </div>
        )}
      </div>
    </div>
  );
}
