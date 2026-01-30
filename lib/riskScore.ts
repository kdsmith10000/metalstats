// Risk Score Calculation Engine
// Uses weighted heuristic approach with piecewise linear normalization

export interface RiskFactors {
  coverageRatio: number;
  paperPhysicalRatio: number;
  inventoryChange30d: number | null; // percent change
  deliveryVelocity: number | null; // MTD deliveries / registered inventory
  oiChange: number | null; // percent change in open interest
}

export interface RiskScoreBreakdown {
  coverageRisk: number;
  paperPhysicalRisk: number;
  inventoryTrendRisk: number;
  deliveryVelocityRisk: number;
  marketActivityRisk: number;
}

export interface RiskScore {
  composite: number; // 0-100
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  breakdown: RiskScoreBreakdown;
  dominantFactor: string;
  commentary: string;
}

// Weights for each risk factor (must sum to 1.0)
const WEIGHTS = {
  coverage: 0.25,
  paperPhysical: 0.25,
  inventoryTrend: 0.20,
  deliveryVelocity: 0.15,
  marketActivity: 0.15,
};

/**
 * Calculate coverage ratio risk (0-100)
 * Higher coverage = lower risk
 * Thresholds: 12x+ = safe, 5-12x = watch, 2-5x = elevated, <2x = critical
 */
export function calculateCoverageRisk(ratio: number): number {
  if (ratio >= 12) return 0;
  if (ratio >= 8) return linearInterpolate(ratio, 8, 12, 25, 0);
  if (ratio >= 5) return linearInterpolate(ratio, 5, 8, 50, 25);
  if (ratio >= 2) return linearInterpolate(ratio, 2, 5, 75, 50);
  if (ratio >= 1) return linearInterpolate(ratio, 1, 2, 90, 75);
  return Math.min(100, 90 + (1 - ratio) * 10);
}

/**
 * Calculate paper/physical leverage risk (0-100)
 * Higher ratio = more paper claims per physical unit = higher risk
 * Thresholds: <2x = low, 2-5x = moderate, 5-10x = high, >10x = extreme
 */
export function calculatePaperPhysicalRisk(ratio: number): number {
  if (ratio <= 1) return 0;
  if (ratio <= 2) return linearInterpolate(ratio, 1, 2, 0, 25);
  if (ratio <= 5) return linearInterpolate(ratio, 2, 5, 25, 50);
  if (ratio <= 10) return linearInterpolate(ratio, 5, 10, 50, 75);
  if (ratio <= 20) return linearInterpolate(ratio, 10, 20, 75, 95);
  return Math.min(100, 95 + (ratio - 20) * 0.25);
}

/**
 * Calculate inventory trend risk (0-100)
 * Declining inventory = higher risk
 * Based on 30-day percent change in registered inventory
 */
export function calculateInventoryTrendRisk(percentChange: number | null): number {
  if (percentChange === null) return 50; // Neutral if no data
  
  // Growing inventory = low risk
  if (percentChange >= 10) return 0;
  if (percentChange >= 5) return linearInterpolate(percentChange, 5, 10, 15, 0);
  if (percentChange >= 0) return linearInterpolate(percentChange, 0, 5, 30, 15);
  
  // Declining inventory = elevated risk
  if (percentChange >= -5) return linearInterpolate(percentChange, -5, 0, 50, 30);
  if (percentChange >= -15) return linearInterpolate(percentChange, -15, -5, 70, 50);
  if (percentChange >= -30) return linearInterpolate(percentChange, -30, -15, 85, 70);
  if (percentChange >= -50) return linearInterpolate(percentChange, -50, -30, 95, 85);
  return Math.min(100, 95 + Math.abs(percentChange + 50) * 0.1);
}

/**
 * Calculate delivery velocity risk (0-100)
 * High delivery rate relative to inventory = higher risk
 * Velocity = MTD deliveries / registered inventory (annualized)
 */
export function calculateDeliveryVelocityRisk(
  mtdDeliveries: number | null,
  registeredInventory: number,
  daysIntoMonth: number = 29
): number {
  if (mtdDeliveries === null || registeredInventory <= 0) return 50; // Neutral if no data
  
  // Annualize the delivery rate
  const dailyRate = mtdDeliveries / daysIntoMonth;
  const annualizedDeliveries = dailyRate * 365;
  const velocityRatio = annualizedDeliveries / registeredInventory;
  
  // If annualized deliveries would exceed inventory within a year = high risk
  if (velocityRatio <= 0.5) return linearInterpolate(velocityRatio, 0, 0.5, 0, 25);
  if (velocityRatio <= 1) return linearInterpolate(velocityRatio, 0.5, 1, 25, 50);
  if (velocityRatio <= 2) return linearInterpolate(velocityRatio, 1, 2, 50, 75);
  if (velocityRatio <= 4) return linearInterpolate(velocityRatio, 2, 4, 75, 90);
  return Math.min(100, 90 + (velocityRatio - 4) * 2.5);
}

/**
 * Calculate market activity risk (0-100)
 * Rising open interest with tight physical = higher squeeze risk
 * Based on OI percent change
 */
