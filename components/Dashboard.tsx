'use client';

import { WarehouseStocksData, metalConfigs, formatNumber, calculateCoverageRatio, formatPercentChange, getPercentChangeColor, calculatePaperPhysicalRatio, getPaperPhysicalRiskColor, getPaperPhysicalBgColor, PaperPhysicalData } from '@/lib/data';
import { calculateCompositeRiskScore, RiskScore, RiskFactors } from '@/lib/riskScore';
import dynamic from 'next/dynamic';
import DeliverySection from './DeliverySection';
import PaperPhysicalCard from './PaperPhysicalCard';
import RiskScoreTooltip from './RiskScoreTooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ChevronRight, ChevronDown, FileText, BarChart3, FileStack, TrendingUp, Info, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Lazy load new delivery components
const DeliveryMTDChart = dynamic(() => import('./DeliveryMTDChart'), {
  ssr: false,
  loading: () => <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
});

const DeliveryYTDSection = dynamic(() => import('./DeliveryYTDSection'), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
});

// Lazy load heavy chart components
const DemandChart = dynamic(() => import('./DemandChart'), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
});

const BulletinDashboard = dynamic(() => import('./BulletinDashboard'), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
});

const ForecastDashboard = dynamic(() => import('./ForecastDashboard'), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
});

interface BulletinData {
  bulletin_number: number;
  date: string;
  parsed_date: string;
  products: Array<{
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
  }>;
  last_updated: string;
}

interface DeliveryData {
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
  totals?: {
    futures_options?: {
      globex_volume: number;
      pnt_volume: number;
      volume: number;
      open_interest: number;
      oi_change: number;
      yoy_volume: number;
      yoy_open_interest: number;
    };
    futures_only?: {
      volume: number;
      open_interest: number;
      oi_change: number;
      yoy_volume: number;
      yoy_open_interest: number;
    };
    options_only?: {
      volume: number;
      open_interest: number;
      oi_change: number;
      yoy_volume: number;
      yoy_open_interest: number;
    };
  };
  last_updated: string;
}

interface DeliveryMTDData {
  business_date: string;
  parsed_date: string;
  contracts: Array<{
    metal: string;
    symbol: string;
    contract_name: string;
    contract_month: string;
    daily_data: Array<{
      date: string;
      iso_date: string;
      daily: number;
      cumulative: number;
    }>;
    total_cumulative: number;
  }>;
  last_updated: string;
}

interface DeliveryYTDData {
  business_date: string;
  parsed_date: string;
  products: Array<{
    metal: string;
    symbol: string;
    product_name: string;
    monthly_totals: Record<string, number>;
    firms: Array<{
      code: string;
      name: string;
      org: string;
      issued: Record<string, number>;
      stopped: Record<string, number>;
      total_issued: number;
      total_stopped: number;
      total_activity: number;
    }>;
  }>;
  last_updated: string;
}

interface DashboardProps {
  data: WarehouseStocksData;
  bulletinData?: BulletinData | null;
  deliveryData?: DeliveryData | null;
  volumeSummaryData?: VolumeSummaryData | null;
  deliveryMtdData?: DeliveryMTDData | null;
  deliveryYtdData?: DeliveryYTDData | null;
  lastUpdatedText?: string;
}

// Helper function to get open interest for a metal from bulletin or volume summary
function getOpenInterestForMetal(
  futuresSymbol: string | undefined,
  bulletinData: BulletinData | null | undefined,
  volumeSummaryData: VolumeSummaryData | null | undefined
): number {
  if (!futuresSymbol) return 0;
  
  // Handle combined PL+PA for Platinum & Palladium
  if (futuresSymbol === 'PL+PA') {
    let totalOI = 0;
    
    // Try volume summary first
    if (volumeSummaryData?.products) {
      const plProduct = volumeSummaryData.products.find(p => p.symbol === 'PL');
      const paProduct = volumeSummaryData.products.find(p => p.symbol === 'PA');
      if (plProduct) totalOI += plProduct.open_interest;
      if (paProduct) totalOI += paProduct.open_interest;
      if (totalOI > 0) return totalOI;
    }
    
    // Fallback to bulletin data
    if (bulletinData?.products) {
      const plProduct = bulletinData.products.find(p => p.symbol === 'PL');
      const paProduct = bulletinData.products.find(p => p.symbol === 'PA');
      if (plProduct) totalOI += plProduct.total_open_interest;
      if (paProduct) totalOI += paProduct.total_open_interest;
    }
    
    return totalOI;
  }
  
  // First try volume summary (more reliable for total OI)
  if (volumeSummaryData?.products) {
    const product = volumeSummaryData.products.find(p => p.symbol === futuresSymbol);
    if (product) return product.open_interest;
  }
  
  // Fallback to bulletin data
  if (bulletinData?.products) {
    const product = bulletinData.products.find(p => p.symbol === futuresSymbol);
    if (product) return product.total_open_interest;
  }
  
  return 0;
}

