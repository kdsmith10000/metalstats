'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from 'next-themes';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  BarChart3,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Target,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ForecastRange {
  low: number;
  mid: number;
  high: number;
  pct_change: number;
}

interface SignalScore {
  score: number;
  details: string;
}

interface Anomaly {
  metric: string;
  z_score: number;
  description: string;
}

interface CorrelationResult {
  pearson: number;
  pearson_pvalue: number;
  spearman?: number;
  spearman_pvalue?: number;
  n_observations: number;
}

interface PhysicalSignal {
  z_score?: number;
  change_5d?: number;
  interpretation?: string;
  current_daily?: number;
  avg_20d?: number;
  acceleration_ratio?: number;
  current_ratio?: number;
  roc_5d_pct?: number;
  squeeze_score?: number;
  coverage_days?: number;
  avg_daily_delivery?: number;
  registered_change_5d?: number;
  eligible_change_5d?: number;
}

interface MetalForecast {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  composite_score: number;
  current_price: number;
  forecast_5d: ForecastRange | null;
  forecast_20d: ForecastRange | null;
  squeeze_probability: number;
  regime: string;
  signals: Record<string, SignalScore>;
  key_drivers: string[];
  anomalies: Anomaly[];
  correlations: Record<string, CorrelationResult>;
  trend_indicators: Record<string, number | boolean>;
  physical_signals: Record<string, PhysicalSignal>;
  market_metrics: Record<string, number>;
  error?: string;
}

interface ForecastData {
  generated_at: string;
  model_version: string;
  metals: Record<string, MetalForecast>;
}

// ── Metal config for colors ──────────────────────────────────────────────────

const METAL_COLORS: Record<string, { primary: string; light: string }> = {
  Gold:      { primary: '#fbbf24', light: '#fef3c7' },
  Silver:    { primary: '#94a3b8', light: '#e2e8f0' },
  Copper:    { primary: '#f97316', light: '#ffedd5' },
  Platinum:  { primary: '#a78bfa', light: '#ede9fe' },
  Palladium: { primary: '#818cf8', light: '#e0e7ff' },
};

const METAL_SYMBOLS: Record<string, string> = {
  Gold: 'GC',
  Silver: 'SI',
  Copper: 'HG',
  Platinum: 'PL',
  Palladium: 'PA',
};

interface AccuracyRecord {
  metal: string;
  date: string;
  direction: string;
  price_at_forecast: number;
  correct: boolean | null;
}

interface AccuracyData {
  metals: Record<string, {
    total_forecasts: number;
    correct: number;
    incorrect: number;
    pending: number;
    hit_rate: number | null;
  }>;
  overall: {
    total: number;
    correct: number;
    hit_rate: number | null;
  };
  history: AccuracyRecord[];
}

// ── Sparkline component ──────────────────────────────────────────────────────

function Sparkline({ data, color, positive }: { data: number[]; color: string; positive: boolean }) {
  if (data.length < 2) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = (max - min) * 0.1 || 1;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[min - pad, max + pad]} hide />
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Helper components ────────────────────────────────────────────────────────

