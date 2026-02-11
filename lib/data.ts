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

export interface PercentChanges {
  registered: number | null;
  eligible: number | null;
  total: number | null;
}

export interface MetalChanges {
  day: PercentChanges;
  month: PercentChanges;
}

export interface MetalData {
  metal: string;
  report_date: string | null;
  activity_date: string | null;
  last_synced?: string | null;
  depositories: Depository[];
  totals: MetalTotals;
  changes?: MetalChanges;
}

export interface WarehouseStocksData {
  Gold: MetalData;
  Silver: MetalData;
  Copper: MetalData;
  Platinum_Palladium?: MetalData;
  Platinum?: MetalData;
  Palladium?: MetalData;
  Aluminum: MetalData;
  Zinc: MetalData;
  Lead?: MetalData;
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
  futuresSymbol?: string; // Symbol in bulletin data (e.g., 'GC', 'SI')
}

// Paper vs Physical ratio calculation
// Paper = Open Interest (total contracts * contract size) = total paper claims on metal
// Physical = Registered inventory = metal actually available for delivery
// Ratio > 1 means more paper claims than physical metal available
export interface PaperPhysicalData {
  openInterest: number; // Total open interest in contracts
  openInterestOz: number; // Open interest converted to ounces/units
  registeredInventory: number; // Registered inventory in same units
  ratio: number; // Paper claims / Physical metal
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

export function calculatePaperPhysicalRatio(
  openInterest: number,
  contractSize: number,
  registeredInventory: number
): PaperPhysicalData {
  const openInterestOz = openInterest * contractSize;
  const ratio = registeredInventory > 0 ? openInterestOz / registeredInventory : 0;
  
  // Risk levels based on how many paper claims exist per unit of physical
  let riskLevel: PaperPhysicalData['riskLevel'];
  if (ratio <= 2) {
    riskLevel = 'LOW';
  } else if (ratio <= 5) {
    riskLevel = 'MODERATE';
  } else if (ratio <= 10) {
    riskLevel = 'HIGH';
  } else {
    riskLevel = 'EXTREME';
  }
  
  return {
    openInterest,
    openInterestOz,
    registeredInventory,
    ratio,
    riskLevel,
  };
}

export function getPaperPhysicalRiskColor(riskLevel: PaperPhysicalData['riskLevel']): string {
  switch (riskLevel) {
    case 'LOW': return 'text-emerald-500';
    case 'MODERATE': return 'text-amber-500';
    case 'HIGH': return 'text-orange-500';
    case 'EXTREME': return 'text-red-500';
  }
}

export function getPaperPhysicalBgColor(riskLevel: PaperPhysicalData['riskLevel']): string {
  switch (riskLevel) {
    case 'LOW': return 'bg-emerald-500';
    case 'MODERATE': return 'bg-amber-500';
    case 'HIGH': return 'bg-orange-500';
    case 'EXTREME': return 'bg-red-500';
  }
}

// Monthly demand figures based on actual COMEX delivery data (Feb 5, 2026)
// Coverage ratio = registered inventory / monthly delivery demand
// This shows how many months of deliveries the registered inventory can cover
export const metalConfigs: MetalConfig[] = [
  {
    key: 'Gold',
    name: 'Gold',
    color: '#fbbf24',
    colorDark: '#fcd34d',
    unit: 'oz',
    contractSize: 100,
    // Feb 2026 MTD: 33,783 contracts = 3,378,300 oz actual delivery demand
    monthlyDemand: 3378300, // 33,783 contracts * 100 oz (Feb 9 MTD)
    pricePerUnit: 5051,  // Updated to Feb 9 settle price (GC FEB26)
    futuresSymbol: 'GC', // COMEX Gold Futures
  },
  {
    key: 'Silver',
    name: 'Silver',
    color: '#94a3b8',
    colorDark: '#cbd5e1',
    unit: 'oz',
    contractSize: 5000,
    // Feb 2026 MTD: 4,490 contracts = 22,450,000 oz actual delivery demand
    monthlyDemand: 22450000, // 4,490 contracts * 5,000 oz (Feb 9 MTD)
    pricePerUnit: 82,  // Updated to Feb 9 settle price (~$82.065/oz)
    futuresSymbol: 'SI', // COMEX Silver Futures
  },
  {
    key: 'Aluminum',
    name: 'Aluminum',
    color: '#64748b',
    colorDark: '#94a3b8',
    unit: 'metric tons',
    contractSize: 44,
    // Feb 2026 MTD: no aluminum deliveries reported
    monthlyDemand: 3212, // Using previous estimate (Feb 5 MTD)
    pricePerUnit: 3058,  // Updated to Feb 9 settle price (ALI)
    futuresSymbol: 'ALI', // COMEX Aluminum Futures
  },
  {
    key: 'Platinum',
    name: 'Platinum',
    color: '#a78bfa',
    colorDark: '#c4b5fd',
    unit: 'oz',
    contractSize: 50, // PL is 50 oz per contract
    // Feb 2026 MTD: 485 contracts = 24,250 oz
    monthlyDemand: 24250, // 485 contracts * 50 oz (Feb 10 MTD)
    pricePerUnit: 2109,  // PL settle price
    futuresSymbol: 'PL', // NYMEX Platinum Futures
  },
  {
    key: 'Palladium',
    name: 'Palladium',
    color: '#818cf8',
    colorDark: '#a5b4fc',
    unit: 'oz',
    contractSize: 100, // PA is 100 oz per contract
    // Feb 2026 MTD: 92 contracts = 9,200 oz
    monthlyDemand: 9200, // 92 contracts * 100 oz (Feb 10 MTD)
    pricePerUnit: 1050,  // PA settle price
    futuresSymbol: 'PA', // NYMEX Palladium Futures
  },
  {
    key: 'Copper',
    name: 'Copper',
    color: '#f97316',
    colorDark: '#fb923c',
    unit: 'short tons', // COMEX warehouse stocks are in short tons
    contractSize: 12.5, // 25,000 lbs = 12.5 short tons per contract
    // Feb 2026 MTD: 7,098 contracts = 88,725 short tons actual delivery demand
    monthlyDemand: 88725, // 7,098 contracts * 12.5 short tons (Feb 9 MTD)
    pricePerUnit: 11890, // ~$5.945/lb * 2000 lbs/short ton (Feb 9 settle)
    futuresSymbol: 'HG', // COMEX Copper Futures
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

// Validate and sanitize numeric values
function sanitizeNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return Math.max(0, value); // Ensure non-negative
  }
  return 0;
}

// Validate data structure
function validateMetalData(data: unknown): data is MetalData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  
  return (
    typeof d.metal === 'string' &&
    typeof d.totals === 'object' &&
    d.totals !== null &&
    Array.isArray(d.depositories)
  );
}

