'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Depository, formatNumber } from '@/lib/data';

interface DepositoryTableProps {
  depositories: Depository[];
  metalName: string;
  unit: string;
}

export default function DepositoryTable({ depositories, metalName, unit }: DepositoryTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeDepositories = depositories.filter(d => d.total > 0);
  const grandTotal = activeDepositories.reduce((sum, d) => sum + d.total, 0);
  const sortedDepositories = [...activeDepositories].sort((a, b) => b.total - a.total);

  if (activeDepositories.length === 0) return null;

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{metalName}</h3>
            <p className="text-sm text-muted-foreground">
              {activeDepositories.length} vaults · {formatNumber(grandTotal)} {unit}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Depository</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Registered</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Eligible</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedDepositories.map((dep, i) => {
                  const pct = grandTotal > 0 ? (dep.total / grandTotal) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">{dep.name}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatNumber(dep.registered)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-sky-600 dark:text-sky-400">
                        {formatNumber(dep.eligible)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums font-medium">
                        {formatNumber(dep.total)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
