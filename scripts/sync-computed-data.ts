import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const sql = neon(process.env.DATABASE_URL!);

// ── Metal configurations ───────────────────────────────────────────────
const METAL_CONFIGS = [
  { key: 'Gold', symbol: 'GC', contractSize: 100, monthlyDemand: 3543600, unit: 'oz' },
  { key: 'Silver', symbol: 'SI', contractSize: 5000, monthlyDemand: 22975000, unit: 'oz' },
  { key: 'Copper', symbol: 'HG', contractSize: 12.5, monthlyDemand: 93062.5, unit: 'short tons' },
  { key: 'Platinum', symbol: 'PL', contractSize: 50, monthlyDemand: 24250, unit: 'oz' },
  { key: 'Palladium', symbol: 'PA', contractSize: 100, monthlyDemand: 9200, unit: 'oz' },
];

function getRiskLevel(ratio: number): string {
  if (ratio <= 2) return 'LOW';
  if (ratio <= 5) return 'MODERATE';
  if (ratio <= 10) return 'HIGH';
  return 'EXTREME';
}

// ── Risk score calculation (mirrors lib/riskScore.ts) ────────────────
function linearInterpolate(value: number, minIn: number, maxIn: number, minOut: number, maxOut: number): number {
  const t = (value - minIn) / (maxIn - minIn);
  return minOut + t * (maxOut - minOut);
}

function calcCoverageRisk(ratio: number): number {
  if (ratio >= 12) return 0;
  if (ratio >= 8) return linearInterpolate(ratio, 8, 12, 25, 0);
  if (ratio >= 5) return linearInterpolate(ratio, 5, 8, 50, 25);
  if (ratio >= 2) return linearInterpolate(ratio, 2, 5, 75, 50);
  if (ratio >= 1) return linearInterpolate(ratio, 1, 2, 90, 75);
  return Math.min(100, 90 + (1 - ratio) * 10);
}

function calcPaperPhysicalRisk(ratio: number): number {
  if (ratio <= 1) return 0;
  if (ratio <= 2) return linearInterpolate(ratio, 1, 2, 0, 25);
  if (ratio <= 5) return linearInterpolate(ratio, 2, 5, 25, 50);
  if (ratio <= 10) return linearInterpolate(ratio, 5, 10, 50, 75);
  if (ratio <= 20) return linearInterpolate(ratio, 10, 20, 75, 95);
  return Math.min(100, 95 + (ratio - 20) * 0.25);
}

function calcInventoryTrendRisk(pctChange: number | null): number {
  if (pctChange === null) return 50;
  if (pctChange >= 10) return 0;
  if (pctChange >= 5) return linearInterpolate(pctChange, 5, 10, 15, 0);
  if (pctChange >= 0) return linearInterpolate(pctChange, 0, 5, 30, 15);
  if (pctChange >= -5) return linearInterpolate(pctChange, -5, 0, 50, 30);
  if (pctChange >= -15) return linearInterpolate(pctChange, -15, -5, 70, 50);
  if (pctChange >= -30) return linearInterpolate(pctChange, -30, -15, 85, 70);
  if (pctChange >= -50) return linearInterpolate(pctChange, -50, -30, 95, 85);
  return Math.min(100, 95 + Math.abs(pctChange + 50) * 0.1);
}

function calcMarketActivityRisk(oiChange: number | null): number {
  if (oiChange === null) return 50;
  if (oiChange <= -20) return 10;
  if (oiChange <= -10) return linearInterpolate(oiChange, -20, -10, 10, 25);
  if (oiChange <= 0) return linearInterpolate(oiChange, -10, 0, 25, 40);
  if (oiChange <= 10) return linearInterpolate(oiChange, 0, 10, 40, 55);
  if (oiChange <= 25) return linearInterpolate(oiChange, 10, 25, 55, 70);
  if (oiChange <= 50) return linearInterpolate(oiChange, 25, 50, 70, 85);
  return Math.min(100, 85 + (oiChange - 50) * 0.3);
}

function getCompositeRiskLevel(score: number): string {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'EXTREME';
}

function getDominantFactor(b: Record<string, number>): string {
  const factors = [
    { name: 'Coverage', value: b.coverage },
    { name: 'Paper/Physical Leverage', value: b.paperPhysical },
    { name: 'Inventory Trend', value: b.inventoryTrend },
    { name: 'Delivery Velocity', value: b.deliveryVelocity },
    { name: 'Market Activity', value: b.marketActivity },
  ];
  factors.sort((a, b2) => b2.value - a.value);
  return factors[0].name;
}

