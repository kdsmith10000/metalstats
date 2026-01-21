// Type definitions for COMEX Metals data

export interface Depository {
  name: string;
  registered: number;
  eligible: number;
  total: number;
}

export interface MetalTotals {
  registered: number;
  eligible: number;
  total: number;
}

export interface MetalData {
  metal: string;
  report_date: string | null;
  activity_date: string | null;
  depositories: Depository[];
  totals: MetalTotals;
}

export interface WarehouseStocksData {
  Gold: MetalData;
  Silver: MetalData;
  Copper: MetalData;
  Platinum_Palladium: MetalData;
  Aluminum: MetalData;
  Zinc: MetalData;
  Lead: MetalData;
}

// Metal display configuration
export interface MetalConfig {
  key: keyof WarehouseStocksData;
  name: string;
  color: string;
  colorDark: string;
  unit: string;
  contractSize: number;
  monthlyDemand: number; // Projected Jan 2026 demand in units
  pricePerUnit: number;
}

export const metalConfigs: MetalConfig[] = [
  {
    key: 'Gold',
    name: 'Gold',
    color: '#fbbf24',
    colorDark: '#fcd34d',
    unit: 'oz',
    contractSize: 100,
    monthlyDemand: 775000, // ~7,750 contracts * 100 oz
    pricePerUnit: 2650,
  },
  {
    key: 'Silver',
    name: 'Silver',
    color: '#94a3b8',
    colorDark: '#cbd5e1',
    unit: 'oz',
    contractSize: 5000,
    monthlyDemand: 66000000,
    pricePerUnit: 30,
  },
  {
    key: 'Aluminum',
    name: 'Aluminum',
    color: '#64748b',
    colorDark: '#94a3b8',
    unit: 'metric tons',
    contractSize: 44,
    monthlyDemand: 10648,
    pricePerUnit: 2500,
  },
  {
    key: 'Platinum_Palladium',
    name: 'Platinum & Palladium',
    color: '#a78bfa',
    colorDark: '#c4b5fd',
    unit: 'oz',
    contractSize: 50,
    monthlyDemand: 50000,
    pricePerUnit: 1000,
  },
];

// Calculate coverage ratio and status
export function calculateCoverageRatio(registered: number, monthlyDemand: number): number {
  if (monthlyDemand === 0) return 0;
  return registered / monthlyDemand;
}

export function getSupplyStatus(ratio: number): {
  status: 'ADEQUATE' | 'WATCH' | 'STRESS';
  colorClass: string;
} {
  if (ratio >= 12) {
    return { status: 'ADEQUATE', colorClass: 'bg-emerald-500' };
  } else if (ratio >= 5) {
    return { status: 'WATCH', colorClass: 'bg-amber-500' };
  } else {
    return { status: 'STRESS', colorClass: 'bg-red-500' };
  }
}

// Format large numbers with commas
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format currency
export function formatCurrency(num: number): string {
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

// Convert ounces to metric tons
export function ozToMetricTons(oz: number): number {
  return oz / 32150.7;
}

// Load data from public JSON
export async function loadWarehouseData(): Promise<WarehouseStocksData | null> {
  try {
    const response = await fetch('/data.json');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