// Load data from API (with database percent changes) or fallback to JSON
export async function loadWarehouseData(): Promise<WarehouseStocksData | null> {
  try {
    // First try to load from API (includes percent changes from database)
    const apiData = await loadFromApi();
    if (apiData) {
      return apiData;
    }
    
    // Fallback to static JSON file
    return await loadFromJson();
  } catch (error) {
    console.error('Error loading warehouse data:', error);
    return null;
  }
}

// Load from API endpoint (server-side database)
async function loadFromApi(): Promise<WarehouseStocksData | null> {
  try {
    const response = await fetch('/api/metals', {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }
    
    return sanitizeData(result.data);
  } catch {
    // API not available, will fallback to JSON
    return null;
  }
}

// Load from static JSON file
async function loadFromJson(): Promise<WarehouseStocksData | null> {
  try {
    const response = await fetch('/data.json', {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Failed to load warehouse data:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return sanitizeData(data);
  } catch (error) {
    console.error('Error loading JSON data:', error);
    return null;
  }
}

// Sanitize and validate data
function sanitizeData(data: unknown): WarehouseStocksData | null {
  if (!data || typeof data !== 'object') {
    console.error('Invalid data format');
    return null;
  }
  
  const sanitized: WarehouseStocksData = {} as WarehouseStocksData;
  
  for (const [key, metalData] of Object.entries(data)) {
    if (validateMetalData(metalData)) {
      sanitized[key as keyof WarehouseStocksData] = {
        ...metalData,
        totals: {
          registered: sanitizeNumber(metalData.totals.registered),
          eligible: sanitizeNumber(metalData.totals.eligible),
          total: sanitizeNumber(metalData.totals.total),
        },
        depositories: metalData.depositories.map(dep => ({
          ...dep,
          registered: sanitizeNumber(dep.registered),
          eligible: sanitizeNumber(dep.eligible),
          total: sanitizeNumber(dep.total),
        })),
        changes: metalData.changes ? {
          day: {
            registered: metalData.changes.day?.registered ?? null,
            eligible: metalData.changes.day?.eligible ?? null,
            total: metalData.changes.day?.total ?? null,
          },
          month: {
            registered: metalData.changes.month?.registered ?? null,
            eligible: metalData.changes.month?.eligible ?? null,
            total: metalData.changes.month?.total ?? null,
          },
        } : undefined,
      };
    }
  }
  
  return sanitized;
}

// Format percent change for display
export function formatPercentChange(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Get color class for percent change
export function getPercentChangeColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-slate-400';
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-slate-400';
}

// Format price change for bulletin display
export function formatPriceChange(change: number): { text: string; color: string } {
  if (change === 0) {
    return { text: 'UNCH', color: 'text-slate-400' };
  }
  const sign = change > 0 ? '+' : '';
  return {
    text: `${sign}${change.toFixed(2)}`,
    color: change > 0 ? 'text-emerald-500' : 'text-red-500'
  };
}

// Format volume for compact display
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}
