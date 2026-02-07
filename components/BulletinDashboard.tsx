'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Activity, AlertTriangle, Zap, PieChart, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Calendar, Info, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { formatNumber, formatPriceChange, formatVolume } from '@/lib/data';
import { useState, useEffect } from 'react';

// Previous day OI data from database
interface PreviousDayData {
  [symbol: string]: {
    symbol: string;
    name: string;
    totalVolume: number;
    totalOpenInterest: number;
    totalOiChange: number;
    frontMonth: string;
    frontMonthSettle: number;
    frontMonthChange: number;
  };
}

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

interface VolumeSummaryProduct {
  symbol: string;
  name: string;
  globex_volume: number;
  total_volume: number;
  open_interest: number;
  oi_change: number;
  yoy_volume: number;
  yoy_open_interest: number;
}

interface VolumeSummaryData {
  bulletin_number: number;
  date: string;
  parsed_date: string;
  products: VolumeSummaryProduct[];
  totals: {
    futures_options: {
      globex_volume: number;
      pnt_volume: number;
      volume: number;
      open_interest: number;
      oi_change: number;
      yoy_volume: number;
      yoy_open_interest: number;
    };
  };
  last_updated: string;
}

interface DeliveryItem {
  metal: string;
  symbol: string;
  contract_month: string;
  settlement: number;
  daily_issued: number;
  daily_stopped: number;
  month_to_date: number;
}

interface DeliveryData {
  business_date: string;
  parsed_date: string;
  deliveries: DeliveryItem[];
  last_updated: string;
}

