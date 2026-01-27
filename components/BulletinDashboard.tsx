'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Activity, AlertTriangle, Zap, PieChart, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Calendar, Info, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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
  '1OZ': { displayName: '1oz Gold', color: '#fbbf24', unit: '$/oz', description: '1 Troy Ounce Gold Futures' },
  'MGC': { displayName: 'Micro Gold', color: '#fbbf24', unit: '$/oz', description: '10 Troy Ounce Gold Futures' },
  'QO': { displayName: 'E-Mini Gold', color: '#fbbf24', unit: '$/oz', description: '50 Troy Ounce Gold Futures' },
  'SI': { displayName: 'Silver', color: '#94a3b8', unit: 'cents/oz', description: '5000 Troy Ounce Silver Futures' },
  'SIL': { displayName: 'Micro Silver', color: '#94a3b8', unit: 'cents/oz', description: '1000 Troy Ounce Silver Futures' },
  'QI': { displayName: 'E-Mini Silver', color: '#94a3b8', unit: 'cents/oz', description: '2500 Troy Ounce Silver Futures' },
  'HG': { displayName: 'Copper', color: '#b45309', unit: '$/lb', description: '25,000 lbs High Grade Copper' },
  'MHG': { displayName: 'Micro Copper', color: '#b45309', unit: '$/lb', description: '2,500 lbs Copper Futures' },
  'PL': { displayName: 'Platinum', color: '#a78bfa', unit: '$/oz', description: '50 Troy Ounce Platinum Futures' },
  'PA': { displayName: 'Palladium', color: '#6366f1', unit: '$/oz', description: '100 Troy Ounce Palladium Futures' },
  'ALI': { displayName: 'Aluminum', color: '#64748b', unit: '$/mt', description: 'Physical Aluminum Futures' },
};

// Sort configuration type
type SortField = 'month' | 'settle' | 'change' | 'volume' | 'oi_change';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Helper to parse month string to sortable value (e.g., "FEB26" -> 202602)
const parseMonth = (month: string): number => {
  const monthMap: Record<string, number> = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
  };
  const monthStr = month.substring(0, 3).toUpperCase();
  const yearStr = month.substring(3);
  const year = 2000 + parseInt(yearStr, 10);
  const monthNum = monthMap[monthStr] || 1;
  return year * 100 + monthNum;
};

