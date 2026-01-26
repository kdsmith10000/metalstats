'use client';

import { WarehouseStocksData, metalConfigs, formatNumber, calculateCoverageRatio, formatPercentChange, getPercentChangeColor } from '@/lib/data';
import { motion, AnimatePresence } from 'framer-motion';
import DemandChart from './DemandChart';
import BulletinDashboard from './BulletinDashboard';
import VolumeOIChart from './VolumeOIChart';
import DeliverySection from './DeliverySection';
import { ChevronRight, FileText, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

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

interface DashboardProps {
  data: WarehouseStocksData;
  bulletinData?: BulletinData | null;
  deliveryData?: DeliveryData | null;
  lastUpdatedText?: string;
}

export default function Dashboard({ data, bulletinData, deliveryData, lastUpdatedText = 'January 22, 2026' }: DashboardProps) {
  const activeMetals = metalConfigs.filter(config => {
    const metalData = data[config.key];
    return metalData && metalData.totals.total > 0;
  });

  const [expandedMetal, setExpandedMetal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'bulletin'>('inventory');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* Hero Section */}
      <section className="relative flex flex-col justify-start overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-black/20">
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
        <div className="relative w-full px-4 sm:px-8 lg:px-24 pt-16 sm:pt-24 pb-8 sm:pb-12 md:pt-32 md:pb-16 text-left">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="leading-[1.1] tracking-tighter mb-3 sm:mb-4 md:mb-6 text-3xl sm:text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
              COMEX Metals
              <span className="text-muted-foreground font-medium block sm:inline"> — Inventory</span>
            </h1>

            <p className="leading-relaxed text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 font-medium">
              Advanced analytics for global warehouse inventory levels and supply-demand coverage metrics.
            </p>
          </motion.div>
        </div>

        {/* Spacer */}
        <div className="h-6 md:h-10 lg:h-12" />

        {/* Stats Cards */}
        <div className="relative w-full px-4 sm:px-8 lg:px-24 pb-16 sm:pb-24 md:pb-32 text-center mx-auto">
          <motion.div
            className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 md:gap-6 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {activeMetals.map(config => {
              const metalData = data[config.key];
              if (!metalData) return null;
              const ratio = calculateCoverageRatio(metalData.totals.registered, config.monthlyDemand);
              const isStress = ratio < 5;
              
              // Calculate ratio change from previous day
              let ratioChange: number | null = null;
              if (metalData.changes?.day.registered !== null && metalData.changes?.day.registered !== undefined) {
                // Previous registered = current / (1 + percent_change/100)
                const previousRegistered = metalData.totals.registered / (1 + metalData.changes.day.registered / 100);
                const previousRatio = calculateCoverageRatio(previousRegistered, config.monthlyDemand);
                ratioChange = ratio - previousRatio;
              }
              
              return (
                <div 
                  key={config.key} 
                  className="relative group min-w-0 sm:min-w-[220px] md:min-w-[260px] px-4 py-6 sm:px-8 sm:py-10 md:px-10 md:py-12 bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                >
                  {/* Subtle Background Accent Gradient */}
                  <div className={`absolute -inset-2 bg-gradient-to-br ${isStress ? 'from-red-500/5 to-transparent' : 'from-emerald-500/5 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
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
                    
                    {/* Ratio Change - Shows absolute change in coverage ratio */}
                    {ratioChange !== null && (
                      <div className="mt-2 sm:mt-4 text-[10px] sm:text-[11px] font-bold">
                        <span className={ratioChange > 0 ? 'text-emerald-500' : ratioChange < 0 ? 'text-red-500' : 'text-slate-400'}>
                          {ratioChange > 0 ? '+' : ''}{Math.round(ratioChange)}
                        </span>
                        {' '}
                        <span className="text-slate-400 hidden sm:inline">vs yesterday</span>
                        <span className="text-slate-400 sm:hidden">24h</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="w-full px-4 sm:px-8 lg:px-24 py-4 sm:py-8 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl sm:rounded-2xl w-full sm:w-fit mx-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg sm:rounded-xl transition-all duration-300 ${
              activeTab === 'inventory'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Warehouse</span> Inventory
          </button>
          <button
            onClick={() => setActiveTab('bulletin')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg sm:rounded-xl transition-all duration-300 ${
              activeTab === 'bulletin'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Daily</span> Bulletin
          </button>
        </div>
        
        {/* Mobile-only: Last Updated (moved from header) */}
        <div className="sm:hidden flex flex-col items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Last updated: {lastUpdatedText} • CME Group</span>
          </div>
          <span className="text-xs text-slate-400">Updated nightly at 9:30 PM EST</span>
        </div>
      </div>

      {/* Spacer between nav and content */}
      <div className="h-8 md:h-12 lg:h-16" />

      {/* Bulletin Section */}
      {activeTab === 'bulletin' && bulletinData && (
        <section className="w-full px-4 sm:px-8 md:pl-24 lg:pl-48 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-32 md:pb-48">
          <BulletinDashboard data={bulletinData} />
          
          {/* Spacer between bulletin dashboard and volume chart */}
          <div className="h-8 sm:h-12 md:h-20 lg:h-24" />

          {/* Volume & OI Chart */}
          <div className="p-4 sm:p-8 lg:p-12 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[3rem] shadow-sm">
            <VolumeOIChart />
          </div>
        </section>
      )}

      {/* No Bulletin Data Message */}
      {activeTab === 'bulletin' && !bulletinData && (
        <section className="w-full px-8 lg:px-24 pb-16">
          <div className="p-12 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl text-center">
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
                  className={`relative w-full text-left p-4 sm:p-6 md:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all duration-300`}
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
                          <motion.div 
                            initial={false}
                            animate={{ width: `${registeredPercent}%` }}
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
                            className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform duration-300" 
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          />
                        </div>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
                        {[
                          { 
                            label: 'Total Supply', 
                            value: formatNumber(metalData.totals.total),
                            dayChange: metalData.changes?.day.total,
                            monthChange: metalData.changes?.month.total
                          },
                          { 
                            label: 'Registered', 
                            value: formatNumber(metalData.totals.registered),
                            dayChange: metalData.changes?.day.registered,
                            monthChange: metalData.changes?.month.registered
                          },
                          { 
                            label: 'Eligible', 
                            value: formatNumber(metalData.totals.eligible),
                            dayChange: metalData.changes?.day.eligible,
                            monthChange: metalData.changes?.month.eligible
                          },
                          { 
                            label: 'Demand', 
                            value: formatNumber(config.monthlyDemand),
                            dayChange: null,
                            monthChange: null
                          }
                        ].map((stat, i) => (
                          <div key={i} className="p-3 sm:p-4 bg-white/40 dark:bg-black/40 rounded-xl sm:rounded-2xl border border-white/30 text-center">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5 sm:mb-1 tracking-wider">{stat.label}</p>
                            <p className="text-base sm:text-lg md:text-xl font-bold">{stat.value}</p>
                            {(stat.dayChange !== null || stat.monthChange !== null) && (
                              <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row justify-center gap-1 sm:gap-3 text-[8px] sm:text-[9px] font-bold">
                                {stat.dayChange !== null && (
                                  <span className={getPercentChangeColor(stat.dayChange)}>
                                    24h: {formatPercentChange(stat.dayChange)}
                                  </span>
                                )}
                                {stat.monthChange !== null && (
                                  <span className={getPercentChangeColor(stat.monthChange)}>
                                    30d: {formatPercentChange(stat.monthChange)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Spacer between sections */}
      <div className="h-12 md:h-20 lg:h-24" />

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
          
          <div className="p-4 sm:p-8 lg:p-12 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl sm:rounded-[3rem] shadow-sm">
            <DemandChart metal="gold" />
          </div>
        </div>
      </section>
        </>
      )}

      {/* Footer */}
      <footer className="py-8 sm:py-12 md:py-16 bg-white/30 dark:bg-black/20 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 sm:px-8 lg:px-24">
          <div className="flex flex-col items-center gap-6 sm:gap-8 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>CME Group Stocks Verified 2026</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
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
