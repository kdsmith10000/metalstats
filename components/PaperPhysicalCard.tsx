'use client';

import { PaperPhysicalData, getPaperPhysicalRiskColor, getPaperPhysicalBgColor, formatNumber } from '@/lib/data';
import { FileStack, Coins } from 'lucide-react';

interface PaperPhysicalCardProps {
  metalName: string;
  data: PaperPhysicalData;
  unit: string;
  compact?: boolean;
}

export default function PaperPhysicalCard({ metalName, data, unit, compact = false }: PaperPhysicalCardProps) {
  const riskColor = getPaperPhysicalRiskColor(data.riskLevel);
  const bgColor = getPaperPhysicalBgColor(data.riskLevel);
  
  if (compact) {
    // Compact version for hero cards
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

  // Full version for expanded detail view
  return (
    <div className="p-4 sm:p-6 bg-white/40 dark:bg-black/40 rounded-xl sm:rounded-2xl border border-white/30">
      <div className="flex items-center gap-2 mb-4">
        <FileStack className="w-5 h-5 text-slate-500" />
        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Paper vs Physical
        </h4>
        <span className={`ml-auto text-[10px] font-black uppercase px-2 py-1 rounded-full ${bgColor} text-white`}>
          {data.riskLevel} LEVERAGE
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Paper Side */}
        <div className="text-center p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <FileStack className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Paper Claims</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {formatNumber(data.openInterestOz)}
          </p>
          <p className="text-[9px] text-slate-400 mt-1">
            {formatNumber(data.openInterest)} contracts
          </p>
        </div>
        
        {/* Physical Side */}
        <div className="text-center p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Physical Metal</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {formatNumber(data.registeredInventory)}
          </p>
          <p className="text-[9px] text-slate-400 mt-1">
            registered {unit}
          </p>
        </div>
      </div>
      
      {/* Ratio Display */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500">
            For every 1 {unit.replace(/s$/, '')} of physical metal:
          </span>
          <span className={`text-xl sm:text-2xl font-black ${riskColor}`}>
            {data.ratio.toFixed(2)} paper claims
          </span>
        </div>
        
        {/* Visual Bar */}
        <div className="mt-3 h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.min(100 / data.ratio, 100)}%` }}
            title="Physical"
          />
          <div 
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(100 - (100 / data.ratio), 99)}%` }}
            title="Paper"
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] font-bold">
          <span className="text-amber-500">Physical</span>
          <span className="text-blue-500">Paper</span>
        </div>
      </div>
      
      {/* Explanation */}
      <p className="mt-4 text-[10px] text-slate-400 leading-relaxed">
        {data.riskLevel === 'EXTREME' && 
          `Warning: ${data.ratio.toFixed(1)}x more paper claims than physical metal. If holders demand delivery simultaneously, COMEX cannot fulfill all claims.`
        }
        {data.riskLevel === 'HIGH' && 
          `Elevated leverage: ${data.ratio.toFixed(1)}x paper claims per unit of physical. Market is vulnerable to delivery squeezes.`
        }
        {data.riskLevel === 'MODERATE' && 
          `Moderate leverage: ${data.ratio.toFixed(1)}x paper claims per physical unit. Standard futures market dynamics.`
        }
        {data.riskLevel === 'LOW' && 
          `Low leverage: ${data.ratio.toFixed(1)}x paper claims per physical unit. Healthy physical backing.`
        }
      </p>
    </div>
  );
}