interface BulletinDashboardProps {
  data: BulletinData;
  volumeSummary?: VolumeSummaryData | null;
  deliveryData?: DeliveryData | null;
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

export default function BulletinDashboard({ data, volumeSummary, deliveryData }: BulletinDashboardProps) {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfig>>({});
  const [previousDayData, setPreviousDayData] = useState<PreviousDayData | null>(null);
  const [previousDate, setPreviousDate] = useState<string | null>(null);
  
  // Fetch previous day's OI data from database
  useEffect(() => {
    const fetchPreviousData = async () => {
      try {
        const response = await fetch('/api/bulletin/previous');
        if (response.ok) {
          const result = await response.json();
          setPreviousDayData(result.previous);
          setPreviousDate(result.previousDate);
        }
      } catch (error) {
        console.error('Failed to fetch previous day data:', error);
      }
    };
    fetchPreviousData();
  }, []);
  
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

        {/* Sortable Column Headers */}
        <div className="hidden sm:flex items-center justify-between gap-4 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-12 min-w-[200px] lg:min-w-[280px]">
            <button
              onClick={() => toggleSort('_cards', 'month')}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors group"
            >
              <span className={getSortConfig('_cards').field === 'month' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}>Product</span>
              <span className={`w-4 h-4 flex items-center justify-center rounded ${getSortConfig('_cards').field === 'month' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                {getSortConfig('_cards').field === 'month' ? (
                  getSortConfig('_cards').direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            </button>
          </div>
          <div className="flex items-center justify-end gap-4 sm:gap-8 lg:gap-16">
            <div className="w-32 lg:w-40 hidden xl:block">
              <button
                onClick={() => toggleSort('_cards', 'volume')}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors w-full justify-between"
              >
                <span className={getSortConfig('_cards').field === 'volume' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}>Volume %</span>
                <span className={`w-4 h-4 flex items-center justify-center rounded ${getSortConfig('_cards').field === 'volume' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                  {getSortConfig('_cards').field === 'volume' ? (
                    getSortConfig('_cards').direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </span>
              </button>
            </div>
            <button
              onClick={() => toggleSort('_cards', 'settle')}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors min-w-[80px] lg:min-w-[100px] justify-end"
            >
              <span className={getSortConfig('_cards').field === 'settle' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}>Settle</span>
              <span className={`w-4 h-4 flex items-center justify-center rounded ${getSortConfig('_cards').field === 'settle' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                {getSortConfig('_cards').field === 'settle' ? (
                  getSortConfig('_cards').direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            </button>
            <button
              onClick={() => toggleSort('_cards', 'change')}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors min-w-[80px] lg:min-w-[100px] justify-end"
            >
              <span className={getSortConfig('_cards').field === 'change' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}>Change</span>
              <span className={`w-4 h-4 flex items-center justify-center rounded ${getSortConfig('_cards').field === 'change' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                {getSortConfig('_cards').field === 'change' ? (
                  getSortConfig('_cards').direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            </button>
            <button
              onClick={() => toggleSort('_cards', 'volume')}
              className="hidden md:flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors min-w-[80px] lg:min-w-[100px] justify-end"
            >
              <span className={getSortConfig('_cards').field === 'volume' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}>Volume</span>
              <span className={`w-4 h-4 flex items-center justify-center rounded ${getSortConfig('_cards').field === 'volume' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                {getSortConfig('_cards').field === 'volume' ? (
                  getSortConfig('_cards').direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            </button>
            <div className="w-8 sm:w-10" /> {/* Spacer for expand button */}
          </div>
        </div>

        {/* Product Cards */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1">
          {(() => {
            const config = getSortConfig('_cards');
            const sorted = [...sortedProducts].sort((a, b) => {
              const aFront = a.contracts[0];
              const bFront = b.contracts[0];
              let aVal: number, bVal: number;
              
              switch (config.field) {
                case 'month':
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
                            style={{ backgroundColor: prodConfig?.color || '#64748b' }}
                          />
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl shadow-lg">
                            {product.symbol.substring(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                            {product.symbol} <span className="text-slate-400 dark:text-slate-500 font-medium">({prodConfig?.displayName || product.name})</span>
                          </h3>
                          <p className="text-slate-500 font-bold text-xs sm:text-sm uppercase tracking-wider">
                            {frontContract?.month || 'N/A'} • {prodConfig?.description || product.name}
                          </p>
                        </div>
                      </div>

                      {/* Stats - Desktop */}
                      <div className="hidden sm:flex items-center justify-end gap-4 sm:gap-8 lg:gap-16">
                        {/* Volume Bar - Hidden on small screens */}
                        <div className="w-32 lg:w-40 hidden xl:block">
                          <div className="flex justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                            <span>Volume</span>
                            <span>{volumePercent.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 sm:h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ backgroundColor: prodConfig?.color || '#64748b', width: `${volumePercent}%` }}
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

                      {/* Stats - Mobile (compact grid) */}
                      <div className="flex sm:hidden items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Settle</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              {frontContract ? frontContract.settle.toFixed(2) : '—'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Chg</p>
                            <p className={`text-sm font-black tabular-nums ${changeFormatted?.color || 'text-slate-400'}`}>
                              {changeFormatted?.text || 'UNCH'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Vol</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              {formatVolume(product.total_volume)}
                            </p>
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 md:gap-8 mb-4 sm:mb-8">
                          {(() => {
                            const prevOI = previousDayData?.[product.symbol]?.totalOpenInterest;
                            // Calculate actual change from previous snapshot
                            const actualChange = prevOI ? product.total_open_interest - prevOI : null;
                            const displayChange = actualChange !== null ? actualChange : product.total_oi_change;
                            const changeColor = displayChange > 0 ? 'text-emerald-500' : displayChange < 0 ? 'text-red-500' : '';
                            const stats = [
                              { label: 'Open Interest', value: formatNumber(product.total_open_interest) },
                              { label: 'Prev Snapshot', value: prevOI ? formatNumber(prevOI) : '—', subtext: previousDate ? `(${new Date(previousDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : '' },
                              { label: 'Change', value: (displayChange > 0 ? '+' : '') + formatNumber(displayChange), color: changeColor, subtext: prevOI ? 'from prev snapshot' : 'CME daily' },
                              { label: 'Globex Vol', value: formatNumber(product.contracts.reduce((sum, c) => sum + c.globex_volume, 0)) },
                              { label: 'PNT Volume', value: formatNumber(product.contracts.reduce((sum, c) => sum + c.pnt_volume, 0)) }
                            ];
                            return stats.map((stat, i) => (
                              <div key={i} className="p-3 sm:p-4 bg-white/40 dark:bg-black/40 rounded-xl sm:rounded-2xl border border-white/30 text-center">
                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5 sm:mb-1 tracking-wider">{stat.label}</p>
                                <p className={`text-base sm:text-lg md:text-xl font-bold ${stat.color || ''}`}>{stat.value}</p>
                                {'subtext' in stat && stat.subtext && (
                                  <p className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5">{stat.subtext}</p>
                                )}
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Contract Details Table */}
                        {product.contracts.length > 0 && (
                          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
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
            });
          })()}
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
                const getIcon = (change: number) => change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
                const getIconColor = (change: number) => change > 0 ? 'text-emerald-500' : change < 0 ? 'text-red-500' : 'text-slate-400';
                
                // Use volumeSummary data when available (more reliable for OI)
                // Fall back to bulletin data if volumeSummary is not available
                const metalSymbols = ['GC', 'SI', 'HG', 'PL', 'PA', 'ALI'];
                const metalNames: Record<string, string> = {
                  'GC': 'Gold',
                  'SI': 'Silver',
                  'HG': 'Copper',
                  'PL': 'Platinum',
                  'PA': 'Palladium',
                  'ALI': 'Aluminum',
                };
                
                const metals = metalSymbols.map(symbol => {
                  // Prefer volumeSummary data for accurate OI values
                  const vsProduct = volumeSummary?.products?.find(p => p.symbol === symbol);
                  const bulletinProduct = data.products.find(p => p.symbol === symbol);
                  
                  if (vsProduct) {
                    return {
                      name: metalNames[symbol],
                      openInterest: vsProduct.open_interest,
                      oiChange: vsProduct.oi_change,
                      volume: vsProduct.total_volume,
                    };
                  } else if (bulletinProduct) {
                    return {
                      name: metalNames[symbol],
                      openInterest: bulletinProduct.total_open_interest,
                      oiChange: bulletinProduct.total_oi_change,
                      volume: bulletinProduct.total_volume,
                    };
                  }
                  return null;
                }).filter(Boolean) as Array<{ name: string; openInterest: number; oiChange: number; volume: number }>;
                
                return metals.map((metal, i) => {
                  const dailyChange = metal.oiChange;
                  const Icon = getIcon(dailyChange);
                  // Calculate percent change: change / (current OI - change) to get change relative to previous OI
                  const previousOI = metal.openInterest - dailyChange;
                  const changePercent = previousOI > 0 
                    ? ((dailyChange / previousOI) * 100).toFixed(2)
                    : '0.00';
                  const isPositive = dailyChange > 0;
                  const isNegative = dailyChange < 0;
                  return (
                    <div key={i} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${getIconColor(dailyChange)} mt-0.5 sm:mt-1 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                          <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">{metal.name}</span>
                          OI: {formatNumber(metal.openInterest)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          OI chg: {isPositive ? '+' : ''}{formatNumber(dailyChange)} • Vol: {formatVolume(metal.volume)}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs sm:text-sm font-bold tabular-nums ${
                        isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                        isNegative ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {isPositive ? '+' : ''}{changePercent}%
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
              {(() => {
                const gc = data.products.find(p => p.symbol === 'GC');
                const si = data.products.find(p => p.symbol === 'SI');
                const pl = data.products.find(p => p.symbol === 'PL');
                const oneOz = data.products.find(p => p.symbol === '1OZ');
                
                const gcVol = gc?.total_volume || 0;
                const siVol = si?.total_volume || 0;
                const totalGoldSilver = gcVol + siVol;
                const goldPercent = totalGoldSilver > 0 ? (gcVol / totalGoldSilver) * 100 : 50;
                const silverPercent = 100 - goldPercent;
                const ratio = gcVol > 0 ? (siVol / gcVol).toFixed(1) : '0';
                
                // Get front month data
                const gcFront = gc?.contracts[0];
                const gcFrontPercent = gc && gcFront ? ((gcFront.globex_volume / gc.total_volume) * 100).toFixed(0) : 0;
                
                const plFront = pl?.contracts[0];
                const plFrontPercent = pl && plFront ? ((plFront.globex_volume / pl.total_volume) * 100).toFixed(0) : 0;
                
                return (
                  <>
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span>Gold vs Silver Volume</span>
                        <span>{siVol > gcVol ? `${ratio}x Silver` : gcVol > siVol ? `${(gcVol/siVol).toFixed(1)}x Gold` : 'Even'}</span>
                      </div>
                      <div className="h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-amber-500" style={{ width: `${goldPercent}%` }} />
                        <div className="h-full bg-slate-400" style={{ width: `${silverPercent}%` }} />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Gold: {formatVolume(gcVol)} vs Silver: {formatVolume(siVol)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {gc && gcFront && (
                        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">Gold Front-Month</span>
                            {gcFront.month} accounts for {gcFrontPercent}% of GC volume ({formatVolume(gcFront.globex_volume)} / {formatVolume(gc.total_volume)})
                          </p>
                        </div>
                      )}
                      {pl && plFront && (
                        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs block mb-0.5 sm:mb-1">Platinum Activity</span>
                            {plFront.month} captures {plFrontPercent}% of PL volume ({formatVolume(plFront.globex_volume)} / {formatVolume(pl.total_volume)})
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
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
                const getSignal = (change: number) => {
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
                  { symbol: 'ALI', name: 'Aluminum' },
                ];
                
                return metals.map((metal, i) => {
                  // Prefer volumeSummary data for accurate OI change values
                  const vsProduct = volumeSummary?.products?.find(p => p.symbol === metal.symbol);
                  const bulletinProduct = data.products.find(p => p.symbol === metal.symbol);
                  
                  const change = vsProduct?.oi_change ?? bulletinProduct?.total_oi_change;
                  if (change === undefined) return null;
                  
                  const color = change > 0 ? 'text-emerald-500' : change < 0 ? 'text-red-500' : 'text-slate-400';
                  
                  return (
                    <div key={i} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px] sm:text-xs mb-0.5 sm:mb-1">{metal.name}</p>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">{getSignal(change)}</p>
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

          {/* Physical Delivery (MTD) - Dynamic from delivery data */}
          <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base sm:text-lg md:text-xl">
                Physical Delivery (MTD)
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {(() => {
                // Build delivery items from deliveryData prop or fallback
                const deliveryOrder = ['Gold', 'Silver', 'Copper', 'Platinum', 'Palladium', 'Aluminum'];
                const items = deliveryOrder
                  .map(metal => {
                    const d = deliveryData?.deliveries?.find(del => del.metal === metal);
                    if (!d) return null;
                    return {
                      label: `${metal} ${d.contract_month}`,
                      value: formatNumber(d.month_to_date),
                      daily: d.daily_issued,
                    };
                  })
                  .filter(Boolean) as Array<{ label: string; value: string; daily: number }>;
                
                // Fallback if no delivery data
                if (items.length === 0) {
                  return [
                    { label: 'No delivery data', value: '—', daily: 0 }
                  ].map((item, i) => (
                    <div key={i} className="p-3 sm:p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 text-center col-span-2">
                      <p className="text-sm text-slate-400">{item.label}</p>
                    </div>
                  ));
                }
                
                return items.map((item, i) => (
                  <div key={i} className="p-3 sm:p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">{item.label}</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">{item.value}</p>
                    {item.daily > 0 && (
                      <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1">+{formatNumber(item.daily)} today</p>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Year-over-Year Comparison Section */}
      {volumeSummary && volumeSummary.products.length > 0 && (
        <div className="mt-16 sm:mt-24 md:mt-40 lg:mt-48">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16">
            <div className="max-w-xl space-y-3 sm:space-y-8">
              <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
                Year-over-Year
              </h2>
              <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
                52-WEEK VOLUME & OPEN INTEREST COMPARISON
              </p>
            </div>
          </div>

          {/* Market Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
            {(() => {
              const totals = volumeSummary.totals.futures_options;
              const volChange = totals.yoy_volume > 0 
                ? ((totals.volume - totals.yoy_volume) / totals.yoy_volume * 100) 
                : 0;
              const oiChange = totals.yoy_open_interest > 0 
                ? ((totals.open_interest - totals.yoy_open_interest) / totals.yoy_open_interest * 100) 
                : 0;
              
              return [
                { 
                  label: 'Today Volume', 
                  value: formatVolume(totals.volume),
                  subtext: 'All Metals Futures'
                },
                { 
                  label: '52-Week Ago Volume', 
                  value: formatVolume(totals.yoy_volume),
                  subtext: `${volChange >= 0 ? '+' : ''}${volChange.toFixed(0)}% YoY`,
                  color: volChange > 0 ? 'text-emerald-500' : volChange < 0 ? 'text-red-500' : ''
                },
                { 
                  label: 'Today Open Interest', 
                  value: formatNumber(totals.open_interest),
                  subtext: 'All Metals'
                },
                { 
                  label: '52-Week Ago OI', 
                  value: formatNumber(totals.yoy_open_interest),
                  subtext: `${oiChange >= 0 ? '+' : ''}${oiChange.toFixed(0)}% YoY`,
                  color: oiChange > 0 ? 'text-emerald-500' : oiChange < 0 ? 'text-red-500' : ''
                },
              ].map((stat, i) => (
                <div key={i} className="p-4 sm:p-6 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl sm:rounded-2xl text-center">
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">{stat.label}</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</p>
                  {'subtext' in stat && stat.subtext && (
                    <p className={`text-[9px] sm:text-xs mt-1 ${stat.color || 'text-slate-400'}`}>{stat.subtext}</p>
                  )}
                </div>
              ));
            })()}
          </div>

          {/* Product Comparison Table */}
          <div className="p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-3xl">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base sm:text-lg md:text-xl mb-4 sm:mb-6">
              Product Breakdown
            </h4>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="text-left px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Product</th>
                    <th className="text-right px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Volume</th>
                    <th className="text-right px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">52W Ago</th>
                    <th className="text-right px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Vol Chg %</th>
                    <th className="text-right px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Open Int</th>
                    <th className="text-right px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">52W Ago OI</th>
                    <th className="text-right px-3 sm:px-6 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">OI Chg %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {volumeSummary.products
                    .filter(p => ['GC', 'SI', 'HG', 'PL', 'PA', 'ALI'].includes(p.symbol))
                    .sort((a, b) => b.total_volume - a.total_volume)
                    .map((product) => {
                      const volChange = product.yoy_volume > 0 
                        ? ((product.total_volume - product.yoy_volume) / product.yoy_volume * 100) 
                        : 0;
                      const oiChange = product.yoy_open_interest > 0 
                        ? ((product.open_interest - product.yoy_open_interest) / product.yoy_open_interest * 100) 
                        : 0;
                      const config = productConfig[product.symbol];
                      
                      return (
                        <tr key={product.symbol} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                          <td className="px-3 sm:px-6 py-2 sm:py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: config?.color || '#64748b' }}
                              />
                              <span className="font-bold text-slate-900 dark:text-white">{product.symbol}</span>
                              <span className="text-slate-400 hidden sm:inline">{config?.displayName || product.name}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-3 text-right font-medium tabular-nums">{formatVolume(product.total_volume)}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-3 text-right text-slate-400 tabular-nums">{formatVolume(product.yoy_volume)}</td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-3 text-right font-bold tabular-nums ${volChange > 0 ? 'text-emerald-500' : volChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {volChange > 0 ? '+' : ''}{volChange.toFixed(0)}%
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-3 text-right font-medium tabular-nums">{formatNumber(product.open_interest)}</td>
                          <td className="px-3 sm:px-6 py-2 sm:py-3 text-right text-slate-400 tabular-nums">{formatNumber(product.yoy_open_interest)}</td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-3 text-right font-bold tabular-nums ${oiChange > 0 ? 'text-emerald-500' : oiChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {oiChange > 0 ? '+' : ''}{oiChange.toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                // Helper to get data from volumeSummary (preferred) or bulletin (fallback)
                const getMetalData = (symbol: string) => {
                  const vsProduct = volumeSummary?.products?.find(p => p.symbol === symbol);
                  const bulletinProduct = data.products.find(p => p.symbol === symbol);
                  const frontContract = bulletinProduct?.contracts?.[0];
                  
                  if (vsProduct) {
                    return {
                      volume: vsProduct.total_volume,
                      openInterest: vsProduct.open_interest,
                      oiChange: vsProduct.oi_change,
                      settle: frontContract?.settle || 0,
                      priceChange: frontContract?.change || 0,
                      yoyOI: vsProduct.yoy_open_interest,
                      yoyVol: vsProduct.yoy_volume,
                    };
                  } else if (bulletinProduct) {
                    return {
                      volume: bulletinProduct.total_volume,
                      openInterest: bulletinProduct.total_open_interest,
                      oiChange: bulletinProduct.total_oi_change,
                      settle: frontContract?.settle || 0,
                      priceChange: frontContract?.change || 0,
                      yoyOI: 0,
                      yoyVol: 0,
                    };
                  }
                  return null;
                };
                
                // Get delivery data for context
                const getDeliveryMTD = (metal: string) => {
                  return deliveryData?.deliveries?.find(d => d.metal === metal);
                };
                
                const gc = getMetalData('GC');
                const si = getMetalData('SI');
                const hg = getMetalData('HG');
                const pl = getMetalData('PL');
                const pa = getMetalData('PA');
                const ali = getMetalData('ALI');

                const goldDelivery = getDeliveryMTD('Gold');
                const silverDelivery = getDeliveryMTD('Silver');
                const copperDelivery = getDeliveryMTD('Copper');
                const platDelivery = getDeliveryMTD('Platinum');
                
                const takeaways = [];
                
                if (gc) {
                  const priceDir = gc.priceChange > 0 ? 'rallied' : gc.priceChange < 0 ? 'fell' : 'was unchanged';
                  const priceChgAbs = Math.abs(gc.priceChange).toFixed(2);
                  const priceChgPct = gc.settle > 0 ? ((gc.priceChange / (gc.settle - gc.priceChange)) * 100).toFixed(2) : '0.00';
                  const oiSignal = gc.oiChange > 0 
                    ? 'with rising OI — new longs entering, bullish conviction' 
                    : gc.oiChange < -3000 
                      ? 'with heavy OI liquidation — long profit-taking or stop-outs' 
                      : gc.oiChange < 0 
                        ? 'with declining OI — position unwinding' 
                        : 'with flat OI — consolidation';
                  const deliveryNote = goldDelivery ? ` MTD delivery notices at ${formatNumber(goldDelivery.month_to_date)} contracts (+${formatNumber(goldDelivery.daily_issued)} today).` : '';
                  takeaways.push({
                    title: "Gold — Price Action & Flow",
                    text: `Gold ${priceDir} $${priceChgAbs} (${priceChgPct}%) to $${gc.settle.toFixed(2)} on ${formatVolume(gc.volume)} contracts ${oiSignal}. OI at ${formatNumber(gc.openInterest)} (${gc.oiChange > 0 ? '+' : ''}${formatNumber(gc.oiChange)}).${deliveryNote}`,
                    color: gc.priceChange >= 0 ? "text-emerald-500" : "text-red-500"
                  });
                }
                
                if (si) {
                  const priceDir = si.priceChange > 0 ? 'gained' : si.priceChange < 0 ? 'dropped' : 'held';
                  const priceChgAbs = Math.abs(si.priceChange).toFixed(3);
                  const priceChgPct = si.settle > 0 ? ((si.priceChange / (si.settle - si.priceChange)) * 100).toFixed(2) : '0.00';
                  const oiSignal = si.oiChange < -3000 
                    ? 'Aggressive liquidation signals capitulation or forced selling.' 
                    : si.oiChange < 0 
                      ? 'Declining OI suggests position closing ahead of further moves.'
                      : 'Rising OI indicates fresh positioning.';
                  const deliveryNote = silverDelivery ? ` MTD deliveries: ${formatNumber(silverDelivery.month_to_date)} contracts.` : '';
                  takeaways.push({
                    title: "Silver — Volatility & Positioning",
                    text: `Silver ${priceDir} ${priceChgAbs} (${priceChgPct}%) to ${si.settle.toFixed(3)} with ${formatVolume(si.volume)} vol. OI ${si.oiChange > 0 ? 'up' : 'down'} ${formatNumber(Math.abs(si.oiChange))} to ${formatNumber(si.openInterest)}. ${oiSignal}${deliveryNote}`,
                    color: si.priceChange >= 0 ? "text-emerald-500" : "text-red-500"
                  });
                }
                
                if (hg) {
                  const priceDir = hg.priceChange > 0 ? 'advanced' : hg.priceChange < 0 ? 'retreated' : 'flat';
                  const priceChgPct = hg.settle > 0 ? ((hg.priceChange / (hg.settle - hg.priceChange)) * 100).toFixed(2) : '0.00';
                  const copperNote = copperDelivery ? ` Physical delivery MTD: ${formatNumber(copperDelivery.month_to_date)} contracts (+${formatNumber(copperDelivery.daily_issued)} today).` : '';
                  const oiSignal = hg.oiChange > 0 
                    ? 'with fresh buying interest' 
                    : hg.oiChange < -1000 
                      ? 'with significant position reduction'
                      : 'with modest position trimming';
                  takeaways.push({
                    title: "Copper — Industrial Barometer",
                    text: `Copper ${priceDir} ${Math.abs(hg.priceChange).toFixed(4)} (${priceChgPct}%) to $${hg.settle.toFixed(4)}/lb ${oiSignal}. OI at ${formatNumber(hg.openInterest)} (${hg.oiChange > 0 ? '+' : ''}${formatNumber(hg.oiChange)}).${copperNote}`,
                    color: "text-orange-500"
                  });
                }
                
                if (pl && pa) {
                  const plDir = pl.priceChange > 0 ? '+' : '';
                  const paDir = pa.priceChange > 0 ? '+' : '';
                  const netOiChange = pl.oiChange + pa.oiChange;
                  const pgmSignal = netOiChange > 0 ? 'net accumulation in the sector' : 'broad-based PGM liquidation';
                  const platNote = platDelivery ? ` Platinum MTD deliveries: ${formatNumber(platDelivery.month_to_date)}.` : '';
                  takeaways.push({
                    title: "PGM Complex — Auto-Catalyst Outlook",
                    text: `Platinum ${plDir}$${pl.priceChange.toFixed(2)} to $${pl.settle.toFixed(2)} (OI ${pl.oiChange > 0 ? '+' : ''}${formatNumber(pl.oiChange)}). Palladium ${paDir}$${pa.priceChange.toFixed(2)} to $${pa.settle.toFixed(2)} (OI ${pa.oiChange > 0 ? '+' : ''}${formatNumber(pa.oiChange)}). Combined ${pgmSignal}.${platNote}`,
                    color: "text-violet-500"
                  });
                }
                
                if (ali) {
                  const priceDir = ali.priceChange > 0 ? 'rose' : ali.priceChange < 0 ? 'fell' : 'was unchanged';
                  const priceChgAbs = Math.abs(ali.priceChange).toFixed(2);
                  const priceChgPct = ali.settle > 0 ? ((ali.priceChange / (ali.settle - ali.priceChange)) * 100).toFixed(2) : '0.00';
                  const oiSignal = ali.oiChange > 0
                    ? 'with fresh positioning entering'
                    : ali.oiChange < 0
                      ? 'with position unwinding'
                      : 'with flat OI';
                  takeaways.push({
                    title: "Aluminum — Industrial Demand",
                    text: `Aluminum ${priceDir} $${priceChgAbs} (${priceChgPct}%) to $${ali.settle.toFixed(2)}/mt on ${formatVolume(ali.volume)} contracts ${oiSignal}. OI at ${formatNumber(ali.openInterest)} (${ali.oiChange > 0 ? '+' : ''}${formatNumber(ali.oiChange)}).`,
                    color: "text-slate-400"
                  });
                }

                // Market-wide summary
                if (volumeSummary?.totals?.futures_options) {
                  const totals = volumeSummary.totals.futures_options;
                  const volYoYChange = totals.yoy_volume > 0 ? ((totals.volume - totals.yoy_volume) / totals.yoy_volume * 100).toFixed(0) : '0';
                  const oiYoYChange = totals.yoy_open_interest > 0 ? ((totals.open_interest - totals.yoy_open_interest) / totals.yoy_open_interest * 100).toFixed(0) : '0';
                  const allNeg = gc && si && hg && pl && pa && [gc, si, hg, pl, pa, ali].filter(Boolean).every(m => m!.priceChange < 0);
                  const marketTone = allNeg 
                    ? 'Broad risk-off session with all major metals declining. Macro headwinds or USD strength likely driving the selloff.'
                    : 'Mixed session across the metals complex.';
                  takeaways.push({
                    title: "Market Overview",
                    text: `Total metals volume: ${formatVolume(totals.volume)} contracts (${parseInt(volYoYChange) > 0 ? '+' : ''}${volYoYChange}% YoY). Aggregate OI: ${formatNumber(totals.open_interest)} (${parseInt(oiYoYChange) > 0 ? '+' : ''}${oiYoYChange}% YoY, daily chg: ${totals.oi_change > 0 ? '+' : ''}${formatNumber(totals.oi_change)}). ${marketTone}`,
                    color: "text-cyan-500"
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