function generateCommentary(b: Record<string, number>, level: string): string {
  const msgs: string[] = [];
  if (b.coverage >= 70) msgs.push('Physical supply is critically tight');
  else if (b.coverage >= 50) msgs.push('Supply coverage is below comfortable levels');
  if (b.paperPhysical >= 70) msgs.push('Paper claims significantly exceed physical availability');
  else if (b.paperPhysical >= 50) msgs.push('Elevated paper leverage on physical metal');
  if (b.inventoryTrend >= 70) msgs.push('Inventory declining rapidly');
  else if (b.inventoryTrend >= 50) msgs.push('Inventory trend is negative');
  if (b.marketActivity >= 70) msgs.push('Rising speculative interest');
  if (msgs.length === 0) {
    if (level === 'LOW') return 'Market fundamentals appear stable with adequate physical backing.';
    if (level === 'MODERATE') return 'Some factors warrant monitoring but no immediate concerns.';
    if (level === 'HIGH') return 'Multiple risk factors elevated. Increased volatility possible.';
    return 'Critical risk levels detected. Exercise caution.';
  }
  return msgs.slice(0, 2).join('. ') + '.';
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');

  // Load data files
  const warehouseData = JSON.parse(fs.readFileSync(path.join(publicDir, 'data.json'), 'utf-8'));
  const volumeSummary = JSON.parse(fs.readFileSync(path.join(publicDir, 'volume_summary.json'), 'utf-8'));
  const deliveryData = JSON.parse(fs.readFileSync(path.join(publicDir, 'delivery.json'), 'utf-8'));

  const reportDate = volumeSummary.parsed_date || new Date().toISOString().split('T')[0];
  console.log(`\n📊 Syncing computed data for report date: ${reportDate}\n`);

  // ── Ensure tables exist ──────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS open_interest_snapshots (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      report_date DATE NOT NULL,
      open_interest BIGINT NOT NULL DEFAULT 0,
      oi_change INTEGER NOT NULL DEFAULT 0,
      total_volume BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, report_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS paper_physical_snapshots (
      id SERIAL PRIMARY KEY,
      metal VARCHAR(50) NOT NULL,
      report_date DATE NOT NULL,
      futures_symbol VARCHAR(20) NOT NULL,
      open_interest BIGINT NOT NULL DEFAULT 0,
      open_interest_units DECIMAL(20, 3) NOT NULL DEFAULT 0,
      registered_inventory DECIMAL(20, 3) NOT NULL DEFAULT 0,
      paper_physical_ratio DECIMAL(10, 4) NOT NULL DEFAULT 0,
      risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metal, report_date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS risk_score_snapshots (
      id SERIAL PRIMARY KEY,
      metal VARCHAR(50) NOT NULL,
      report_date DATE NOT NULL,
      composite_score INTEGER NOT NULL DEFAULT 0,
      risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
      coverage_risk INTEGER NOT NULL DEFAULT 0,
      paper_physical_risk INTEGER NOT NULL DEFAULT 0,
      inventory_trend_risk INTEGER NOT NULL DEFAULT 0,
      delivery_velocity_risk INTEGER NOT NULL DEFAULT 0,
      market_activity_risk INTEGER NOT NULL DEFAULT 0,
      dominant_factor VARCHAR(100) NOT NULL DEFAULT '',
      commentary TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metal, report_date)
    )
  `;

  // ── 1. Sync Paper/Physical Ratios ────────────────────────────────────
  console.log('=== PAPER/PHYSICAL RATIOS ===');
  const ppResults: { metal: string; ratio: number; risk: string }[] = [];

  for (const config of METAL_CONFIGS) {
    const metalData = warehouseData[config.key];
    if (!metalData?.totals?.registered) {
      console.log(`  ⏭ ${config.key}: No inventory data`);
      continue;
    }

    const registeredInventory = metalData.totals.registered;

    // Get open interest for this metal's symbol
    let openInterest = 0;
    const product = volumeSummary.products?.find((p: { symbol: string }) => p.symbol === config.symbol);
    if (product) {
      openInterest = product.open_interest || 0;
    }

    if (openInterest === 0) {
      console.log(`  ⏭ ${config.key}: No OI data for ${config.symbol}`);
      continue;
    }

    const openInterestUnits = openInterest * config.contractSize;
    const ratio = registeredInventory > 0 ? openInterestUnits / registeredInventory : 0;
    const riskLevel = getRiskLevel(ratio);

    await sql`
      INSERT INTO paper_physical_snapshots (metal, report_date, futures_symbol, open_interest, open_interest_units, registered_inventory, paper_physical_ratio, risk_level)
      VALUES (${config.key}, ${reportDate}::date, ${config.symbol}, ${openInterest}, ${openInterestUnits}, ${registeredInventory}, ${ratio}, ${riskLevel})
      ON CONFLICT (metal, report_date) 
      DO UPDATE SET 
        futures_symbol = EXCLUDED.futures_symbol,
        open_interest = EXCLUDED.open_interest,
        open_interest_units = EXCLUDED.open_interest_units,
        registered_inventory = EXCLUDED.registered_inventory,
        paper_physical_ratio = EXCLUDED.paper_physical_ratio,
        risk_level = EXCLUDED.risk_level,
        created_at = CURRENT_TIMESTAMP
    `;

    ppResults.push({ metal: config.key, ratio: Math.round(ratio * 100) / 100, risk: riskLevel });
    console.log(`  ✅ ${config.key}: ${ratio.toFixed(2)}:1 (${riskLevel}) — OI ${openInterest.toLocaleString()} × ${config.contractSize} = ${openInterestUnits.toLocaleString()} ${config.unit} vs ${registeredInventory.toLocaleString()} registered`);
  }

  // ── 2. Sync Risk Scores ──────────────────────────────────────────────
  console.log('\n=== RISK SCORES ===');
  const riskResults: { metal: string; score: number; level: string }[] = [];

  for (const config of METAL_CONFIGS) {
    const metalData = warehouseData[config.key];
    if (!metalData?.totals?.registered) continue;

    const registered = metalData.totals.registered;
    const coverageRatio = config.monthlyDemand > 0 ? registered / config.monthlyDemand : 0;

    // Paper/physical from volume data
    let openInterest = 0;
    const product = volumeSummary.products?.find((p: { symbol: string }) => p.symbol === config.symbol);
    if (product) openInterest = product.open_interest || 0;
    const ppRatio = openInterest > 0 && registered > 0 
      ? (openInterest * config.contractSize) / registered 
      : 1;

    // Get OI change percentage (year-over-year)
    let oiChangePct: number | null = null;
    if (product && product.yoy_open_interest > 0) {
      oiChangePct = ((product.open_interest - product.yoy_open_interest) / product.yoy_open_interest) * 100;
    }

    // Get 30-day inventory change from DB
    let inventoryChange30d: number | null = null;
    try {
      const prev = await sql`
        SELECT registered FROM metal_snapshots
        WHERE metal = ${config.key}
          AND report_date <= CURRENT_DATE - 30
        ORDER BY report_date DESC LIMIT 1
      `;
      if (prev.length > 0 && Number(prev[0].registered) > 0) {
        inventoryChange30d = ((registered - Number(prev[0].registered)) / Number(prev[0].registered)) * 100;
      }
    } catch {
      // No historical data available
    }

    // Calculate risk breakdown
    const breakdown = {
      coverage: calcCoverageRisk(coverageRatio),
      paperPhysical: calcPaperPhysicalRisk(ppRatio),
      inventoryTrend: calcInventoryTrendRisk(inventoryChange30d),
      deliveryVelocity: 50, // Neutral baseline
      marketActivity: calcMarketActivityRisk(oiChangePct),
    };

    // Get delivery velocity if available
    const delivery = deliveryData.deliveries?.find((d: { metal: string }) => d.metal === config.key);
    if (delivery && delivery.month_to_date > 0 && registered > 0) {
      const mtdContracts = delivery.month_to_date;
      const mtdUnits = mtdContracts * config.contractSize;
      const daysIntoMonth = new Date().getDate();
      const dailyRate = mtdUnits / Math.max(daysIntoMonth, 1);
      const annualized = dailyRate * 365;
      const velocityRatio = annualized / registered;

      if (velocityRatio <= 0.5) breakdown.deliveryVelocity = linearInterpolate(velocityRatio, 0, 0.5, 0, 25);
      else if (velocityRatio <= 1) breakdown.deliveryVelocity = linearInterpolate(velocityRatio, 0.5, 1, 25, 50);
      else if (velocityRatio <= 2) breakdown.deliveryVelocity = linearInterpolate(velocityRatio, 1, 2, 50, 75);
      else if (velocityRatio <= 4) breakdown.deliveryVelocity = linearInterpolate(velocityRatio, 2, 4, 75, 90);
      else breakdown.deliveryVelocity = Math.min(100, 90 + (velocityRatio - 4) * 2.5);
    }

    const composite = Math.round(
      breakdown.coverage * 0.25 +
      breakdown.paperPhysical * 0.25 +
      breakdown.inventoryTrend * 0.20 +
      breakdown.deliveryVelocity * 0.15 +
      breakdown.marketActivity * 0.15
    );
    const level = getCompositeRiskLevel(composite);
    const dominantFactor = getDominantFactor(breakdown);
    const commentary = generateCommentary(breakdown, level);

    await sql`
      INSERT INTO risk_score_snapshots (metal, report_date, composite_score, risk_level, coverage_risk, paper_physical_risk, inventory_trend_risk, delivery_velocity_risk, market_activity_risk, dominant_factor, commentary)
      VALUES (${config.key}, ${reportDate}::date, ${composite}, ${level}, ${Math.round(breakdown.coverage)}, ${Math.round(breakdown.paperPhysical)}, ${Math.round(breakdown.inventoryTrend)}, ${Math.round(breakdown.deliveryVelocity)}, ${Math.round(breakdown.marketActivity)}, ${dominantFactor}, ${commentary})
      ON CONFLICT (metal, report_date) 
      DO UPDATE SET 
        composite_score = EXCLUDED.composite_score,
        risk_level = EXCLUDED.risk_level,
        coverage_risk = EXCLUDED.coverage_risk,
        paper_physical_risk = EXCLUDED.paper_physical_risk,
        inventory_trend_risk = EXCLUDED.inventory_trend_risk,
        delivery_velocity_risk = EXCLUDED.delivery_velocity_risk,
        market_activity_risk = EXCLUDED.market_activity_risk,
        dominant_factor = EXCLUDED.dominant_factor,
        commentary = EXCLUDED.commentary,
        created_at = CURRENT_TIMESTAMP
    `;

    riskResults.push({ metal: config.key, score: composite, level });
    console.log(`  ✅ ${config.key}: ${composite}/100 (${level}) — ${dominantFactor}`);
    console.log(`     Coverage: ${Math.round(breakdown.coverage)} | P/P: ${Math.round(breakdown.paperPhysical)} | Inv: ${Math.round(breakdown.inventoryTrend)} | Del: ${Math.round(breakdown.deliveryVelocity)} | Mkt: ${Math.round(breakdown.marketActivity)}`);
  }

  // ── 3. Update analysis_summary.json ──────────────────────────────────
  console.log('\n=== ANALYSIS SUMMARY ===');
  
  const avgScore = riskResults.length > 0
    ? Math.round(riskResults.reduce((s, r) => s + r.score, 0) / riskResults.length)
    : 0;
  const avgLevel = getCompositeRiskLevel(avgScore);
  const highRiskCount = riskResults.filter(r => ['HIGH', 'EXTREME'].includes(r.level)).length;

  const analysisSummary = {
    report_date: reportDate,
    generated_at: new Date().toISOString(),
    market_overview: {
      metals_analyzed: riskResults.length,
      average_risk_score: avgScore,
      average_risk_level: avgLevel,
      high_risk_metals: highRiskCount,
      risk_ranking: riskResults
        .sort((a, b) => b.score - a.score)
        .map(r => ({ metal: r.metal, score: r.score, level: r.level })),
    },
    paper_physical: ppResults.map(p => ({
      metal: p.metal,
      ratio: p.ratio,
      risk_level: p.risk,
    })),
  };

  fs.writeFileSync(
    path.join(publicDir, 'analysis_summary.json'),
    JSON.stringify(analysisSummary, null, 2)
  );
  console.log(`  ✅ Written analysis_summary.json`);
  console.log(`     Avg Risk: ${avgScore}/100 (${avgLevel}), ${highRiskCount} high-risk metals`);

  console.log('\n✅ All computed data synced successfully!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
