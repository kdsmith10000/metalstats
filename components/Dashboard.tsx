'use client';

import { WarehouseStocksData, metalConfigs, formatNumber, calculateCoverageRatio } from '@/lib/data';
import { motion } from 'framer-motion';
import DemandChart from './DemandChart';
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface DashboardProps {
  data: WarehouseStocksData;
}

export default function Dashboard({ data }: DashboardProps) {
  const activeMetals = metalConfigs.filter(config => {
    const metalData = data[config.key];
    return metalData && metalData.totals.total > 0;
  });

  const [expandedMetal, setExpandedMetal] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative w-full px-8 lg:px-16 pt-16 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              <span className="text-[#1e3a5f]">COMEX Metals</span>
              <span className="text-muted-foreground"> — </span>
              <span className="text-muted-foreground">Inventory Analysis</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Real-time warehouse inventory levels and supply coverage ratios for precious and base metals.
            </p>
          </motion.div>

          {/* Quick Stats Row */}
          <motion.div 
            className="mt-14 flex flex-wrap justify-center gap-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {activeMetals.map(config => {
              const metalData = data[config.key];
              if (!metalData) return null;
              const ratio = calculateCoverageRatio(metalData.totals.registered, config.monthlyDemand);
              const isStress = ratio < 5;
              
              return (
                <div key={config.key} className="flex items-baseline gap-3">
                  <span className={`text-4xl font-bold tabular-nums ${isStress ? 'status-stress' : 'status-adequate'}`}>
                    {ratio.toFixed(1)}x
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium">{config.name}</p>
                    <p className="text-xs text-muted-foreground">coverage</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="w-full px-12 lg:px-24 xl:px-32 py-16">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-10 pl-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Supply Overview</h2>
            <p className="text-muted-foreground mt-1">Registered inventory vs monthly demand</p>
          </div>
        </div>

        {/* Metal Rows - Clean List Design */}
        <div className="space-y-1">
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
              <motion.div
                key={config.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <button
                  onClick={() => setExpandedMetal(isExpanded ? null : config.key)}
                  className={`w-full text-left px-8 py-6 rounded-xl transition-all duration-200 ${
                    isStress ? 'bg-status-stress' : 'hover:bg-muted/50'
                  } ${isExpanded ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Metal Info */}
                    <div className="flex items-center gap-8 pl-4">
                      <div className="w-48">
                        <h3 className="font-semibold text-lg">{config.name}</h3>
                        <p className="text-sm text-muted-foreground">{config.unit}</p>
                      </div>
                      
                      {/* Supply Bar */}
                      <div className="hidden md:block w-48">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Registered</span>
                          <span>{registeredPercent.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isStress ? 'bg-red-500' : isWatch ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${registeredPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex items-center gap-10 pr-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Total Supply</p>
                        <p className="font-semibold tabular-nums">{formatNumber(metalData.totals.total)}</p>
                      </div>
                      
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Registered</p>
                        <p className="font-semibold tabular-nums">{formatNumber(metalData.totals.registered)}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Coverage</p>
                        <div className="flex items-center gap-1">
                          {isStress ? (
                            <ArrowDownRight className="w-4 h-4 status-stress" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 status-adequate" />
                          )}
                          <span className={`font-bold tabular-nums text-lg ${
                            isStress ? 'status-stress' : isWatch ? 'status-watch' : 'status-adequate'
                          }`}>
                            {ratio.toFixed(2)}x
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-12 pb-6"
                  >
                    <div className="pt-4 border-t border-border mt-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Monthly Demand</p>
                          <p className="text-xl font-semibold tabular-nums">~{formatNumber(config.monthlyDemand)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Eligible Stock</p>
                          <p className="text-xl font-semibold tabular-nums">{formatNumber(metalData.totals.eligible)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Vaults</p>
                          <p className="text-xl font-semibold">{metalData.depositories.filter(d => d.total > 0).length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                          <p className={`text-xl font-semibold ${isStress ? 'status-stress' : isWatch ? 'status-watch' : 'status-adequate'}`}>
                            {isStress ? 'Stress' : isWatch ? 'Watch' : 'Adequate'}
                          </p>
                        </div>
                      </div>

                      {/* Top Depositories */}
                      <div className="mt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Depositories</p>
                        <div className="space-y-2">
                          {metalData.depositories
                            .filter(d => d.total > 0)
                            .sort((a, b) => b.total - a.total)
                            .slice(0, 5)
                            .map((dep, i) => {
                              const pct = metalData.totals.total > 0 ? (dep.total / metalData.totals.total) * 100 : 0;
                              return (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                  <span className="text-sm">{dep.name}</span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm tabular-nums text-muted-foreground">{formatNumber(dep.total)}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Demand Chart Section */}
      <section className="bg-muted/30">
        <div className="w-full px-12 lg:px-24 xl:px-32 py-16">
          <div className="flex items-end justify-between mb-10 pl-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Demand Trends</h2>
              <p className="text-muted-foreground mt-1">Monthly contract deliveries comparison</p>
            </div>
          </div>
          
          <div className="px-4">
            <DemandChart metal="silver" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="w-full px-12 lg:px-24 xl:px-32 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground px-4">
            <p>Data: CME Group DLV665-T Reports</p>
            <p>Updated January 21, 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