export default function Dashboard({ data, bulletinData, deliveryData, volumeSummaryData, deliveryMtdData, deliveryYtdData, lastUpdatedText = 'Unknown' }: DashboardProps) {
  const activeMetals = metalConfigs.filter(config => {
    const metalData = data[config.key];
    return metalData && metalData.totals.total > 0;
  });

  const [expandedMetal, setExpandedMetal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'bulletin' | 'forecast'>('inventory');
  const [mtdDropdownOpen, setMtdDropdownOpen] = useState(false);
  
  // Calculate paper/physical ratios for each metal
  const paperPhysicalRatios: Record<string, PaperPhysicalData | null> = {};
  activeMetals.forEach(config => {
    const metalData = data[config.key];
    if (!metalData) return;
    
    const openInterest = getOpenInterestForMetal(config.futuresSymbol, bulletinData, volumeSummaryData);
    if (openInterest > 0) {
      paperPhysicalRatios[config.key] = calculatePaperPhysicalRatio(
        openInterest,
        config.contractSize,
        metalData.totals.registered
      );
    } else {
      paperPhysicalRatios[config.key] = null;
    }
  });

  // Calculate risk scores for each metal
  const riskScores: Record<string, RiskScore> = {};
  activeMetals.forEach(config => {
    const metalData = data[config.key];
    if (!metalData) return;
    
    const coverageRatio = calculateCoverageRatio(metalData.totals.registered, config.monthlyDemand);
    const ppRatio = paperPhysicalRatios[config.key];
    
    // Get OI change percentage if available
    let oiChangePercent: number | null = null;
    if (volumeSummaryData?.products && config.futuresSymbol) {
      const symbol = config.futuresSymbol;
      const product = volumeSummaryData.products.find(p => p.symbol === symbol);
      if (product && product.yoy_open_interest > 0) {
        oiChangePercent = ((product.open_interest - product.yoy_open_interest) / product.yoy_open_interest) * 100;
      }
    }
    
    const riskFactors: RiskFactors = {
      coverageRatio,
      paperPhysicalRatio: ppRatio?.ratio ?? 1,
      inventoryChange30d: metalData.changes?.month.registered ?? null,
      deliveryVelocity: null, // Could be calculated from delivery data if needed
      oiChange: oiChangePercent,
    };
    
    riskScores[config.key] = calculateCompositeRiskScore(riskFactors);
  });

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* Hero Section */}
      <section className="relative flex flex-col justify-start overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-black/20">
        {/* Optimized Aurora Background with Silver Tones */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-slate-300/20 dark:bg-slate-700/10 blur-[100px] rounded-full transform-gpu" 
            style={{ willChange: 'transform' }}
          />
          <div 
            className="absolute top-0 right-[-5%] w-[30%] h-[30%] bg-slate-400/15 dark:bg-slate-800/10 blur-[100px] rounded-full transform-gpu" 
            style={{ willChange: 'transform' }}
          />
          <div className="absolute inset-0 bg-white/5 dark:bg-black/5 backdrop-blur-[1px]" />
        </div>

        {/* Hero Title & Subtitle */}
        <div className="relative w-full px-4 sm:px-8 lg:px-24 pt-10 sm:pt-20 pb-2 sm:pb-4 md:pt-24 md:pb-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center">
            <div className="col-span-2 w-full text-left">
              <h1 className="leading-[1.1] tracking-tighter mb-2 sm:mb-4 md:mb-6 text-2xl sm:text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
                COMEX Metals
                <span className="text-muted-foreground font-medium block sm:inline"> — Inventory</span>
              </h1>

              <p className="leading-relaxed text-xs sm:text-base md:text-lg text-slate-600 dark:text-slate-400 font-medium">
                Advanced analytics for global warehouse inventory levels and supply-demand coverage metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-0 md:h-2 lg:h-3" />

        {/* Stats Cards */}
        <div className="relative w-full px-4 sm:px-8 lg:px-24 pb-16 sm:pb-24 md:pb-32 text-center mx-auto">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center">
            {activeMetals.map(config => {
              const metalData = data[config.key];
              if (!metalData) return null;
              const ratio = calculateCoverageRatio(metalData.totals.registered, config.monthlyDemand);
              const isStress = ratio < 5;
              
              // Calculate ratio change from previous day
              let ratioChange: number | null = null;
              let ratioPercentChange: number | null = null;
              if (metalData.changes?.day.registered !== null && metalData.changes?.day.registered !== undefined) {
                // Previous registered = current / (1 + percent_change/100)
                const previousRegistered = metalData.totals.registered / (1 + metalData.changes.day.registered / 100);
                const previousRatio = calculateCoverageRatio(previousRegistered, config.monthlyDemand);
                ratioChange = ratio - previousRatio;
                // Calculate percent change in ratio
                if (previousRatio > 0) {
                  ratioPercentChange = ((ratio - previousRatio) / previousRatio) * 100;
                }
              }
              
              const riskScore = riskScores[config.key];
              
              return (
                <HoverCard key={config.key} openDelay={0} closeDelay={0}>
                  <HoverCardTrigger asChild>
                    <div 
                      className="relative group min-w-0 sm:min-w-[220px] md:min-w-[260px] px-4 pt-6 pb-10 sm:px-8 sm:pt-10 sm:pb-14 md:px-10 md:pt-12 md:pb-16 bg-white dark:bg-white/5 backdrop-blur-2xl border border-black/30 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-xl hover:shadow-2xl overflow-hidden cursor-pointer"
                    >
                      {/* Subtle Background Accent Gradient */}
                      <div className={`absolute -inset-2 bg-gradient-to-br ${isStress ? 'from-red-500/5 to-transparent' : 'from-emerald-500/5 to-transparent'} opacity-0 group-hover:opacity-100`} />
                      
                      {/* Status Indicator - Top Right */}
                      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 md:top-6 md:right-6 flex items-center gap-2">
                        <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isStress ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'}`} />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <p className="text-[9px] sm:text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-2 md:mb-3 truncate max-w-full">
                          {config.name}
                        </p>
                        <p className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter tabular-nums ${isStress ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                          {ratio.toFixed(2)}<span className="text-sm sm:text-base md:text-lg ml-0.5">x</span>
                        </p>
                        <div className="mt-2 sm:mt-3 md:mt-4 px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                          <p className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                            Coverage
                          </p>
                        </div>
                        
                        {/* Ratio Change - Shows absolute change and percent change */}
                        {ratioChange !== null && (
                          <div className="mt-2 sm:mt-4 text-[10px] sm:text-[11px] font-bold">
                            <span className={ratioChange > 0 ? 'text-emerald-500' : ratioChange < 0 ? 'text-red-500' : 'text-slate-400'}>
                              {ratioChange > 0 ? '+' : ''}{ratioChange.toFixed(2)}x
                            </span>
                            {ratioPercentChange !== null && (
                              <span className={`ml-1 ${ratioPercentChange > 0 ? 'text-emerald-500' : ratioPercentChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                ({ratioPercentChange > 0 ? '+' : ''}{ratioPercentChange.toFixed(2)}%)
                              </span>
                            )}
                            <span className="text-slate-400 ml-1 hidden sm:inline">24h</span>
                          </div>
                        )}
                        
                        {/* Paper/Physical Ratio - Compact display */}
                        {paperPhysicalRatios[config.key] && (
                          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                              <FileStack className="w-3 h-3 text-slate-400" />
                              <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Paper/Physical
                              </span>
                            </div>
                            <p className={`text-base sm:text-lg font-black tabular-nums ${getPaperPhysicalRiskColor(paperPhysicalRatios[config.key]!.riskLevel)}`}>
                              {paperPhysicalRatios[config.key]!.ratio.toFixed(1)}:1
                            </p>
                          </div>
                        )}

                        {/* Buy Physical Link */}
                        {config.buyLink && (
                          <div className="relative sm:mt-3 sm:-mb-6 md:-mb-8" style={{ transform: 'translateY(-15%)' }}>
                          <motion.a
                            href={config.buyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            className="relative inline-flex items-center justify-center gap-0.5 sm:gap-3 px-1.5 sm:px-8 py-0.5 sm:py-3 max-w-full bg-amber-950/80 dark:bg-amber-950/90 border border-amber-500/30 dark:border-amber-400/25 rounded-full no-underline shadow-[0_2px_12px_rgba(245,158,11,0.15)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:border-amber-500/50 dark:hover:border-amber-400/40 transition-all duration-300 overflow-hidden"
                          >
                            <span className="relative z-10 text-[5px] sm:text-[10px] font-black text-amber-300 uppercase tracking-wider sm:tracking-widest whitespace-nowrap">
                              Buy Physical
                            </span>
                            <ExternalLink className="relative z-10 w-1.5 h-1.5 sm:w-3 sm:h-3 text-amber-400/60 shrink-0" style={{ position: 'relative', left: '-3px' }} />
                          </motion.a>
                          </div>
                        )}
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent 
                    className="w-auto p-0 border-0 bg-transparent shadow-none"
                    side="bottom"
                    align="center"
                    sideOffset={8}
                  >
                    {riskScore && (
                      <RiskScoreTooltip score={riskScore} metalName={config.name} />
                    )}
                  </HoverCardContent>
                </HoverCard>
              );
            })}

            {/* Newsletter CTA - Mobile only, fills empty grid spot next to Copper */}
            <a
              href="https://buy.stripe.com/fZucN673N8GB5VU67Lfw401"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden relative group min-w-0 px-4 py-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/10 dark:to-amber-400/5 backdrop-blur-2xl border border-amber-500/25 dark:border-amber-400/20 rounded-2xl shadow-xl hover:shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center gap-3 no-underline"
            >
              <div className="absolute -inset-2 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="text-[9px] font-black text-amber-500/70 dark:text-amber-400/70 uppercase tracking-widest">Daily Intel</span>
                <span className="text-lg font-black tracking-tight text-amber-600 dark:text-amber-300">Newsletter</span>
                <div className="mt-1 px-4 py-1.5 bg-amber-500/15 dark:bg-amber-400/15 rounded-full border border-amber-500/25 dark:border-amber-400/25">
                  <span className="text-[9px] font-black text-amber-600 dark:text-amber-300 uppercase tracking-widest">Subscribe</span>
                </div>
              </div>
            </a>
          </div>
          
          {/* Learn Link */}
          <div className="mt-6 sm:mt-8 text-center">
            <Link 
              href="/learn" 
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 group underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-500"
            >
              <span>What is coverage ratio &amp; paper vs physical? Learn about supply and demand here</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="w-full px-3 sm:px-8 lg:px-24 py-4 sm:py-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-black/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4 p-1.5 sm:p-2.5 bg-slate-100 dark:bg-slate-800 w-full sm:w-fit mx-auto shadow-inner">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-3 px-3 sm:px-8 py-2.5 sm:py-4 text-[10px] sm:text-base font-black uppercase tracking-wide sm:tracking-wider rounded-lg sm:rounded-2xl sm:min-w-[140px] !min-h-0 ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-white shadow-lg ring-1 sm:ring-2 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab('bulletin')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-3 px-3 sm:px-8 py-2.5 sm:py-4 text-[10px] sm:text-base font-black uppercase tracking-wide sm:tracking-wider rounded-lg sm:rounded-2xl sm:min-w-[140px] !min-h-0 ${
              activeTab === 'bulletin'
                ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-white shadow-lg ring-1 sm:ring-2 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Bulletin</span>
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-3 px-3 sm:px-8 py-2.5 sm:py-4 text-[10px] sm:text-base font-black uppercase tracking-wide sm:tracking-wider rounded-lg sm:rounded-2xl sm:min-w-[140px] !min-h-0 ${
              activeTab === 'forecast'
                ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-white shadow-lg ring-1 sm:ring-2 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Forecast</span>
            <span className="hidden sm:inline-block sm:min-w-[60px] sm:min-h-[32px] px-4 py-1 text-sm font-black uppercase tracking-wide bg-emerald-500 text-white rounded-lg text-center leading-8 whitespace-nowrap">New</span>
            <span className="sm:hidden inline-block px-1.5 py-0.5 text-[8px] font-black uppercase bg-emerald-500 text-white rounded leading-none">New</span>
          </button>
        </div>
        
        {/* Mobile-only: Last Updated (moved from header) */}
        <div className="sm:hidden flex flex-col items-center justify-center gap-0.5 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span>Updated: {lastUpdatedText}</span>
          </div>
          <span className="text-slate-400">Nightly at 9:30 PM EST • CME data delayed 1 day</span>
        </div>
      </div>

      {/* Spacer between nav and content */}
      <div className="h-8 md:h-12 lg:h-16" />

      {/* Bulletin Section */}
      {activeTab === 'bulletin' && bulletinData && (
        <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-32 md:pb-48">
          <BulletinDashboard data={bulletinData} volumeSummary={volumeSummaryData} deliveryData={deliveryData} />
        </section>
      )}

      {/* No Bulletin Data Message */}
      {activeTab === 'bulletin' && !bulletinData && (
        <section className="w-full px-8 lg:px-24 pb-16">
          <div className="p-12 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Bulletin Data Available</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Run the bulletin parser script to extract data from CME daily bulletins.
            </p>
            <code className="mt-4 inline-block px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-300">
              python scripts/parse_bulletin.py
            </code>
          </div>
        </section>
      )}

      {/* Main Content - Inventory Tab */}
      {activeTab === 'inventory' && (
        <>
      {/* Spacer between hero and supply section */}
      <div className="h-4 md:h-8 lg:h-12" />

      <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-32 md:pb-48">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 md:mb-16">
          <div className="max-w-xl space-y-4 sm:space-y-8">
            <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
              Supply Overview
            </h2>
            <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
              LIVE REGISTERED INVENTORY VS AGGREGATE MONTHLY DEMAND
            </p>
          </div>
        </div>

        {/* Metal Rows */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
          {activeMetals.map((config, index) => {
            const metalData = data[config.key];
            if (!metalData) return null;
            
            const ratio = calculateCoverageRatio(metalData.totals.registered, config.monthlyDemand);
            const isStress = ratio < 5;
            const isWatch = ratio >= 5 && ratio < 12;
            const registeredPercent = metalData.totals.total > 0 
              ? (metalData.totals.registered / metalData.totals.total) * 100 
              : 0;
            const isExpanded = expandedMetal === config.key;

            return (
              <div
                key={config.key}
                className="relative"
              >
                <button
                  onClick={() => setExpandedMetal(isExpanded ? null : config.key)}
                  className={`relative w-full text-left p-4 sm:p-6 md:p-8 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 lg:gap-8">
                    {/* Metal Info */}
                    <div className="flex items-center gap-4 sm:gap-6 lg:gap-12">
                      <div className="relative flex-shrink-0">
                        <div className={`absolute -inset-1.5 sm:-inset-2 bg-gradient-to-tr ${isStress ? 'from-red-500 to-orange-500' : 'from-slate-400 to-slate-600'} rounded-xl sm:rounded-2xl blur-md opacity-20`} />
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl shadow-lg">
                          {config.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">{config.name}</h3>
                        <p className="text-slate-500 font-bold text-xs sm:text-sm">{config.unit}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 lg:gap-12">
                      {/* Vault Capacity - Hidden on smallest screens */}
                      <div className="hidden sm:block w-32 lg:w-40">
                        <div className="flex justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">
                          <span>Vault</span>
                          <span>{registeredPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 sm:h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                          <div 
                            style={{ width: `${registeredPercent}%` }}
                            className={`h-full rounded-full bg-gradient-to-r ${isStress ? 'from-red-500 to-orange-500' : 'from-slate-400 to-slate-600'}`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-right">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Coverage</p>
                          <p className={`text-2xl sm:text-3xl md:text-4xl font-black tabular-nums ${isStress ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                            {ratio.toFixed(2)}x
                          </p>
                        </div>
                        
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 rotate-90 align-top">
                          <ChevronRight 
                            className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" 
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                    <div
                      className="mt-3 sm:mt-6 p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
                        {[
                          { 
                            label: 'Total Supply', 
                            value: formatNumber(metalData.totals.total),
                            currentValue: metalData.totals.total,
                            dayChange: metalData.changes?.day.total,
                            monthChange: metalData.changes?.month.total
                          },
                          { 
                            label: 'Registered', 
                            value: formatNumber(metalData.totals.registered),
                            currentValue: metalData.totals.registered,
                            dayChange: metalData.changes?.day.registered,
                            monthChange: metalData.changes?.month.registered
                          },
                          { 
                            label: 'Eligible', 
                            value: formatNumber(metalData.totals.eligible),
                            currentValue: metalData.totals.eligible,
                            dayChange: metalData.changes?.day.eligible,
                            monthChange: metalData.changes?.month.eligible
                          },
                          { 
                            label: 'Demand', 
                            value: formatNumber(config.monthlyDemand),
                            currentValue: undefined,
                            dayChange: null,
                            monthChange: null
                          }
                        ].map((stat, i) => (
                          <div key={i} className="p-3 sm:p-4 bg-white dark:bg-black/40 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 text-center">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5 sm:mb-1 tracking-wider">{stat.label}</p>
                            <p className="text-base sm:text-lg md:text-xl font-bold">{stat.value}</p>
                            {(stat.dayChange != null || stat.monthChange != null) && (
                              <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row justify-center gap-1 sm:gap-3 text-[8px] sm:text-[9px] font-bold">
                                {stat.dayChange != null && stat.currentValue != null && (
                                  <span className={getPercentChangeColor(stat.dayChange)}>
                                    24h: {(() => {
                                      // Calculate absolute change from percent change
                                      // current = previous * (1 + pct/100), so previous = current / (1 + pct/100)
                                      // change = current - previous
                                      const previous = stat.currentValue / (1 + stat.dayChange / 100);
                                      const absoluteChange = stat.currentValue - previous;
                                      const sign = absoluteChange >= 0 ? '+' : '';
                                      return `${sign}${formatNumber(Math.round(absoluteChange))}`;
                                    })()}
                                  </span>
                                )}
                                {stat.monthChange != null && stat.currentValue != null && (
                                  <span className={getPercentChangeColor(stat.monthChange)}>
                                    30d: {(() => {
                                      const previous = stat.currentValue / (1 + stat.monthChange / 100);
                                      const absoluteChange = stat.currentValue - previous;
                                      const sign = absoluteChange >= 0 ? '+' : '';
                                      return `${sign}${formatNumber(Math.round(absoluteChange))}`;
                                    })()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Paper vs Physical Section */}
                      {paperPhysicalRatios[config.key] && (
                        <div className="mt-4 sm:mt-6">
                          <PaperPhysicalCard 
                            metalName={config.name}
                            data={paperPhysicalRatios[config.key]!}
                            unit={config.unit}
                          />
                        </div>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Spacer between sections */}
      <div className="h-12 md:h-20 lg:h-24" />

      {/* Monetag ads are loaded globally via layout.tsx — no container div needed */}

      {/* Delivery Notices Section */}
      {deliveryData && deliveryData.deliveries && deliveryData.deliveries.length > 0 && (
        <>
          <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pb-12 sm:pb-16 md:pb-24">
            <DeliverySection data={deliveryData} />
          </section>
          
          {/* Spacer between sections */}
          <div className="h-8 sm:h-12 md:h-20 lg:h-24" />
        </>
      )}

      {/* MTD Delivery Progression */}
      {deliveryMtdData && deliveryMtdData.contracts && deliveryMtdData.contracts.length > 0 && (
        <>
          <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pb-12 sm:pb-16 md:pb-24">
            <div className="mb-8 sm:mb-12 md:mb-16">
              <div className="max-w-xl space-y-3 sm:space-y-8">
                <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
                  MTD Progression
                </h2>
                <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase">
                  DAILY DELIVERY BUILDUP — {deliveryMtdData.business_date}
                </p>
                {/* MTD Progression Dropdown */}
                <div className="max-w-lg">
                  <button
                    onClick={() => setMtdDropdownOpen(!mtdDropdownOpen)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>What is MTD Progression?</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mtdDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${mtdDropdownOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
                        <strong className="text-slate-600 dark:text-slate-300">Month-to-Date (MTD) Progression</strong> shows how delivery activity accumulates throughout the month. Each bar represents the daily deliveries, while the line tracks the cumulative total. As the month progresses, you can see whether delivery demand is accelerating (steeper curve) or slowing (flatter curve).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-8 lg:p-12 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm">
                <DeliveryMTDChart data={deliveryMtdData} />
              </div>
            </div>
          </section>
          
          <div className="h-8 sm:h-12 md:h-20 lg:h-24" />
        </>
      )}

      {/* YTD Delivery Section */}
      {deliveryYtdData && deliveryYtdData.products && deliveryYtdData.products.length > 0 && (
        <>
          <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pb-12 sm:pb-16 md:pb-24">
            <DeliveryYTDSection data={deliveryYtdData} />
          </section>
          
          <div className="h-8 sm:h-12 md:h-20 lg:h-24" />
        </>
      )}

      {/* Demand Chart Section */}
      <section className="relative mt-0 pt-12 sm:pt-16 md:pt-24 pb-16 sm:pb-20 md:pb-32 bg-transparent overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-slate-300/5 dark:bg-slate-700/5 blur-[100px] rounded-full" />
        </div>
        <div className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 md:mb-28">
            <div className="max-w-xl space-y-4 sm:space-y-8">
              <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
                Demand Trends
              </h2>
              <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
                HISTORICAL DELIVERY PERFORMANCE VS PROJECTED DEMAND
              </p>
            </div>
          </div>
          
          <div className="p-4 sm:p-8 lg:p-12 bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm">
            <DemandChart metal="gold" deliveryData={deliveryData} />
          </div>
        </div>
      </section>
        </>
      )}

      {/* Price Forecast Tab */}
      {activeTab === 'forecast' && (
        <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-32 md:pb-48">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 md:mb-28">
            <div className="max-w-xl space-y-4 sm:space-y-8">
              <h2 className="tracking-tighter text-3xl sm:text-4xl md:text-5xl font-black uppercase">
                Price Forecast
              </h2>
              <p className="text-sm sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
                STATISTICAL DIRECTIONAL ANALYSIS &amp; PHYSICAL MARKET SIGNALS
              </p>
            </div>
          </div>

          <details className="max-w-3xl mb-10 sm:mb-14 md:mb-20 group bg-white dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <summary className="flex items-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">How does this forecast work?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-auto transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Each forecast is generated by combining four independent analytical layers weighted by reliability: <span className="font-semibold text-slate-800 dark:text-slate-200">physical market stress signals (35%)</span> measure real-world supply pressure through COMEX inventory drawdown velocity, delivery acceleration, paper-to-physical leverage, and coverage erosion rates; <span className="font-semibold text-slate-800 dark:text-slate-200">technical trend analysis (30%)</span> evaluates price momentum via moving average crossovers, RSI, MACD, and Bollinger Band positioning; <span className="font-semibold text-slate-800 dark:text-slate-200">ARIMA time-series modeling (20%)</span> fits an auto-selected statistical model to historical settlement prices to project 5- and 20-day price ranges with 80% confidence intervals; and <span className="font-semibold text-slate-800 dark:text-slate-200">market activity signals (15%)</span> track open interest expansion and volume trends for confirmation. The composite score maps these into a directional call&mdash;bullish, bearish, or neutral&mdash;with a confidence percentage reflecting how strongly the signals agree. Pearson and Granger causality tests validate whether physical indicators historically lead price, and z-score anomaly detection flags unusual activity that may precede outsized moves.
              </p>
            </div>
          </details>
          
          <ForecastDashboard />
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 sm:py-12 md:py-16 bg-white dark:bg-black/20 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 sm:px-8 lg:px-24">
          <div className="flex flex-col items-center gap-6 sm:gap-8 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>CME Group Stocks Verified 2026</span>
            </div>
            
            {/* Disclaimer */}
            <p className="max-w-2xl text-center text-[8px] sm:text-[9px] font-medium normal-case tracking-normal leading-relaxed text-slate-400">
              This site provides informational data only. Nothing on this site constitutes financial advice, investment recommendations, or buy/sell signals. Always consult a qualified financial advisor before making investment decisions.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
              <Link href="/about" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                About
              </Link>
              <Link href="/contact" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                Terms
              </Link>
              <Link href="/api-info" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                API
              </Link>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
