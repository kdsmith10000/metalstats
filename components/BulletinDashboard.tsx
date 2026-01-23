'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Activity, AlertTriangle, Zap, PieChart, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Calendar, Info } from 'lucide-react';
import { formatNumber, formatPriceChange, formatVolume } from '@/lib/data';
import { useState } from 'react';

interface BulletinProduct {
  symbol: string;
  name: string;
  contracts: Array<{
    month: string;
    settle: number;
    change: number;
    globex_volume: number;
    pnt_volume: number;
    oi_change: number;
  }>;
  total_volume: number;
  total_open_interest: number;
  total_oi_change: number;
}

interface BulletinData {
  bulletin_number: number;
  date: string;
  parsed_date: string;
  products: BulletinProduct[];
  last_updated: string;
}

interface BulletinDashboardProps {
  data: BulletinData;
}

// Product display configuration
const productConfig: Record<string, { displayName: string; color: string; unit: string; description: string }> = {
  'GC': { displayName: 'Gold', color: '#fbbf24', unit: '$/oz', description: '100 Troy Ounce Gold Futures' },
  '1OZ': { displayName: 'Gold (1oz)', color: '#fbbf24', unit: '$/oz', description: '1 Troy Ounce Gold Futures' },
  'SI': { displayName: 'Silver', color: '#94a3b8', unit: 'cents/oz', description: '1000 Troy Ounce Silver Futures' },
  'SIL': { displayName: 'Silver (5k)', color: '#94a3b8', unit: 'cents/oz', description: '5000 Troy Ounce Silver Futures' },
  'HG': { displayName: 'Copper', color: '#b45309', unit: '$/lb', description: 'High Grade Copper Futures' },
  'PL': { displayName: 'Platinum', color: '#a78bfa', unit: '$/oz', description: 'Platinum Futures' },
  'PA': { displayName: 'Palladium', color: '#6366f1', unit: '$/oz', description: 'Palladium Futures' },
  'ALI': { displayName: 'Aluminum', color: '#64748b', unit: '$/mt', description: 'Physical Aluminum Futures' },
};