export function calculateMarketActivityRisk(oiChange: number | null): number {
  if (oiChange === null) return 50; // Neutral if no data
  
  // Declining OI = lower risk (longs closing out)
  if (oiChange <= -20) return 10;
  if (oiChange <= -10) return linearInterpolate(oiChange, -20, -10, 10, 25);
  if (oiChange <= 0) return linearInterpolate(oiChange, -10, 0, 25, 40);
  
  // Rising OI = higher risk (more paper claims)
  if (oiChange <= 10) return linearInterpolate(oiChange, 0, 10, 40, 55);
  if (oiChange <= 25) return linearInterpolate(oiChange, 10, 25, 55, 70);
  if (oiChange <= 50) return linearInterpolate(oiChange, 25, 50, 70, 85);
  return Math.min(100, 85 + (oiChange - 50) * 0.3);
}

/**
 * Linear interpolation helper
 */
function linearInterpolate(
  value: number,
  minInput: number,
  maxInput: number,
  minOutput: number,
  maxOutput: number
): number {
  const t = (value - minInput) / (maxInput - minInput);
  return minOutput + t * (maxOutput - minOutput);
}

/**
 * Calculate composite risk score from all factors
 */
export function calculateCompositeRiskScore(factors: RiskFactors): RiskScore {
  const breakdown: RiskScoreBreakdown = {
    coverageRisk: calculateCoverageRisk(factors.coverageRatio),
    paperPhysicalRisk: calculatePaperPhysicalRisk(factors.paperPhysicalRatio),
    inventoryTrendRisk: calculateInventoryTrendRisk(factors.inventoryChange30d),
    deliveryVelocityRisk: 50, // Will be calculated separately with more data
    marketActivityRisk: calculateMarketActivityRisk(factors.oiChange),
  };

  // Calculate weighted composite
  const composite = Math.round(
    breakdown.coverageRisk * WEIGHTS.coverage +
    breakdown.paperPhysicalRisk * WEIGHTS.paperPhysical +
    breakdown.inventoryTrendRisk * WEIGHTS.inventoryTrend +
    breakdown.deliveryVelocityRisk * WEIGHTS.deliveryVelocity +
    breakdown.marketActivityRisk * WEIGHTS.marketActivity
  );

  // Determine risk level
  const level = getRiskLevel(composite);

  // Find dominant factor
  const dominantFactor = getDominantFactor(breakdown);

  // Generate commentary
  const commentary = generateCommentary(breakdown, level);

  return {
    composite,
    level,
    breakdown,
    dominantFactor,
    commentary,
  };
}

/**
 * Get risk level from composite score
 */
export function getRiskLevel(score: number): RiskScore['level'] {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'EXTREME';
}

/**
 * Get color for risk level
 */
export function getRiskLevelColor(level: RiskScore['level']): string {
  switch (level) {
    case 'LOW': return 'text-emerald-500';
    case 'MODERATE': return 'text-amber-500';
    case 'HIGH': return 'text-orange-500';
    case 'EXTREME': return 'text-red-500';
  }
}

/**
 * Get background color for risk level
 */
export function getRiskLevelBgColor(level: RiskScore['level']): string {
  switch (level) {
    case 'LOW': return 'bg-emerald-500';
    case 'MODERATE': return 'bg-amber-500';
    case 'HIGH': return 'bg-orange-500';
    case 'EXTREME': return 'bg-red-500';
  }
}

/**
 * Find the dominant risk factor
 */
function getDominantFactor(breakdown: RiskScoreBreakdown): string {
  const factors = [
    { name: 'Coverage', value: breakdown.coverageRisk },
    { name: 'Paper/Physical Leverage', value: breakdown.paperPhysicalRisk },
    { name: 'Inventory Trend', value: breakdown.inventoryTrendRisk },
    { name: 'Delivery Velocity', value: breakdown.deliveryVelocityRisk },
    { name: 'Market Activity', value: breakdown.marketActivityRisk },
  ];
  
  factors.sort((a, b) => b.value - a.value);
  return factors[0].name;
}

/**
 * Generate human-readable commentary based on risk factors
 */
function generateCommentary(breakdown: RiskScoreBreakdown, level: RiskScore['level']): string {
  const messages: string[] = [];

  // Coverage commentary
  if (breakdown.coverageRisk >= 70) {
    messages.push('Physical supply is critically tight');
  } else if (breakdown.coverageRisk >= 50) {
    messages.push('Supply coverage is below comfortable levels');
  }

  // Paper/Physical commentary
  if (breakdown.paperPhysicalRisk >= 70) {
    messages.push('Paper claims significantly exceed physical availability');
  } else if (breakdown.paperPhysicalRisk >= 50) {
    messages.push('Elevated paper leverage on physical metal');
  }

  // Inventory trend commentary
  if (breakdown.inventoryTrendRisk >= 70) {
    messages.push('Inventory declining rapidly');
  } else if (breakdown.inventoryTrendRisk >= 50) {
    messages.push('Inventory trend is negative');
  }

  // Market activity commentary
  if (breakdown.marketActivityRisk >= 70) {
    messages.push('Rising speculative interest');
  }

  // Default messages based on level
  if (messages.length === 0) {
    switch (level) {
      case 'LOW':
        return 'Market fundamentals appear stable with adequate physical backing.';
      case 'MODERATE':
        return 'Some factors warrant monitoring but no immediate concerns.';
      case 'HIGH':
        return 'Multiple risk factors elevated. Increased volatility possible.';
      case 'EXTREME':
        return 'Critical risk levels detected. Exercise caution.';
    }
  }

  return messages.slice(0, 2).join('. ') + '.';
}

/**
 * Format risk score for display
 */
export function formatRiskScore(score: number): string {
  return `${score}/100`;
}
