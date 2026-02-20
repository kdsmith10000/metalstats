'use client';

import { PaperPhysicalData, getPaperPhysicalRiskColor, getPaperPhysicalBgColor, formatNumber } from '@/lib/data';
import { FileStack } from 'lucide-react';

interface PaperPhysicalCardProps {
  metalName: string;
  data: PaperPhysicalData;
  unit: string;
  compact?: boolean;
}

function getRiskBorderColor(riskLevel: PaperPhysicalData['riskLevel']): string {
  switch (riskLevel) {
    case 'LOW': return 'border-emerald-500/20';
    case 'MODERATE': return 'border-amber-500/20';
    case 'HIGH': return 'border-orange-500/20';
    case 'EXTREME': return 'border-red-500/20';
  }
}

function getRiskGlowColor(riskLevel: PaperPhysicalData['riskLevel']): string {
  switch (riskLevel) {
    case 'LOW': return 'bg-emerald-500';
    case 'MODERATE': return 'bg-amber-500';
    case 'HIGH': return 'bg-orange-500';
    case 'EXTREME': return 'bg-red-500';
  }
}

export default function PaperPhysicalCard({ metalName, data, unit, compact = false }: PaperPhysicalCardProps) {
  const riskColor = getPaperPhysicalRiskColor(data.riskLevel);
  const bgColor = getPaperPhysicalBgColor(data.riskLevel);
  const borderColor = getRiskBorderColor(data.riskLevel);
  const glowColor = getRiskGlowColor(data.riskLevel);

  const physicalPercent = Math.min(100 / data.ratio, 100);
  const paperPercent = 100 - physicalPercent;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <FileStack className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Paper/Physical
          </span>
        </div>
        <p className={`text-lg font-black tabular-nums ${riskColor}`}>
          {data.ratio.toFixed(1)}:1
        </p>
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${bgColor} text-white`}>
          {data.riskLevel}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden border ${borderColor} bg-white dark:bg-slate-900/60 backdrop-blur-xl`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Paper vs Physical
        </span>
        <span className={`text-[10px] font-black uppercase px-2.5 py-1 ${bgColor} text-white tracking-wide`}>
          {data.riskLevel}
        </span>
      </div>

      {/* Ratio Hero */}
      <div className="px-5 pb-5">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tight ${riskColor}`}>
            {data.ratio.toFixed(1)}
          </span>
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">: 1</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          paper claims per physical {unit.replace(/s$/, '')}
        </p>
      </div>

      {/* Proportion Bar */}
      <div className="px-5 pb-4">
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-px">
          <div
            className={`h-full rounded-full ${glowColor} opacity-90 transition-all duration-700`}
            style={{ width: `${physicalPercent}%` }}
          />
          <div
            className="h-full rounded-full bg-blue-500 opacity-60 transition-all duration-700"
            style={{ width: `${paperPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-bold">
          <span className={riskColor}>Physical {physicalPercent.toFixed(0)}%</span>
          <span className="text-blue-500/70">Paper {paperPercent.toFixed(0)}%</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-slate-100 dark:border-slate-800" />

      {/* Stats Row */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        <div className="px-5 py-4">
          <p className="text-[10px] font-black text-blue-500/70 uppercase tracking-wider mb-1">Paper</p>
          <p className="text-base sm:text-lg font-black tabular-nums text-slate-900 dark:text-white">
            {formatNumber(data.openInterestOz)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
            {formatNumber(data.openInterest)} contracts
          </p>
        </div>
        <div className="px-5 py-4">
          <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${riskColor} opacity-80`}>Physical</p>
          <p className="text-base sm:text-lg font-black tabular-nums text-slate-900 dark:text-white">
            {formatNumber(data.registeredInventory)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            registered {unit}
          </p>
        </div>
      </div>
    </div>
  );
}