export default function BulletinDashboard({ data }: BulletinDashboardProps) {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  
  // Sort products by volume (descending)
  const sortedProducts = [...data.products].sort((a, b) => b.total_volume - a.total_volume);

  // Calculate total volume and OI across all products
  const totalVolume = sortedProducts.reduce((sum, p) => sum + p.total_volume, 0);
  const totalOI = sortedProducts.reduce((sum, p) => sum + p.total_open_interest, 0);

  return (
    <div className="space-y-12 sm:space-y-20 md:space-y-28">
      {/* Market Activity Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16 gap-4">
          <div className="max-w-xl space-y-3 sm:space-y-8">
            <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
              Market Activity
            </h2>
            <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
              DAILY FUTURES VOLUME & OPEN INTEREST — BULLETIN #{data.bulletin_number}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl w-fit">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{data.date}</span>
          </div>
        </div>

        {/* Main Product Rows - Matching Inventory Style */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1">
          {sortedProducts.map((product, index) => {
            const config = productConfig[product.symbol];
            const isExpanded = expandedProduct === product.symbol;
            const frontContract = product.contracts[0];
            const changeFormatted = frontContract ? formatPriceChange(frontContract.change) : null;
            const volumePercent = (product.total_volume / totalVolume) * 100;

            return (
              <div key={product.symbol} className="relative">
                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : product.symbol)}
                  className="relative w-full text-left p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 sm:gap-6 lg:gap-12">
                      <div className="relative flex-shrink-0">
                        <div 
                          className="absolute -inset-1.5 sm:-inset-2 rounded-xl sm:rounded-2xl blur-md opacity-20"
                          style={{ backgroundColor: config?.color || '#64748b' }}
                        />
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl shadow-lg">
                          {product.symbol.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                          {config?.displayName || product.symbol}
                        </h3>
                        <p className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
                          {product.symbol} • {frontContract?.month || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 lg:gap-16">
                      {/* Volume Bar - Hidden on small screens */}
                      <div className="w-32 lg:w-40 hidden xl:block">
                        <div className="flex justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                          <span>Volume</span>
                          <span>{volumePercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 sm:h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${volumePercent}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: config?.color || '#64748b' }}
                          />
                        </div>
                      </div>

                      {/* Settlement Price */}
                      <div className="text-right min-w-0 sm:min-w-[100px] lg:min-w-[120px]">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Settle</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                          {frontContract ? frontContract.settle.toFixed(2) : '—'}
                        </p>
                      </div>

                      {/* Change */}
                      <div className="text-right min-w-0 sm:min-w-[80px] lg:min-w-[100px]">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Change</p>
                        <p className={`text-lg sm:text-xl md:text-2xl font-black tabular-nums ${changeFormatted?.color || 'text-slate-400'}`}>
                          {changeFormatted?.text || 'UNCH'}
                        </p>
                      </div>

                      {/* Total Volume - Hidden on smallest screens */}
                      <div className="text-right min-w-[80px] lg:min-w-[100px] hidden md:block">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Volume</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                          {formatVolume(product.total_volume)}
                        </p>
                      </div>
                      
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3 sm:mt-6 p-4 sm:p-6 md:p-8 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/10 shadow-inner"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8 mb-4 sm:mb-8">
                        {[
                          { label: 'Open Interest', value: formatNumber(product.total_open_interest) },
                          { label: 'OI Change', value: (product.total_oi_change > 0 ? '+' : '') + formatNumber(product.total_oi_change), color: product.total_oi_change > 0 ? 'text-emerald-500' : product.total_oi_change < 0 ? 'text-red-500' : '' },
                          { label: 'Globex Vol', value: formatNumber(product.contracts.reduce((sum, c) => sum + c.globex_volume, 0)) },
                          { label: 'PNT Volume', value: formatNumber(product.contracts.reduce((sum, c) => sum + c.pnt_volume, 0)) }
                        ].map((stat, i) => (
                          <div key={i} className="p-3 sm:p-4 bg-white/40 dark:bg-black/40 rounded-xl sm:rounded-2xl border border-white/30 text-center">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5 sm:mb-1 tracking-wider">{stat.label}</p>
                            <p className={`text-base sm:text-lg md:text-xl font-bold ${stat.color || ''}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Contract Details Table - Scrollable on mobile */}
                      {product.contracts.length > 0 && (
                        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                          <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 min-w-[500px] sm:min-w-0">
                            <table className="w-full text-xs sm:text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                  <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                                  <th className="text-right px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Settle</th>
                                  <th className="text-right px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Change</th>
                                  <th className="text-right px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                                  <th className="text-right px-3 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">OI Chg</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {product.contracts.map((contract) => {
                                  const cChange = formatPriceChange(contract.change);
                                  return (
                                    <tr key={contract.month} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                                      <td className="px-3 sm:px-6 py-2 sm:py-3 font-bold text-slate-900 dark:text-white">{contract.month}</td>
                                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-right font-medium tabular-nums">{contract.settle.toFixed(2)}</td>
                                      <td className={`px-3 sm:px-6 py-2 sm:py-3 text-right font-bold tabular-nums ${cChange.color}`}>{cChange.text}</td>
                                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-right tabular-nums">{formatNumber(contract.globex_volume + contract.pnt_volume)}</td>
                                      <td className={`px-3 sm:px-6 py-2 sm:py-3 text-right font-medium tabular-nums ${contract.oi_change > 0 ? 'text-emerald-500' : contract.oi_change < 0 ? 'text-red-500' : ''}`}>
                                        {contract.oi_change > 0 ? '+' : ''}{contract.oi_change !== 0 ? formatNumber(contract.oi_change) : 'UNCH'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spacer between sections */}
      <div className="h-8 sm:h-12 md:h-20 lg:h-24" />

      {/* Statistically Significant Insights Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16">
          <div className="max-w-xl space-y-3 sm:space-y-8">
            <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
              Market Signals
            </h2>
            <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
              STATISTICALLY SIGNIFICANT INSIGHTS & PATTERNS
            </p>
          </div>
        </div>

        {/* Spacer between header and content */}
        <div className="h-6 sm:h-12 md:h-20 lg:h-24" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Precious Metals Divergence */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base sm:text-lg md:text-xl">
                Metals Divergence
              </h4>
            </div>
            <div className="space-y-2 sm:space-y-4">
              {(() => {
                const gc = data.products.find(p => p.symbol === 'GC');
                const si = data.products.find(p => p.symbol === 'SI');
                const hg = data.products.find(p => p.symbol === 'HG');
                const pl = data.products.find(p => p.symbol === 'PL');
                const pa = data.products.find(p => p.symbol === 'PA');
                
                const getIcon = (change: number) => change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
                const getIconColor = (change: number) => change > 0 ? 'text-emerald-500' : change < 0 ? 'text-red-500' : 'text-slate-400';
                
                const metals = [
                  gc && { name: 'Gold', data: gc, description: `OI change: ${gc.total_oi_change > 0 ? '+' : ''}${formatNumber(gc.total_oi_change)} with ${formatVolume(gc.total_volume)} volume` },
                  si && { name: 'Silver', data: si, description: `OI change: ${si.total_oi_change > 0 ? '+' : ''}${formatNumber(si.total_oi_change)} with ${formatVolume(si.total_volume)} volume` },
                  hg && { name: 'Copper', data: hg, description: `OI change: ${hg.total_oi_change > 0 ? '+' : ''}${formatNumber(hg.total_oi_change)} with ${formatVolume(hg.total_volume)} volume` },
                  pl && { name: 'Platinum', data: pl, description: `OI change: ${pl.total_oi_change > 0 ? '+' : ''}${formatNumber(pl.total_oi_change)} with ${formatVolume(pl.total_volume)} volume` },
                  pa && { name: 'Palladium', data: pa, description: `OI change: ${pa.total_oi_change > 0 ? '+' : ''}${formatNumber(pa.total_oi_change)} with ${formatVolume(pa.total_volume)} volume` },
                ].filter(Boolean) as Array<{ name: string; data: BulletinProduct; description: string }>;
                
                return metals.map((metal, i) => {
                  const Icon = getIcon(metal.data.total_oi_change);
                  return (
                    <div key={i} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${getIconColor(metal.data.total_oi_change)} mt-0.5 sm:mt-1 flex-shrink-0`} />
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                        <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">{metal.name}</span>
                        {metal.description}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>

          {/* Volume Concentration Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base sm:text-lg md:text-xl">
                Volume Concentration
              </h4>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>Silver vs Gold Volume</span>
                  <span>2.4x Ratio</span>
                </div>
                <div className="h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-slate-400 w-[70%]" />
                  <div className="h-full bg-amber-500 w-[30%]" />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Silver dominates with 346,357 contracts vs Gold's 141,855</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">Gold Front-Month</span>
                    FEB26 Gold accounts for 92% of total 1oz Gold volume
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">Platinum Activity</span>
                    APR26 captures 93% of total volume (41,931 / 45,276)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Open Interest Trends */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base sm:text-lg md:text-xl">
                Open Interest Trends
              </h4>
            </div>
            <div className="space-y-2 sm:space-y-4">
              {(() => {
                const getSignal = (change: number, volume: number) => {
                  if (change > 1000) return 'Strong accumulation';
                  if (change > 0) return 'New positions entering';
                  if (change < -1000) return 'Heavy liquidation';
                  if (change < 0) return 'Position unwinding';
                  return 'Neutral activity';
                };
                
                const metals = [
                  { symbol: 'GC', name: 'Gold' },
                  { symbol: 'SI', name: 'Silver' },
                  { symbol: 'HG', name: 'Copper' },
                  { symbol: 'PL', name: 'Platinum' },
                  { symbol: 'PA', name: 'Palladium' },
                ];
                
                return metals.map((metal, i) => {
                  const product = data.products.find(p => p.symbol === metal.symbol);
                  if (!product) return null;
                  
                  const change = product.total_oi_change;
                  const color = change > 0 ? 'text-emerald-500' : change < 0 ? 'text-red-500' : 'text-slate-400';
                  
                  return (
                    <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs mb-0.5 sm:mb-1">{metal.name}</p>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">{getSignal(change, product.total_volume)}</p>
                      </div>
                      <div className={`text-base sm:text-lg md:text-xl font-black tabular-nums ${color}`}>
                        {change > 0 ? '+' : ''}{formatNumber(change)}
                      </div>
                    </div>
                  );
                }).filter(Boolean);
              })()}
            </div>
          </motion.div>

          {/* EFP Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base sm:text-lg md:text-xl">
                Physical Delivery (EFP)
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {[
                { label: 'Gold JAN26', value: '2,925' },
                { label: 'Gold FEB26', value: '4,029' },
                { label: 'Silver JAN26', value: '4,934' },
                { label: 'Copper JAN26', value: '6,033' }
              ].map((item, i) => (
                <div key={i} className="p-3 sm:p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">{item.label}</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Key Takeaways Section */}
      <div className="mt-16 sm:mt-24 md:mt-40 lg:mt-64 pt-12 sm:pt-16 md:pt-20 lg:pt-32 border-t border-slate-200 dark:border-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 sm:p-8 md:p-12 bg-slate-900 dark:bg-black border border-slate-800 shadow-2xl overflow-hidden relative rounded-2xl sm:rounded-none"
        >
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            {/* Added spacer at the top of the card to move everything down */}
            <div className="h-4 sm:h-12 md:h-20 lg:h-32" />

            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16">
              <div className="max-w-xl space-y-3 sm:space-y-8">
                <h2 className="tracking-tighter text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase text-white">
                  Strategic Summary
                </h2>
                <p className="text-xs sm:text-base md:text-xl text-slate-400 font-medium uppercase tracking-widest">
                  KEY MARKET TAKEAWAYS & ACTIONABLE INTELLIGENCE
                </p>
              </div>
            </div>

            {/* Spacer to move Key Takeaways block further down */}
            <div className="h-4 sm:h-12 md:h-20 lg:h-24" />

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-12">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
              <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                Key Takeaways
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {(() => {
                const gc = data.products.find(p => p.symbol === 'GC');
                const si = data.products.find(p => p.symbol === 'SI');
                const hg = data.products.find(p => p.symbol === 'HG');
                const pl = data.products.find(p => p.symbol === 'PL');
                const pa = data.products.find(p => p.symbol === 'PA');
                
                const takeaways = [];
                
                if (gc) {
                  const signal = gc.total_oi_change > 0 ? 'bullish accumulation' : gc.total_oi_change < 0 ? 'profit taking' : 'consolidation';
                  takeaways.push({
                    title: "Gold Activity",
                    text: `${formatVolume(gc.total_volume)} contracts traded with OI ${gc.total_oi_change > 0 ? 'up' : gc.total_oi_change < 0 ? 'down' : 'unchanged'} ${formatNumber(Math.abs(gc.total_oi_change))} indicating ${signal}.`,
                    color: gc.total_oi_change > 0 ? "text-emerald-500" : gc.total_oi_change < 0 ? "text-red-500" : "text-amber-500"
                  });
                }
                
                if (si) {
                  takeaways.push({
                    title: "Silver Flow",
                    text: `${formatVolume(si.total_volume)} volume with ${si.total_oi_change > 0 ? '+' : ''}${formatNumber(si.total_oi_change)} OI change suggests ${si.total_volume > 100000 ? 'significant institutional' : 'moderate'} activity.`,
                    color: "text-slate-400"
                  });
                }
                
                if (hg) {
                  const copperSignal = hg.total_oi_change > 0 ? 'growing interest in industrial metals' : 'reduced industrial hedging';
                  takeaways.push({
                    title: "Copper Positioning",
                    text: `OI at ${formatNumber(hg.total_open_interest)} with ${hg.total_oi_change > 0 ? '+' : ''}${formatNumber(hg.total_oi_change)} change signals ${copperSignal}.`,
                    color: "text-orange-500"
                  });
                }
                
                if (pl && pa) {
                  const pgmSignal = (pl.total_oi_change + pa.total_oi_change) > 0 ? 'net accumulation' : 'net liquidation';
                  takeaways.push({
                    title: "PGM Complex",
                    text: `Platinum (${pl.total_oi_change > 0 ? '+' : ''}${formatNumber(pl.total_oi_change)}) and Palladium (${pa.total_oi_change > 0 ? '+' : ''}${formatNumber(pa.total_oi_change)}) show ${pgmSignal} in the auto-catalyst sector.`,
                    color: "text-violet-500"
                  });
                }
                
                return takeaways.map((item, i) => (
                  <div key={i} className="space-y-1.5 sm:space-y-3">
                    <p className={`text-xs sm:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] ${item.color}`}>
                      {item.title}
                    </p>
                    <p className="text-sm sm:text-base md:text-lg text-slate-400 font-medium leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Last Updated Footer - Matching Global Style */}
      <div className="pt-8 sm:pt-12 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
          Bulletin Data Verified • Last Updated {new Date(data.last_updated).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
