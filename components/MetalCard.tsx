'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MetalData, MetalConfig, formatNumber, formatCurrency, calculateCoverageRatio, getSupplyStatus } from '@/lib/data';

interface MetalCardProps {
  data: MetalData;
  config: MetalConfig;
}

export default function MetalCard({ data, config }: MetalCardProps) {
  const { totals } = data;
  const ratio = calculateCoverageRatio(totals.registered, config.monthlyDemand);
  const { status } = getSupplyStatus(ratio);
  
  const registeredPercent = totals.total > 0 ? (totals.registered / totals.total) * 100 : 0;
  const totalValue = totals.total * config.pricePerUnit;

  const statusVariant = {
    ADEQUATE: 'default' as const,
    WATCH: 'secondary' as const,
    STRESS: 'destructive' as const,
  };

  const statusTextColors = {
    ADEQUATE: 'text-emerald-600 dark:text-emerald-400',
    WATCH: 'text-amber-600 dark:text-amber-400',
    STRESS: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{config.name}</h3>
            <p className="text-sm text-muted-foreground">
              {data.activity_date ? `Updated ${data.activity_date}` : 'Latest data'}
            </p>
          </div>
          <Badge variant={statusVariant[status]}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Value */}
        <div className="space-y-1">
          <div className="text-3xl font-bold tabular-nums tracking-tight">
            {formatNumber(totals.total)}
          </div>
          <p className="text-sm text-muted-foreground">
            {config.unit} · {formatCurrency(totalValue)}
          </p>
        </div>

        {/* Inventory Split */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Registered</span>
              <span className="font-medium">{registeredPercent.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="text-muted-foreground">Eligible</span>
              <span className="font-medium">{(100 - registeredPercent).toFixed(0)}%</span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${registeredPercent}%` }} 
            />
            <div 
              className="h-full bg-sky-500 transition-all duration-500" 
              style={{ width: `${100 - registeredPercent}%` }} 
            />
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Coverage Ratio</p>
            <p className={`text-xl font-bold tabular-nums ${statusTextColors[status]}`}>
              {ratio.toFixed(2)}x
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Monthly Demand</p>
            <p className="text-xl font-bold tabular-nums">
              ~{formatNumber(config.monthlyDemand)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
