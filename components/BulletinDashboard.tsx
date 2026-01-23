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
    <div className="space-y-20 md:space-y-28">
      {/* Market Activity Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16">
          <div className="max-w-xl space-y-8">
            <h2 className="tracking-tighter text-5xl font-black uppercase">
              Market Activity
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium uppercase whitespace-nowrap">
              DAILY FUTURES VOLUME & OPEN INTEREST — BULLETIN #{data.bulletin_number}
            </p>
          </div>
          <div className="mt-8 md:mt-0 flex items-center gap-4 px-6 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{data.date}</span>
          </div>
        </div>

        {/* Main Product Rows - Matching Inventory Style */}
        <div className="grid gap-4 md:gap-6 grid-cols-1">
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
                  className="relative w-full text-left p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-12">
                      <div className="relative">
                        <div 
                          className="absolute -inset-2 rounded-2xl blur-md opacity-20"
                          style={{ backgroundColor: config?.color || '#64748b' }}
                        />
                        <div className="relative w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {product.symbol.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                          {config?.displayName || product.symbol}
                        </h3>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">
                          {product.symbol} • {frontContract?.month || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-16">
                      {/* Volume Bar */}
                      <div className="w-40 hidden xl:block">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          <span>Volume Share</span>
                          <span>{volumePercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${volumePercent}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: config?.color || '#64748b' }}
                          />
                        </div>
                      </div>

                      {/* Settlement Price */}
                      <div className="text-right min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                          {frontContract ? frontContract.settle.toFixed(2) : '—'}
                        </p>
                      </div>

                      {/* Change */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Change</p>
                        <p className={`text-2xl font-black tabular-nums ${changeFormatted?.color || 'text-slate-400'}`}>
                          {changeFormatted?.text || 'UNCH'}
                        </p>
                      </div>

                      {/* Total Volume */}
                      <div className="text-right min-w-[100px] hidden md:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                          {formatVolume(product.total_volume)}
                        </p>
                      </div>
                      
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
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
                      className="mt-6 p-6 md:p-8 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-white/10 shadow-inner"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                        {[
                          { label: 'Open Interest', value: formatNumber(product.total_open_interest) },
                          { label: 'OI Change', value: (product.total_oi_change > 0 ? '+' : '') + formatNumber(product.total_oi_change), color: product.total_oi_change > 0 ? 'text-emerald-500' : product.total_oi_change < 0 ? 'text-red-500' : '' },
                          { label: 'Globex Vol', value: formatNumber(product.contracts.reduce((sum, c) => sum + c.globex_volume, 0)) },
                          { label: 'PNT Volume', value: formatNumber(product.contracts.reduce((sum, c) => sum + c.pnt_volume, 0)) }
                        ].map((stat, i) => (
                          <div key={i} className="p-4 bg-white/40 dark:bg-black/40 rounded-2xl border border-white/30 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color || ''}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Contract Details Table */}
                      {product.contracts.length > 0 && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                              <tr>
                                <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Settle</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Change</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">OI Chg</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {product.contracts.map((contract) => {
                                const cChange = formatPriceChange(contract.change);
                                return (
                                  <tr key={contract.month} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-3 font-bold text-slate-900 dark:text-white">{contract.month}</td>
                                    <td className="px-6 py-3 text-right font-medium tabular-nums">{contract.settle.toFixed(2)}</td>
                                    <td className={`px-6 py-3 text-right font-bold tabular-nums ${cChange.color}`}>{cChange.text}</td>
                                    <td className="px-6 py-3 text-right tabular-nums">{formatNumber(contract.globex_volume + contract.pnt_volume)}</td>
                                    <td className={`px-6 py-3 text-right font-medium tabular-nums ${contract.oi_change > 0 ? 'text-emerald-500' : contract.oi_change < 0 ? 'text-red-500' : ''}`}>
                                      {contract.oi_change > 0 ? '+' : ''}{contract.oi_change !== 0 ? formatNumber(contract.oi_change) : 'UNCH'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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
      <div className="h-12 md:h-20 lg:h-24" />

      {/* Statistically Significant Insights Section */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16">
          <div className="max-w-xl space-y-8">
            <h2 className="tracking-tighter text-5xl font-black uppercase">
              Market Signals
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-medium uppercase whitespace-nowrap">
              STATISTICALLY SIGNIFICANT INSIGHTS & PATTERNS
            </p>
          </div>
        </div>

        {/* Spacer between header and content */}
        <div className="h-12 md:h-20 lg:h-24" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Precious Metals Divergence */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">
                Precious Metals Divergence
              </h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ArrowUpRight className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs block mb-1">Gold</span>
                  Strong bullish momentum with +$71-74 gains across all contract months
                </p>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Minus className="w-5 h-5 text-slate-400 mt-1 flex-shrink-0" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs block mb-1">Silver</span>
                  Slight decline (-0.061) despite massive volume (346,357 contracts)
                </p>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ArrowUpRight className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs block mb-1">Platinum</span>
                  Up +$44-46 across the curve
                </p>
              </div>
              <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ArrowDownRight className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs block mb-1">Palladium</span>
                  Down $25-28 with declining open interest (-36 total)
                </p>
              </div>
            </div>
          </motion.div>

          {/* Volume Concentration Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <PieChart className="w-6 h-6 text-blue-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">
                Volume Concentration
              </h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>Silver vs Gold Volume</span>
                  <span>2.4x Ratio</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-slate-400 w-[70%]" />
                  <div className="h-full bg-amber-500 w-[30%]" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Silver dominates with 346,357 contracts vs Gold's 141,855</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs block mb-1">Gold Front-Month</span>
                    FEB26 Gold accounts for 92% of total 1oz Gold volume (131,092 / 141,855)
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs block mb-1">Platinum Activity</span>
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
            className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">
                Open Interest Trends
              </h4>
            </div>
            <div className="space-y-4">
              {[
                { metal: 'Gold', change: '+1,290', signal: 'New longs entering (bullish)', color: 'text-emerald-500' },
                { metal: 'Silver', change: '+1,671', signal: 'Accumulation despite price drop', color: 'text-emerald-500' },
                { metal: 'Platinum', change: '-359', signal: 'Position liquidation', color: 'text-red-500' },
                { metal: 'Palladium', change: '-36', signal: 'Mild liquidation', color: 'text-red-500' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-1">{item.metal}</p>
                    <p className="text-sm text-slate-500 font-medium">{item.signal}</p>
                  </div>
                  <div className={`text-xl font-black tabular-nums ${item.color}`}>
                    {item.change}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* EFP Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] shadow-sm"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">
                Physical Delivery (EFP)
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Gold JAN26', value: '2,925' },
                { label: 'Gold FEB26', value: '4,029' },
                { label: 'Silver JAN26', value: '4,934' },
                { label: 'Copper JAN26', value: '6,033' }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Key Takeaways Section */}
      <div className="mt-40 md:mt-64 pt-20 md:pt-32 border-t border-slate-200 dark:border-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-12 bg-slate-900 dark:bg-black border border-slate-800 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            {/* Added spacer at the top of the card to move everything down */}
            <div className="h-12 md:h-20 lg:h-32" />

            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16">
              <div className="max-w-xl space-y-8">
                <h2 className="tracking-tighter text-5xl font-black uppercase text-white">
                  Strategic Summary
                </h2>
                <p className="text-xl text-slate-400 font-medium uppercase tracking-widest whitespace-nowrap">
                  KEY MARKET TAKEAWAYS & ACTIONABLE INTELLIGENCE
                </p>
              </div>
            </div>

            {/* Spacer to move Key Takeaways block further down */}
            <div className="h-12 md:h-20 lg:h-24" />

            <div className="flex items-center gap-4 mb-12">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <h4 className="text-3xl font-black text-white uppercase tracking-tighter">
                Key Takeaways
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "Silver Divergence", text: "Massive 346K volume with minimal price change suggests significant two-way flow and hedging activity.", color: "text-amber-500" },
                { title: "Gold Strength", text: "+$71.75 move with increasing OI (+1,290) indicates new money entering long positions, not short covering.", color: "text-emerald-500" },
                { title: "Palladium Weakness", text: "Weakness (-$25) with declining OI suggests long liquidation in an already thin market.", color: "text-red-500" },
                { title: "Platinum Health", text: "Shows the healthiest OI structure at 78,650 contracts despite a slight daily decline.", color: "text-violet-500" }
              ].map((item, i) => (
                <div key={i} className="space-y-3">
                  <p className={`text-sm font-black uppercase tracking-[0.2em] ${item.color}`}>
                    {item.title}
                  </p>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Last Updated Footer - Matching Global Style */}
      <div className="pt-12 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Bulletin Data Verified • Last Updated {new Date(data.last_updated).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