function DirectionBadge({ direction, confidence }: { direction: string; confidence: number }) {
  const config = {
    BULLISH:  { icon: TrendingUp,   bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
    BEARISH:  { icon: TrendingDown,  bg: 'bg-red-500/10 dark:bg-red-500/20',      text: 'text-red-600 dark:text-red-400',      border: 'border-red-500/30' },
    NEUTRAL:  { icon: Minus,         bg: 'bg-slate-500/10 dark:bg-slate-500/20',   text: 'text-slate-600 dark:text-slate-400',  border: 'border-slate-500/30' },
  }[direction] || { icon: Minus, bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/30' };

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border}`}>
      <Icon className={`w-4 h-4 ${config.text}`} />
      <span className={`text-sm font-bold tracking-wide ${config.text}`}>{direction}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{confidence}%</span>
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const getColor = () => {
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confidence</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SignalBar({ label, score, color }: { label: string; score: number; color: string }) {
  const bgColor = score > 60 ? 'bg-emerald-500' : score < 40 ? 'bg-red-500' : 'bg-amber-500';
  const direction = score > 55 ? 'Bullish' : score < 45 ? 'Bearish' : 'Neutral';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{score.toFixed(0)} <span className="font-normal text-slate-400">({direction})</span></span>
      </div>
      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        {/* Center line at 50 */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-slate-400/50 z-10" />
        <div
          className={`absolute h-full ${bgColor} rounded-full transition-all duration-700 ease-out`}
          style={{
            left: score >= 50 ? '50%' : `${score}%`,
            width: score >= 50 ? `${score - 50}%` : `${50 - score}%`,
          }}
        />
      </div>
    </div>
  );
}

function SqueezeGauge({ probability }: { probability: number }) {
  const getColor = () => {
    if (probability >= 70) return 'from-red-500 to-red-400';
    if (probability >= 40) return 'from-amber-500 to-amber-400';
    return 'from-emerald-500 to-emerald-400';
  };

  const getLabel = () => {
    if (probability >= 70) return 'HIGH';
    if (probability >= 40) return 'MODERATE';
    return 'LOW';
  };

  const getTextColor = () => {
    if (probability >= 70) return 'text-red-500 dark:text-red-400';
    if (probability >= 40) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-500 dark:text-emerald-400';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Squeeze Risk</span>
        <span className={`text-sm font-bold ${getTextColor()}`}>{getLabel()}</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function PriceProjectionChart({ currentPrice, forecast5d, forecast20d, metalColor }: {
  currentPrice: number;
  forecast5d: ForecastRange | null;
  forecast20d: ForecastRange | null;
  metalColor: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!forecast5d && !forecast20d) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        <Info className="w-4 h-4 mr-2" />
        Insufficient data for ARIMA price projections (need 30+ days)
      </div>
    );
  }

  const data = [
    { name: 'Now', mid: currentPrice, low: currentPrice, high: currentPrice },
  ];
  if (forecast5d) {
    data.push({ name: '5-Day', mid: forecast5d.mid, low: forecast5d.low, high: forecast5d.high });
  }
  if (forecast20d) {
    data.push({ name: '20-Day', mid: forecast20d.mid, low: forecast20d.low, high: forecast20d.high });
  }

  const allValues = data.flatMap(d => [d.low, d.high]);
  const minVal = Math.min(...allValues) * 0.995;
  const maxVal = Math.max(...allValues) * 1.005;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[minVal, maxVal]}
          tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const values: Record<string, number> = {};
            for (const entry of payload) {
              if (entry.dataKey && entry.value != null) {
                values[entry.dataKey as string] = Number(entry.value);
              }
            }
            const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return (
              <div
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: '6px' }}>
                  {label}
                </p>
                {values.mid != null && (
                  <p style={{ fontSize: '13px', fontWeight: 800, color: metalColor, margin: '2px 0' }}>
                    Mid: {fmt(values.mid)}
                  </p>
                )}
                {values.high != null && (
                  <p style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#475569', margin: '2px 0' }}>
                    High: {fmt(values.high)}
                  </p>
                )}
                {values.low != null && (
                  <p style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#475569', margin: '2px 0' }}>
                    Low: {fmt(values.low)}
                  </p>
                )}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="high"
          stroke="transparent"
          fill={metalColor}
          fillOpacity={0.1}
        />
        <Area
          type="monotone"
          dataKey="low"
          stroke="transparent"
          fill={isDark ? '#0f172a' : '#ffffff'}
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="mid"
          stroke={metalColor}
          strokeWidth={2}
          fill="transparent"
          dot={{ r: 4, fill: metalColor, stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface LivePrice {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  marketState: string;
}

export default function ForecastDashboard() {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice | null>>({});
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({});
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetal, setSelectedMetal] = useState<string | null>(null);

  // Fetch forecast data
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch('/api/forecast');
        if (!response.ok) throw new Error('Forecast data not available');
        const result = await response.json();
        if (result.success && result.data) {
          setForecastData(result.data);
        } else {
          throw new Error(result.error || 'Invalid forecast data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forecast');
      } finally {
        setIsLoading(false);
      }
    };
    fetchForecast();
  }, []);

  // Fetch live prices and refresh every 60s
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.prices) {
          setLivePrices(data.prices);

          // Record live prices to DB for tracking (fire-and-forget)
          const priceMap: Record<string, number> = {};
          for (const [metal, p] of Object.entries(data.prices)) {
            if (p && (p as LivePrice).price) priceMap[metal] = (p as LivePrice).price;
          }
          if (Object.keys(priceMap).length > 0) {
            fetch('/api/forecast/tracking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prices: priceMap }),
            }).catch(() => { /* ignore */ });
          }
        }
      } catch {
        // Silently fall back to forecast prices
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch sparkline data (30-day price history per metal)
  useEffect(() => {
    const fetchSparklines = async () => {
      const results: Record<string, number[]> = {};
      await Promise.all(
        Object.entries(METAL_SYMBOLS).map(async ([metal, symbol]) => {
          try {
            const res = await fetch(`/api/bulletin/history?symbol=${symbol}&days=30`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.history && data.history.length > 0) {
              results[metal] = data.history.map((h: { settle: number }) => h.settle).filter((v: number) => v > 0);
            }
          } catch {
            // Skip this metal
          }
        })
      );
      setSparklineData(results);
    };
    fetchSparklines();
  }, []);

  // Fetch accuracy data
  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const res = await fetch('/api/forecast/accuracy');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setAccuracyData(data.data);
        }
      } catch {
        // Accuracy data is optional
      }
    };
    fetchAccuracy();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !forecastData) {
    return (
      <div className="p-8 text-center bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-sm text-slate-500">{error || 'Forecast data unavailable'}</p>
        <p className="text-xs text-slate-400 mt-1">Run forecast.py to generate predictions</p>
      </div>
    );
  }

  const metals = forecastData.metals;
  const metalNames = Object.keys(metals);
  const detail = selectedMetal ? metals[selectedMetal] : null;
  const detailColor = selectedMetal ? METAL_COLORS[selectedMetal] : null;

  // Signal bar chart data for the overview
  const overviewData = metalNames.map(name => ({
    name,
    score: metals[name].composite_score,
    direction: metals[name].direction,
  }));

  return (
    <div className="space-y-8">
      {/* Header with generation info */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              v{forecastData.model_version}
            </span>
          </div>
        </div>
        <div className="text-right space-y-1">
          {Object.keys(livePrices).length > 0 && (
            <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live spot prices · refreshes every 60s
            </p>
          )}
          <p className="text-[10px] font-medium text-slate-400/70 uppercase tracking-wider">
            Prices reflect spot market via physical ETFs, not COMEX futures
          </p>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Forecast generated {(() => {
              const d = new Date(forecastData.generated_at);
              const month = d.toLocaleString('en-US', { month: 'long' });
              const day = d.getDate();
              const suffix = [11,12,13].includes(day) ? 'th' : ['st','nd','rd'][(day % 10) - 1] || 'th';
              const year = d.getFullYear();
              const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
              return `${month} ${day}${suffix}, ${year}, ${time}`;
            })()}
          </p>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metalNames.map(name => {
          const fc = metals[name];
          const color = METAL_COLORS[name]?.primary || '#94a3b8';
          const isSelected = selectedMetal === name;

          return (
            <button
              key={name}
              onClick={() => setSelectedMetal(isSelected ? null : name)}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-lg scale-[1.02]'
                  : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
              } backdrop-blur-xl`}
            >
              {/* Metal name and price */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{name}</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {fc.regime !== 'UNKNOWN' ? fc.regime : ''}
                </span>
              </div>

              {/* Current price (live or fallback to forecast) */}
              {(() => {
                const live = livePrices[name];
                const price = live?.price ?? fc.current_price;
                const isLive = !!live?.price;
                return (
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {isLive && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Live spot price" />
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Spot</span>
                        </>
                      )}
                    </div>
                    {live && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs font-bold ${live.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {live.change >= 0 ? '+' : ''}{live.change.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-semibold ${live.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ({live.changePercent >= 0 ? '+' : ''}{live.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Sparkline */}
              {sparklineData[name] && sparklineData[name].length >= 2 && (
                <div className="mb-2 -mx-1">
                  <Sparkline
                    data={sparklineData[name]}
                    color={color}
                    positive={sparklineData[name][sparklineData[name].length - 1] >= sparklineData[name][0]}
                  />
                </div>
              )}

              {/* Changed since forecast */}
              {(() => {
                const live = livePrices[name];
                if (!live?.price || !fc.current_price) return null;
                const diff = live.price - fc.current_price;
                const pct = (diff / fc.current_price) * 100;
                if (Math.abs(pct) < 0.01) return null;
                const correct =
                  (fc.direction === 'BULLISH' && diff > 0) ||
                  (fc.direction === 'BEARISH' && diff < 0);
                const wrong =
                  (fc.direction === 'BULLISH' && diff < 0) ||
                  (fc.direction === 'BEARISH' && diff > 0);
                return (
                  <div className={`mb-2 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                    correct ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    wrong ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    'bg-slate-500/10 text-slate-500'
                  }`}>
                    Since forecast: {diff >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    {correct && ' — tracking'}
                    {wrong && ' — diverging'}
                  </div>
                );
              })()}

              {/* Direction badge */}
              <div className="mb-3">
                <DirectionBadge direction={fc.direction} confidence={fc.confidence} />
              </div>

              {/* Composite score bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>BEARISH</span>
                  <span>BULLISH</span>
                </div>
                <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-slate-400/50 z-10" />
                  <div
                    className="absolute h-full rounded-full transition-all duration-700"
                    style={{
                      left: fc.composite_score >= 50 ? '50%' : `${fc.composite_score}%`,
                      width: fc.composite_score >= 50 ? `${fc.composite_score - 50}%` : `${50 - fc.composite_score}%`,
                      backgroundColor: fc.composite_score >= 60 ? '#10b981' : fc.composite_score <= 40 ? '#ef4444' : '#f59e0b',
                    }}
                  />
                </div>
              </div>

              {/* Squeeze indicator */}
              {fc.squeeze_probability > 40 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                    Squeeze Risk {fc.squeeze_probability}%
                  </span>
                </div>
              )}

              {/* Anomaly indicator */}
              {fc.anomalies.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                    {fc.anomalies.length} anomal{fc.anomalies.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Composite Score Overview Bar Chart */}
      <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Directional Composite Scores
        </h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={overviewData} layout="vertical" margin={{ left: 70, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${Number(value).toFixed(1)}`, 'Composite Score']}
              contentStyle={{
                borderRadius: '8px',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: '#1e293b', fontWeight: 700, fontSize: '12px' }}
              itemStyle={{ color: '#475569', fontWeight: 600 }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
              {overviewData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.score >= 60 ? '#10b981' : entry.score <= 40 ? '#ef4444' : '#f59e0b'}
                />
              ))}
            </Bar>
            {/* Center line at 50 */}
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium px-[70px]">
          <span>BEARISH</span>
          <span>NEUTRAL</span>
          <span>BULLISH</span>
        </div>
      </div>

      {/* Forecast Accuracy */}
      {accuracyData && accuracyData.overall.total > 0 && (
        <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Forecast Accuracy — Last {accuracyData.overall.total} Forecasts
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Overall */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center col-span-2 sm:col-span-3 lg:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Overall</p>
              <p className={`text-2xl font-black ${
                (accuracyData.overall.hit_rate ?? 0) >= 60 ? 'text-emerald-500' :
                (accuracyData.overall.hit_rate ?? 0) >= 45 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {accuracyData.overall.hit_rate !== null ? `${accuracyData.overall.hit_rate}%` : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {accuracyData.overall.correct}/{accuracyData.overall.total} correct
              </p>
            </div>
            {/* Per metal */}
            {Object.entries(accuracyData.metals).map(([metal, acc]) => {
              const color = METAL_COLORS[metal]?.primary || '#94a3b8';
              return (
                <div key={metal} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{metal}</p>
                  </div>
                  <p className={`text-lg font-black ${
                    (acc.hit_rate ?? 0) >= 60 ? 'text-emerald-500' :
                    (acc.hit_rate ?? 0) >= 45 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {acc.hit_rate !== null ? `${acc.hit_rate}%` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {acc.correct}/{acc.total_forecasts}
                    {acc.pending > 0 && ` (+${acc.pending} pending)`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel (when metal selected) */}
      {detail && selectedMetal && detailColor && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Price Projection + Signals */}
          <div className="space-y-6">
            {/* Price Projection Chart */}
            <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  Price Projection — {selectedMetal}
                </h3>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  Spot prices
                </span>
              </div>
              <PriceProjectionChart
                currentPrice={livePrices[selectedMetal]?.price ?? detail.current_price}
                forecast5d={detail.forecast_5d}
                forecast20d={detail.forecast_20d}
                metalColor={detailColor.primary}
              />
              {detail.forecast_5d && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">5-Day Range</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      ${detail.forecast_5d.low.toLocaleString()} — ${detail.forecast_5d.high.toLocaleString()}
                    </p>
                    <p className={`text-xs font-bold mt-0.5 ${detail.forecast_5d.pct_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {detail.forecast_5d.pct_change >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                      {' '}{detail.forecast_5d.pct_change >= 0 ? '+' : ''}{detail.forecast_5d.pct_change}%
                    </p>
                  </div>
                  {detail.forecast_20d && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">20-Day Range</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        ${detail.forecast_20d.low.toLocaleString()} — ${detail.forecast_20d.high.toLocaleString()}
                      </p>
                      <p className={`text-xs font-bold mt-0.5 ${detail.forecast_20d.pct_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {detail.forecast_20d.pct_change >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                        {' '}{detail.forecast_20d.pct_change >= 0 ? '+' : ''}{detail.forecast_20d.pct_change}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Signal Breakdown */}
            <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4">
                Signal Breakdown
              </h3>
              <div className="space-y-4">
                {Object.entries(detail.signals).map(([key, signal]) => (
                  <div key={key}>
                    <SignalBar
                      label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      score={signal.score}
                      color={detailColor.primary}
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5 pl-0.5">{signal.details}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <ConfidenceMeter value={detail.confidence} />
              </div>
            </div>
          </div>

          {/* Right: Squeeze + Physical + Anomalies + Correlations */}
          <div className="space-y-6">
            {/* Squeeze Probability */}
            <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Squeeze Analysis
              </h3>
              <SqueezeGauge probability={detail.squeeze_probability} />
              {detail.physical_signals.pp_squeeze && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Paper/Physical</p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {detail.physical_signals.pp_squeeze.current_ratio?.toFixed(1)}:1
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">5d Change</p>
                      <p className={`font-bold ${(detail.physical_signals.pp_squeeze.roc_5d_pct ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {(detail.physical_signals.pp_squeeze.roc_5d_pct ?? 0) > 0 ? '+' : ''}
                        {detail.physical_signals.pp_squeeze.roc_5d_pct?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Physical Market Signals */}
            <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-4">
                Physical Market Signals
              </h3>
              <div className="space-y-3">
                {detail.physical_signals.inventory_drawdown && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Inventory Z-Score</span>
                    <span className={`text-xs font-bold ${
                      (detail.physical_signals.inventory_drawdown.z_score ?? 0) < -1.5 ? 'text-red-500' : 
                      (detail.physical_signals.inventory_drawdown.z_score ?? 0) > 1.5 ? 'text-emerald-500' : 'text-slate-500'
                    }`}>
                      {detail.physical_signals.inventory_drawdown.z_score?.toFixed(2)} — {detail.physical_signals.inventory_drawdown.interpretation}
                    </span>
                  </div>
                )}
                {detail.physical_signals.delivery_acceleration && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Delivery Pace</span>
                    <span className={`text-xs font-bold ${
                      (detail.physical_signals.delivery_acceleration.acceleration_ratio ?? 1) > 1.2 ? 'text-red-500' : 'text-slate-500'
                    }`}>
                      {detail.physical_signals.delivery_acceleration.acceleration_ratio?.toFixed(2)}x avg — {detail.physical_signals.delivery_acceleration.interpretation}
                    </span>
                  </div>
                )}
                {detail.physical_signals.coverage_erosion && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Coverage Days</span>
                    <span className={`text-xs font-bold ${
                      (detail.physical_signals.coverage_erosion.coverage_days ?? 999) < 90 ? 'text-red-500' : 
                      (detail.physical_signals.coverage_erosion.coverage_days ?? 999) < 365 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {detail.physical_signals.coverage_erosion.coverage_days?.toFixed(0)} days — {detail.physical_signals.coverage_erosion.interpretation}
                    </span>
                  </div>
                )}
                {detail.physical_signals.eligible_flow && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Eligible/Reg Flow</span>
                    <span className="text-xs font-bold text-slate-500">
                      {detail.physical_signals.eligible_flow.interpretation}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Drivers */}
            <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-3">
                Key Drivers
              </h3>
              <ul className="space-y-2">
                {detail.key_drivers.map((driver, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                    {driver}
                  </li>
                ))}
              </ul>
            </div>

            {/* Anomalies */}
            {detail.anomalies.length > 0 && (
              <div className="p-6 bg-red-50/50 dark:bg-red-950/20 backdrop-blur-xl border border-red-200/50 dark:border-red-800/30 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-500 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Anomalies Detected
                </h3>
                <ul className="space-y-2">
                  {detail.anomalies.map((anomaly, i) => (
                    <li key={i} className="text-xs text-red-700 dark:text-red-300">
                      <span className="font-bold">z={anomaly.z_score.toFixed(1)}</span> — {anomaly.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Correlations */}
            {Object.keys(detail.correlations).length > 0 && (
              <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-3">
                  Statistical Correlations
                </h3>
                <div className="space-y-2">
                  {Object.entries(detail.correlations).map(([key, corr]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const significant = corr.pearson_pvalue < 0.05;
                    return (
                      <div key={key} className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700/50 last:border-0">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 max-w-[60%]">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${
                            significant ? (corr.pearson > 0 ? 'text-emerald-500' : 'text-red-500') : 'text-slate-400'
                          }`}>
                            r={corr.pearson.toFixed(3)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            significant ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {significant ? 'SIG' : 'NS'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">SIG = p {'<'} 0.05, NS = not significant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-700/30 rounded-xl">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          <span className="font-bold">DISCLAIMER:</span> These forecasts are statistical projections based on COMEX physical market data and time-series models.
          They do not constitute financial advice or investment recommendations. All models carry inherent uncertainty — confidence
          intervals and signal agreement metrics are provided for transparency. Past correlations do not guarantee future results.
        </p>
      </div>
    </div>
  );
}