export default function BulletinDashboard({ data }: BulletinDashboardProps) {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfig>>({});
  
  // Get sort config for a product, default to month ascending
  const getSortConfig = (symbol: string): SortConfig => {
    return sortConfigs[symbol] || { field: 'month', direction: 'asc' };
  };
  
  // Toggle sort for a product's table
  const toggleSort = (symbol: string, field: SortField) => {
    setSortConfigs(prev => {
      const current = prev[symbol] || { field: 'month', direction: 'asc' };
      let newDirection: SortDirection = 'asc';
      
      if (current.field === field) {
        // Toggle direction if same field
        newDirection = current.direction === 'asc' ? 'desc' : 'asc';
      } else {
        // Default to descending for numeric fields, ascending for month
        newDirection = field === 'month' ? 'asc' : 'desc';
      }
      
      return { ...prev, [symbol]: { field, direction: newDirection } };
    });
  };
  
  // Sort contracts based on config
  const sortContracts = (contracts: BulletinProduct['contracts'], config: SortConfig) => {
    return [...contracts].sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (config.field) {
        case 'month':
          aVal = parseMonth(a.month);
          bVal = parseMonth(b.month);
          break;
        case 'settle':
          aVal = a.settle;
          bVal = b.settle;
          break;
        case 'change':
          aVal = a.change;
          bVal = b.change;
          break;
        case 'volume':
          aVal = a.globex_volume + a.pnt_volume;
          bVal = b.globex_volume + b.pnt_volume;
          break;
        case 'oi_change':
          aVal = a.oi_change;
          bVal = b.oi_change;
          break;
        default:
          return 0;
      }
      
      const diff = aVal - bVal;
      return config.direction === 'asc' ? diff : -diff;
    });
  };
  
  // Sortable header component
  const SortableHeader = ({ symbol, field, label, align = 'right' }: { symbol: string; field: SortField; label: string; align?: 'left' | 'right' }) => {
    const config = getSortConfig(symbol);
    const isActive = config.field === field;
    
    return (
      <th 
        className={`${align === 'left' ? 'text-left' : 'text-right'} px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all duration-200 select-none group`}
        onClick={() => toggleSort(symbol, field)}
      >
        <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span className={`transition-colors ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>{label}</span>
          <span className={`w-4 h-4 flex items-center justify-center rounded transition-all ${isActive ? 'bg-slate-200 dark:bg-slate-700' : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
            {isActive ? (
              config.direction === 'asc' ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
              )
            ) : (
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            )}
          </span>
        </div>
      </th>
    );
  };
  
  // Sort products by volume (descending)
  const sortedProducts = [...data.products].sort((a, b) => b.total_volume - a.total_volume);
  
  // Format the last_updated date for display
  const formatDisplayDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
      return data.date; // Fallback to original date
    }
  };
  
  // Use the bulletin date (when the data was published), not last_updated (when we parsed it)
  const displayDate = data.date || (data.parsed_date ? formatDisplayDate(data.parsed_date) : 'N/A');

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
            <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{displayDate}</span>
          </div>
        </div>

        {/* Main Sortable Products Table - Always Visible */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="overflow-visible rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-black/40 backdrop-blur-xl min-w-[700px] sm:min-w-0">
            <table className="w-full text-sm sm:text-base">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80">
                <tr>
                  <SortableHeader symbol="_products" field="month" label="Product" align="left" />
                  <SortableHeader symbol="_products" field="settle" label="Settle" />
                  <SortableHeader symbol="_products" field="change" label="Change" />
                  <SortableHeader symbol="_products" field="volume" label="Volume" />
                  <th className="text-right px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Open Int</th>
                  <SortableHeader symbol="_products" field="oi_change" label="OI Chg" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(() => {
                  const config = getSortConfig('_products');
                  const sorted = [...sortedProducts].sort((a, b) => {
                    const aFront = a.contracts[0];
                    const bFront = b.contracts[0];
                    let aVal: number, bVal: number;
                    
                    switch (config.field) {
                      case 'month':
                        // Sort by symbol alphabetically
                        return config.direction === 'asc' 
                          ? a.symbol.localeCompare(b.symbol)
                          : b.symbol.localeCompare(a.symbol);
                      case 'settle':
                        aVal = aFront?.settle || 0;
                        bVal = bFront?.settle || 0;
                        break;
                      case 'change':
                        aVal = aFront?.change || 0;
                        bVal = bFront?.change || 0;
                        break;
                      case 'volume':
                        aVal = a.total_volume;
                        bVal = b.total_volume;
                        break;
                      case 'oi_change':
                        aVal = a.total_oi_change;
                        bVal = b.total_oi_change;
                        break;
                      default:
                        return 0;
                    }
                    
                    const diff = aVal - bVal;
                    return config.direction === 'asc' ? diff : -diff;
                  });
                  
                  return sorted.map((product) => {
                    const prodConfig = productConfig[product.symbol];
                    const frontContract = product.contracts[0];
                    const changeFormatted = frontContract ? formatPriceChange(frontContract.change) : null;
                    
                    return (
                      <tr key={product.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div 
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md flex-shrink-0"
                              style={{ backgroundColor: prodConfig?.color || '#64748b' }}
                            >
                              {product.symbol.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{product.symbol}</p>
                              <p className="text-xs text-slate-500 truncate">{prodConfig?.displayName || product.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-bold text-slate-900 dark:text-white tabular-nums text-base sm:text-lg">
                          {frontContract ? frontContract.settle.toFixed(2) : '—'}
                        </td>
                        <td className={`px-3 sm:px-6 py-3 sm:py-4 text-right font-bold tabular-nums text-base sm:text-lg ${changeFormatted?.color || 'text-slate-400'}`}>
                          {changeFormatted?.text || 'UNCH'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                          {formatVolume(product.total_volume)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                          {formatNumber(product.total_open_interest)}
                        </td>
                        <td className={`px-3 sm:px-6 py-3 sm:py-4 text-right font-bold tabular-nums ${product.total_oi_change > 0 ? 'text-emerald-500' : product.total_oi_change < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {product.total_oi_change > 0 ? '+' : ''}{product.total_oi_change !== 0 ? formatNumber(product.total_oi_change) : 'UNCH'}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expandable Product Details */}
        <div className="mt-8 sm:mt-12 grid gap-3 sm:gap-4 md:gap-6 grid-cols-1">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
            Contract Details <span className="text-slate-400 font-medium">(Click to expand)</span>
          </h3>
          {sortedProducts.map((product) => {
            const config = productConfig[product.symbol];
            const isExpanded = expandedProduct === product.symbol;
            const frontContract = product.contracts[0];

            return (
              <div key={product.symbol} className="relative">
                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : product.symbol)}
                  className="relative w-full text-left p-3 sm:p-4 bg-white/50 dark:bg-black/30 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md"
                        style={{ backgroundColor: config?.color || '#64748b' }}
                      >
                        {product.symbol.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {product.symbol} <span className="text-slate-400 font-medium">({config?.displayName || product.name})</span>
                        </p>
                        <p className="text-xs text-slate-500">{product.contracts.length} contracts • Front: {frontContract?.month || 'N/A'}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-2 sm:mt-3 p-3 sm:p-4 md:p-6 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/40 dark:border-white/10 shadow-inner"
                    >
                      {/* Contract Details Table */}
                      {product.contracts.length > 0 && (
                        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                          <div className="overflow-visible rounded-lg border border-slate-200 dark:border-slate-800 min-w-[500px] sm:min-w-0">
                            <table className="w-full text-xs sm:text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                  <SortableHeader symbol={product.symbol} field="month" label="Month" align="left" />
                                  <SortableHeader symbol={product.symbol} field="settle" label="Settle" />
                                  <SortableHeader symbol={product.symbol} field="change" label="Change" />
                                  <SortableHeader symbol={product.symbol} field="volume" label="Volume" />
                                  <SortableHeader symbol={product.symbol} field="oi_change" label="OI Chg" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {sortContracts(product.contracts, getSortConfig(product.symbol)).map((contract) => {
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
          <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm">
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
                  gc && { name: 'Gold', data: gc },
                  si && { name: 'Silver', data: si },
                  hg && { name: 'Copper', data: hg },
                  pl && { name: 'Platinum', data: pl },
                  pa && { name: 'Palladium', data: pa },
                ].filter(Boolean) as Array<{ name: string; data: BulletinProduct }>;
                
                return metals.map((metal, i) => {
                  const Icon = getIcon(metal.data.total_oi_change);
                  const oiChangePercent = metal.data.total_open_interest > 0 
                    ? ((metal.data.total_oi_change / metal.data.total_open_interest) * 100).toFixed(2)
                    : '0.00';
                  const isPositive = metal.data.total_oi_change > 0;
                  const isNegative = metal.data.total_oi_change < 0;
                  return (
                    <div key={i} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${getIconColor(metal.data.total_oi_change)} mt-0.5 sm:mt-1 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                          <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">{metal.name}</span>
                          OI change: {isPositive ? '+' : ''}{formatNumber(metal.data.total_oi_change)} with {formatVolume(metal.data.total_volume)} volume
                        </p>
                      </div>
                      <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs sm:text-sm font-bold tabular-nums ${
                        isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                        isNegative ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {isPositive ? '+' : ''}{oiChangePercent}%
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Volume Concentration Analysis */}
          <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm">
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
          </div>

          {/* Open Interest Trends */}
          <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm">
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
          </div>

          {/* EFP Activity */}
          <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm">
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
          </div>
        </div>
      </div>

      {/* Key Takeaways Section */}
      <div className="mt-16 sm:mt-24 md:mt-40 lg:mt-64 pt-12 sm:pt-16 md:pt-20 lg:pt-32 border-t border-slate-200 dark:border-slate-800">
        <div className="p-4 sm:p-8 md:p-12 bg-slate-900 dark:bg-black border border-slate-800 shadow-2xl overflow-hidden relative rounded-2xl sm:rounded-none">
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
        </div>
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
