'use client';

interface RatioGaugeProps {
  ratio: number;
  label?: string;
}

export default function RatioGauge({ ratio, label }: RatioGaugeProps) {
  // Clamp ratio for display (max 20x for gauge)
  const displayRatio = Math.min(ratio, 20);
  const percentage = (displayRatio / 20) * 100;
  
  // Determine color based on ratio
  const getColor = () => {
    if (ratio >= 12) return 'from-emerald-500 to-emerald-400';
    if (ratio >= 5) return 'from-amber-500 to-amber-400';
    return 'from-red-500 to-red-400';
  };

  const getTextColor = () => {
    if (ratio >= 12) return 'text-emerald-500 dark:text-emerald-400';
    if (ratio >= 5) return 'text-amber-500 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">{label}</span>
          <span className={`text-xl font-bold ${getTextColor()}`}>
            {ratio.toFixed(2)}x
          </span>
        </div>
      )}
      <div className="relative h-4 bg-[var(--muted)] rounded-full overflow-hidden">
        {/* Background markers */}
        <div className="absolute inset-0 flex">
          <div className="w-1/4 border-r border-[var(--border)]" title="5x" />
          <div className="w-1/4 border-r border-[var(--border)]" title="10x" />
          <div className="w-1/4 border-r border-[var(--border)]" title="15x" />
          <div className="w-1/4" title="20x" />
        </div>
        
        {/* Progress bar */}
        <div
          className={`absolute h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
        
        {/* Threshold markers */}
        <div 
          className="absolute h-full w-0.5 bg-amber-600/60 dark:bg-amber-400/60"
          style={{ left: '25%' }}
          title="5x threshold"
        />
        <div 
          className="absolute h-full w-0.5 bg-emerald-600/60 dark:bg-emerald-400/60"
          style={{ left: '60%' }}
          title="12x threshold"
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-[var(--muted-foreground)] font-medium">
        <span>0x</span>
        <span>5x</span>
        <span>12x</span>
        <span>20x+</span>
      </div>
    </div>
  );
}
