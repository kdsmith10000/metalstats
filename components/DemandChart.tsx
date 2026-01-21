'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';

const deliveryData = {
  gold: [
    { month: 'Jan', y2025: 2370, y2026: 7750 },
    { month: 'Feb', y2025: 3300, y2026: null },
    { month: 'Mar', y2025: 2400, y2026: null },
    { month: 'Apr', y2025: 6200, y2026: null },
    { month: 'May', y2025: 2100, y2026: null },
    { month: 'Jun', y2025: 5500, y2026: null },
    { month: 'Jul', y2025: 2200, y2026: null },
    { month: 'Aug', y2025: 4800, y2026: null },
    { month: 'Sep', y2025: 2300, y2026: null },
    { month: 'Oct', y2025: 5100, y2026: null },
    { month: 'Nov', y2025: 2400, y2026: null },
    { month: 'Dec', y2025: 52532, y2026: null },
  ],
  silver: [
    { month: 'Jan', y2025: 3083, y2026: 13200 },
    { month: 'Feb', y2025: 2800, y2026: null },
    { month: 'Mar', y2025: 5100, y2026: null },
    { month: 'Apr', y2025: 3200, y2026: null },
    { month: 'May', y2025: 4500, y2026: null },
    { month: 'Jun', y2025: 3800, y2026: null },
    { month: 'Jul', y2025: 5200, y2026: null },
    { month: 'Aug', y2025: 3600, y2026: null },
    { month: 'Sep', y2025: 4900, y2026: null },
    { month: 'Oct', y2025: 3400, y2026: null },
    { month: 'Nov', y2025: 4200, y2026: null },
    { month: 'Dec', y2025: 6367, y2026: null },
  ],
  aluminum: [
    { month: 'Jan', y2025: 209, y2026: 242 },
    { month: 'Feb', y2025: 98, y2026: null },
    { month: 'Mar', y2025: 159, y2026: null },
    { month: 'Apr', y2025: 300, y2026: null },
    { month: 'May', y2025: 169, y2026: null },
    { month: 'Jun', y2025: 148, y2026: null },
    { month: 'Jul', y2025: 81, y2026: null },
    { month: 'Aug', y2025: 45, y2026: null },
    { month: 'Sep', y2025: 111, y2026: null },
    { month: 'Oct', y2025: 41, y2026: null },
    { month: 'Nov', y2025: 46, y2026: null },
    { month: 'Dec', y2025: 317, y2026: null },
  ],
};

// Stats for each metal
const metalStats = {
  gold: {
    total2025: 91202,
    jan2026: 7750,
    jan2025: 2370,
  },
  silver: {
    total2025: 50150,
    jan2026: 13200,
    jan2025: 3083,
  },
  aluminum: {
    total2025: 1724,
    jan2026: 242,
    jan2025: 209,
  },
};

interface DemandChartProps {
  metal?: 'gold' | 'silver' | 'aluminum';
}

export default function DemandChart({ metal = 'silver' }: DemandChartProps) {
  const { theme } = useTheme();
  const [selectedMetal, setSelectedMetal] = useState(metal);
  const isDark = theme === 'dark';
  
  const data = deliveryData[selectedMetal];
  const stats = metalStats[selectedMetal];
  
  // Calculate YoY change
  const yoyChange = stats.jan2025 > 0 
    ? ((stats.jan2026 - stats.jan2025) / stats.jan2025 * 100).toFixed(0)
    : 0;
  const isPositive = Number(yoyChange) >= 0;

  const metalLabels = {
    gold: 'Gold',
    silver: 'Silver',
    aluminum: 'Aluminum',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {Object.entries(metalLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedMetal(key as 'gold' | 'silver' | 'aluminum')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                selectedMetal === key 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: isDark ? 'hsl(240 5% 64.9%)' : 'hsl(240 3.8% 46.1%)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? 'hsl(240 10% 3.9%)' : 'hsl(0 0% 100%)',
                  border: `1px solid ${isDark ? 'hsl(240 3.7% 15.9%)' : 'hsl(240 5.9% 90%)'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number | undefined) => [value ? value.toLocaleString() : '—', '']}
              />
              <Bar 
                dataKey="y2025" 
                fill={isDark ? 'hsl(240 3.7% 25%)' : 'hsl(240 5.9% 85%)'} 
                radius={[4, 4, 0, 0]} 
                name="2025" 
              />
              <Bar 
                dataKey="y2026" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                name="2026" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted-foreground/30" />
            <span className="text-muted-foreground">2025</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-muted-foreground">2026</span>
          </div>
        </div>
      </div>

      {/* Stats Panel - Updates based on selected metal */}
      <div className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">2025 Total</p>
          <p className="text-3xl font-bold tabular-nums">{stats.total2025.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">contracts delivered</p>
        </div>
        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Jan 2026</p>
          <p className="text-3xl font-bold tabular-nums">{stats.jan2026.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">projected</p>
        </div>
        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">YoY Change</p>
          <p className={`text-3xl font-bold tabular-nums ${isPositive ? 'status-adequate' : 'status-stress'}`}>
            {isPositive ? '+' : ''}{yoyChange}%
          </p>
          <p className="text-sm text-muted-foreground">vs Jan 2025</p>
        </div>
      </div>
    </div>
  );
}
