'use client';

import { RiskScore, getRiskLevelColor, getRiskLevelBgColor } from '@/lib/riskScore';
import { AlertTriangle, TrendingUp, TrendingDown, FileStack, Coins, Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface RiskScoreTooltipProps {
  score: RiskScore;
  metalName: string;
}

interface FactorBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function FactorBar({ label, value, icon }: FactorBarProps) {
  const getBarColor = (val: number) => {
    if (val <= 25) return 'bg-emerald-500';
    if (val <= 50) return 'bg-amber-500';
    if (val <= 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 text-slate-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 ml-2">
            {Math.round(value)}
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getBarColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function RiskScoreTooltip({ score, metalName }: RiskScoreTooltipProps) {
  const levelColor = getRiskLevelColor(score.level);
  const levelBgColor = getRiskLevelBgColor(score.level);

  return (
    <div className="w-64 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${levelColor}`} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            {metalName} Risk
          </span>
        </div>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white ${levelBgColor}`}>
          {score.level}
        </span>
      </div>

      {/* Main Score */}
      <div className="mb-4">
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-4xl font-black tabular-nums ${levelColor}`}>
            {score.composite}
          </span>
          <span className="text-sm font-medium text-slate-400 mb-1">/100</span>
        </div>
        
        {/* Score Bar */}
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${levelBgColor}`}
            style={{ width: `${score.composite}%` }}
          />
        </div>
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-2.5 mb-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <FactorBar
          label="Coverage"
          value={score.breakdown.coverageRisk}
          icon={<Coins className="w-full h-full" />}
        />
        <FactorBar
          label="Paper/Physical"
          value={score.breakdown.paperPhysicalRisk}
          icon={<FileStack className="w-full h-full" />}
        />
        <FactorBar
          label="Inventory Trend"
          value={score.breakdown.inventoryTrendRisk}
          icon={<TrendingDown className="w-full h-full" />}
        />
        <FactorBar
          label="Delivery Rate"
          value={score.breakdown.deliveryVelocityRisk}
          icon={<TrendingUp className="w-full h-full" />}
        />
        <FactorBar
          label="Market Activity"
          value={score.breakdown.marketActivityRisk}
          icon={<Activity className="w-full h-full" />}
        />
      </div>

      {/* Commentary */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          {score.commentary}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
          <span className="font-semibold">Key factor:</span> {score.dominantFactor}
        </p>
        
        {/* Link to methodology */}
        <Link 
          href="/learn#risk-score"
          className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          <span>How is this calculated?</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
