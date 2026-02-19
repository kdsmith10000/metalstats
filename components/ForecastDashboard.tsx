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
  ChevronDown,
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

function SignalDropdown({ label, score, details, colors, barColor, direction }: {
  label: string;
  score: number;
  details: string;
  colors: string;
  barColor: string;
  direction: string;
}) {
  const [open, setOpen] = useState(false);
  const roundedScore = Math.round(score);

  const signalDescriptions: Record<string, string> = {
    'Trend Momentum': 'Measures price trend strength using moving averages (SMA5/SMA20), MACD crossovers, RSI momentum, and rate of change. Scores above 60 indicate bullish trend alignment; below 40 signals bearish pressure.',
    'Physical Stress': 'Tracks physical market tightness: inventory drawdowns, delivery acceleration, paper-to-physical ratios, coverage erosion, and eligible-to-registered flow shifts. Higher scores signal supply stress.',
    'Arima Model': 'Statistical time-series forecast using Auto-ARIMA. Projects price direction over 5-day and 20-day windows with confidence intervals. Score reflects projected percentage change direction.',
    'Market Activity': 'Evaluates trading volume relative to historical averages and open interest expansion/contraction. Elevated volume with rising OI suggests strong conviction; divergences may signal reversals.',
  };

  const desc = signalDescriptions[label] || '';

  return (
    <div className={`border-l-2 border-b border-r overflow-hidden transition-all ${colors}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">{label}</span>
            <span className={`text-[9px] sm:text-[10px] font-black uppercase px-1 sm:px-1.5 py-0.5 ${
              direction === 'bullish' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : direction === 'bearish' ? 'bg-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-slate-500/20 text-slate-500 dark:text-slate-400'
            }`}>{direction}</span>
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 sm:h-1.5 bg-black/5 dark:bg-white/5 overflow-hidden">
              <div className={`h-full transition-all duration-700 ${barColor}`} style={{ width: `${roundedScore}%` }} />
            </div>
            <span className="text-xs sm:text-sm font-black tabular-nums w-7 sm:w-8 text-right">{roundedScore}</span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 sm:px-4 pb-2.5 sm:pb-3 space-y-1.5 sm:space-y-2 border-t border-current/10 ml-3 sm:ml-5">
          {desc && (
            <p className="text-[10px] sm:text-[11px] leading-relaxed opacity-70 pt-1.5 sm:pt-2">{desc}</p>
          )}
          <div className="flex items-start gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
            <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
            <p className="text-[11px] sm:text-xs font-semibold leading-relaxed">{details || 'No details available'}</p>
          </div>
        </div>
      )}
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

          {/* Signals + Squeeze + Drivers — consolidated */}
          <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl space-y-5">
            {/* Signal pills */}
            <div className="pl-2 sm:pl-8">
              <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-2 sm:mb-3 pl-6 sm:pl-14">
                Signals
              </h3>
              <div className="space-y-0 divide-y divide-slate-200/50 dark:divide-white/5">
                {Object.entries(detail.signals).map(([key, signal]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  const direction = signal.score >= 60 ? 'bullish' : signal.score <= 40 ? 'bearish' : 'neutral';
                  const colors = direction === 'bullish'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                    : direction === 'bearish'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50';
                  const barColor = direction === 'bullish'
                    ? 'bg-emerald-500'
                    : direction === 'bearish'
                    ? 'bg-red-500'
                    : 'bg-slate-400 dark:bg-slate-500';
                  return (
                    <SignalDropdown key={key} label={label} score={signal.score} details={signal.details} colors={colors} barColor={barColor} direction={direction} />
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confidence</span>
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${detail.confidence}%`,
                      backgroundColor: detail.confidence >= 60 ? '#10b981' : detail.confidence >= 30 ? '#f59e0b' : '#94a3b8',
                    }}
                  />
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-white">{detail.confidence}%</span>
              </div>
            </div>

            {/* Squeeze + Drivers — single line */}
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              {(detail.squeeze_probability > 0 || Object.keys(detail.physical_signals).length > 0) && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                  detail.squeeze_probability > 60
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40'
                    : detail.squeeze_probability > 30
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50'
                }`}>
                  <Gauge className="w-3 h-3" />
                  Squeeze {detail.squeeze_probability > 60 ? 'HIGH' : detail.squeeze_probability > 30 ? 'MED' : 'LOW'} {detail.squeeze_probability}%
                </span>
              )}
              {detail.key_drivers.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {detail.key_drivers.join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
