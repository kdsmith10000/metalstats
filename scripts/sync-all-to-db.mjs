#!/usr/bin/env node
/**
 * Master sync script: Parse, analyze, and sync ALL data to Neon database
 * Handles: warehouse stocks, bulletin, delivery, volume summary, 
 *          paper/physical ratios, and risk scores
 * 
 * Usage: node --env-file=.env scripts/sync-all-to-db.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ============================================
// CONFIGURATION
// ============================================

const METAL_CONFIGS = [
  { key: 'Gold', futuresSymbol: 'GC', contractSize: 100, monthlyDemand: 3543600, unit: 'oz' },        // 35,436 contracts * 100 oz (Feb 11 MTD)
  { key: 'Silver', futuresSymbol: 'SI', contractSize: 5000, monthlyDemand: 22975000, unit: 'oz' },    // 4,595 contracts * 5,000 oz (Feb 11 MTD)
  { key: 'Copper', futuresSymbol: 'HG', contractSize: 12.5, monthlyDemand: 93062.5, unit: 'short tons' }, // 7,445 contracts * 12.5 ST (Feb 11 MTD)
  { key: 'Platinum', futuresSymbol: 'PL', contractSize: 50, monthlyDemand: 24250, unit: 'oz' },       // 485 contracts * 50 oz (Feb 10 MTD)
  { key: 'Palladium', futuresSymbol: 'PA', contractSize: 50, monthlyDemand: 4600, unit: 'oz' },       // 92 contracts * 50 oz (Feb 10 MTD) — PA is 100 oz/contract
  { key: 'Platinum_Palladium', futuresSymbol: 'PL+PA', contractSize: 50, monthlyDemand: 33450, unit: 'oz' }, // 485*50 + 92*100 = 24,250+9,200 = 33,450 oz
  { key: 'Aluminum', futuresSymbol: 'ALI', contractSize: 44, monthlyDemand: 3344, unit: 'metric tons' }, // 76 contracts * 44 MT (Feb 11 MTD)
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Try Date parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function loadJson(filename) {
  const filePath = join(rootDir, 'public', filename);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`[WARN] Could not load ${filename}: ${e.message}`);
    return null;
  }
}

function linearInterpolate(value, minInput, maxInput, minOutput, maxOutput) {
  const t = (value - minInput) / (maxInput - minInput);
  return minOutput + t * (maxOutput - minOutput);
}

// ============================================
// RISK SCORE CALCULATIONS
// ============================================

function calculateCoverageRisk(ratio) {
  if (ratio >= 12) return 0;
  if (ratio >= 8) return linearInterpolate(ratio, 8, 12, 25, 0);
  if (ratio >= 5) return linearInterpolate(ratio, 5, 8, 50, 25);
  if (ratio >= 2) return linearInterpolate(ratio, 2, 5, 75, 50);
  if (ratio >= 1) return linearInterpolate(ratio, 1, 2, 90, 75);
  return Math.min(100, 90 + (1 - ratio) * 10);
}

function calculatePaperPhysicalRisk(ratio) {
  if (ratio <= 1) return 0;
  if (ratio <= 2) return linearInterpolate(ratio, 1, 2, 0, 25);
  if (ratio <= 5) return linearInterpolate(ratio, 2, 5, 25, 50);
  if (ratio <= 10) return linearInterpolate(ratio, 5, 10, 50, 75);
  if (ratio <= 20) return linearInterpolate(ratio, 10, 20, 75, 95);
  return Math.min(100, 95 + (ratio - 20) * 0.25);
}

function calculateInventoryTrendRisk(percentChange) {
  if (percentChange === null) return 50;
  if (percentChange >= 10) return 0;
  if (percentChange >= 5) return linearInterpolate(percentChange, 5, 10, 15, 0);
  if (percentChange >= 0) return linearInterpolate(percentChange, 0, 5, 30, 15);
  if (percentChange >= -5) return linearInterpolate(percentChange, -5, 0, 50, 30);
  if (percentChange >= -15) return linearInterpolate(percentChange, -15, -5, 70, 50);
  if (percentChange >= -30) return linearInterpolate(percentChange, -30, -15, 85, 70);
  if (percentChange >= -50) return linearInterpolate(percentChange, -50, -30, 95, 85);
  return Math.min(100, 95 + Math.abs(percentChange + 50) * 0.1);
}

function calculateDeliveryVelocityRisk(mtdDeliveries, registeredInventory, daysIntoMonth = 4) {
  if (mtdDeliveries === null || registeredInventory <= 0) return 50;
  const dailyRate = mtdDeliveries / Math.max(daysIntoMonth, 1);
  const annualizedDeliveries = dailyRate * 365;
  const velocityRatio = annualizedDeliveries / registeredInventory;
  if (velocityRatio <= 0.5) return linearInterpolate(velocityRatio, 0, 0.5, 0, 25);
  if (velocityRatio <= 1) return linearInterpolate(velocityRatio, 0.5, 1, 25, 50);
  if (velocityRatio <= 2) return linearInterpolate(velocityRatio, 1, 2, 50, 75);
  if (velocityRatio <= 4) return linearInterpolate(velocityRatio, 2, 4, 75, 90);
  return Math.min(100, 90 + (velocityRatio - 4) * 2.5);
}

function calculateMarketActivityRisk(oiChange) {
  if (oiChange === null) return 50;
  if (oiChange <= -20) return 10;
  if (oiChange <= -10) return linearInterpolate(oiChange, -20, -10, 10, 25);
  if (oiChange <= 0) return linearInterpolate(oiChange, -10, 0, 25, 40);
  if (oiChange <= 10) return linearInterpolate(oiChange, 0, 10, 40, 55);
  if (oiChange <= 25) return linearInterpolate(oiChange, 10, 25, 55, 70);
  if (oiChange <= 50) return linearInterpolate(oiChange, 25, 50, 70, 85);
  return Math.min(100, 85 + (oiChange - 50) * 0.3);
}

function getRiskLevel(score) {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'EXTREME';
}

function getPaperPhysicalRiskLevel(ratio) {
  if (ratio <= 2) return 'LOW';
  if (ratio <= 5) return 'MODERATE';
  if (ratio <= 10) return 'HIGH';
  return 'EXTREME';
}

function getDominantFactor(breakdown) {
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

function generateCommentary(breakdown, level) {
  const messages = [];
  if (breakdown.coverageRisk >= 70) messages.push('Physical supply is critically tight');
  else if (breakdown.coverageRisk >= 50) messages.push('Supply coverage is below comfortable levels');
  if (breakdown.paperPhysicalRisk >= 70) messages.push('Paper claims significantly exceed physical availability');
  else if (breakdown.paperPhysicalRisk >= 50) messages.push('Elevated paper leverage on physical metal');
  if (breakdown.inventoryTrendRisk >= 70) messages.push('Inventory declining rapidly');
  else if (breakdown.inventoryTrendRisk >= 50) messages.push('Inventory trend is negative');
  if (breakdown.marketActivityRisk >= 70) messages.push('Rising speculative interest');
  if (messages.length === 0) {
    switch (level) {
      case 'LOW': return 'Market fundamentals appear stable with adequate physical backing.';
      case 'MODERATE': return 'Some factors warrant monitoring but no immediate concerns.';
      case 'HIGH': return 'Multiple risk factors elevated. Increased volatility possible.';
      case 'EXTREME': return 'Critical risk levels detected. Exercise caution.';
    }
  }
  return messages.slice(0, 2).join('. ') + '.';
}

const WEIGHTS = { coverage: 0.25, paperPhysical: 0.25, inventoryTrend: 0.20, deliveryVelocity: 0.15, marketActivity: 0.15 };

function computeRiskScore(factors) {
  const breakdown = {
    coverageRisk: calculateCoverageRisk(factors.coverageRatio),
    paperPhysicalRisk: calculatePaperPhysicalRisk(factors.paperPhysicalRatio),
    inventoryTrendRisk: calculateInventoryTrendRisk(factors.inventoryChange30d),
    deliveryVelocityRisk: calculateDeliveryVelocityRisk(factors.mtdDeliveries, factors.registeredInventory, factors.daysIntoMonth),
    marketActivityRisk: calculateMarketActivityRisk(factors.oiChange),
  };
  const composite = Math.round(
    breakdown.coverageRisk * WEIGHTS.coverage +
    breakdown.paperPhysicalRisk * WEIGHTS.paperPhysical +
    breakdown.inventoryTrendRisk * WEIGHTS.inventoryTrend +
    breakdown.deliveryVelocityRisk * WEIGHTS.deliveryVelocity +
    breakdown.marketActivityRisk * WEIGHTS.marketActivity
  );
  const level = getRiskLevel(composite);
  const dominantFactor = getDominantFactor(breakdown);
  const commentary = generateCommentary(breakdown, level);
  return { composite, level, breakdown, dominantFactor, commentary };
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initializeAllTables() {
  console.log('\n[STEP 1] Initializing all database tables...');

  // metal_snapshots
  await sql`CREATE TABLE IF NOT EXISTS metal_snapshots (
    id SERIAL PRIMARY KEY, metal VARCHAR(50) NOT NULL, report_date DATE NOT NULL,
    activity_date DATE, registered DECIMAL(20,3) NOT NULL DEFAULT 0,
    eligible DECIMAL(20,3) NOT NULL DEFAULT 0, total DECIMAL(20,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(metal, report_date))`;

  // depository_snapshots
  await sql`CREATE TABLE IF NOT EXISTS depository_snapshots (
    id SERIAL PRIMARY KEY, metal_snapshot_id INTEGER REFERENCES metal_snapshots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, registered DECIMAL(20,3) NOT NULL DEFAULT 0,
    eligible DECIMAL(20,3) NOT NULL DEFAULT 0, total DECIMAL(20,3) NOT NULL DEFAULT 0)`;

  // bulletin_snapshots
  await sql`CREATE TABLE IF NOT EXISTS bulletin_snapshots (
    id SERIAL PRIMARY KEY, date DATE NOT NULL, symbol VARCHAR(10) NOT NULL,
    product_name VARCHAR(100), total_volume INTEGER DEFAULT 0,
    total_open_interest INTEGER DEFAULT 0, total_oi_change INTEGER DEFAULT 0,
    front_month VARCHAR(10), front_month_settle NUMERIC(12,4),
    front_month_change NUMERIC(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(date, symbol))`;

  // open_interest_snapshots
  await sql`CREATE TABLE IF NOT EXISTS open_interest_snapshots (
    id SERIAL PRIMARY KEY, symbol VARCHAR(20) NOT NULL, report_date DATE NOT NULL,
    open_interest BIGINT NOT NULL DEFAULT 0, oi_change INTEGER NOT NULL DEFAULT 0,
    total_volume BIGINT NOT NULL DEFAULT 0, settlement_price DECIMAL(15,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(symbol, report_date))`;

  // paper_physical_snapshots
  await sql`CREATE TABLE IF NOT EXISTS paper_physical_snapshots (
    id SERIAL PRIMARY KEY, metal VARCHAR(50) NOT NULL, report_date DATE NOT NULL,
    futures_symbol VARCHAR(20) NOT NULL, open_interest BIGINT NOT NULL DEFAULT 0,
    open_interest_units DECIMAL(20,3) NOT NULL DEFAULT 0,
    registered_inventory DECIMAL(20,3) NOT NULL DEFAULT 0,
    paper_physical_ratio DECIMAL(10,4) NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(metal, report_date))`;

  // risk_score_snapshots
  await sql`CREATE TABLE IF NOT EXISTS risk_score_snapshots (
    id SERIAL PRIMARY KEY, metal VARCHAR(50) NOT NULL, report_date DATE NOT NULL,
    composite_score INTEGER NOT NULL DEFAULT 0, risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    coverage_risk INTEGER NOT NULL DEFAULT 0, paper_physical_risk INTEGER NOT NULL DEFAULT 0,
    inventory_trend_risk INTEGER NOT NULL DEFAULT 0, delivery_velocity_risk INTEGER NOT NULL DEFAULT 0,
    market_activity_risk INTEGER NOT NULL DEFAULT 0, dominant_factor VARCHAR(100) NOT NULL DEFAULT '',
    commentary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(metal, report_date))`;

  // delivery_snapshots
  await sql`CREATE TABLE IF NOT EXISTS delivery_snapshots (
    id SERIAL PRIMARY KEY, metal VARCHAR(50) NOT NULL, symbol VARCHAR(20) NOT NULL,
    report_date DATE NOT NULL, contract_month VARCHAR(20) NOT NULL,
    settlement_price DECIMAL(15,6) NOT NULL DEFAULT 0,
    daily_issued INTEGER NOT NULL DEFAULT 0, daily_stopped INTEGER NOT NULL DEFAULT 0,
    month_to_date INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(metal, report_date))`;

  // delivery_firm_snapshots
  await sql`CREATE TABLE IF NOT EXISTS delivery_firm_snapshots (
    id SERIAL PRIMARY KEY, delivery_snapshot_id INTEGER REFERENCES delivery_snapshots(id) ON DELETE CASCADE,
    firm_code VARCHAR(10) NOT NULL, firm_org VARCHAR(5) NOT NULL,
    firm_name VARCHAR(255) NOT NULL, issued INTEGER NOT NULL DEFAULT 0,
    stopped INTEGER NOT NULL DEFAULT 0)`;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_metal_snapshots_metal_date ON metal_snapshots(metal, report_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_depository_snapshots_metal_id ON depository_snapshots(metal_snapshot_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_oi_snapshots_symbol_date ON open_interest_snapshots(symbol, report_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_paper_physical_metal_date ON paper_physical_snapshots(metal, report_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_risk_score_metal_date ON risk_score_snapshots(metal, report_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_delivery_snapshots_metal_date ON delivery_snapshots(metal, report_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_delivery_firm_snapshots_delivery_id ON delivery_firm_snapshots(delivery_snapshot_id)`;

  console.log('  [OK] All tables and indexes initialized');
}

// ============================================
// SYNC: WAREHOUSE STOCKS (data.json)
// ============================================

async function syncWarehouseStocks(data) {
  console.log('\n[STEP 2] Syncing warehouse stocks (data.json)...');
  let success = 0, fail = 0;

  for (const [metalKey, metalData] of Object.entries(data)) {
    if (metalKey === '_metadata') continue;
    const reportDate = parseDate(metalData.report_date);
    const activityDate = parseDate(metalData.activity_date);
    if (!reportDate) { console.log(`  [SKIP] ${metalKey}: No valid date`); fail++; continue; }

    try {
      const totals = metalData.totals || {};
      const deps = metalData.depositories || [];

      const result = await sql`
        INSERT INTO metal_snapshots (metal, report_date, activity_date, registered, eligible, total)
        VALUES (${metalKey}, ${reportDate}, ${activityDate}, ${totals.registered || 0}, ${totals.eligible || 0}, ${totals.total || 0})
        ON CONFLICT (metal, report_date) DO UPDATE SET
          activity_date = EXCLUDED.activity_date, registered = EXCLUDED.registered,
          eligible = EXCLUDED.eligible, total = EXCLUDED.total, created_at = CURRENT_TIMESTAMP
        RETURNING id`;

      const snapshotId = result[0].id;
      await sql`DELETE FROM depository_snapshots WHERE metal_snapshot_id = ${snapshotId}`;

      for (const dep of deps) {
        await sql`INSERT INTO depository_snapshots (metal_snapshot_id, name, registered, eligible, total)
          VALUES (${snapshotId}, ${dep.name}, ${dep.registered || 0}, ${dep.eligible || 0}, ${dep.total || 0})`;
      }

      console.log(`  [OK] ${metalKey}: ${reportDate} (${deps.length} depositories)`);
      success++;
    } catch (e) {
      console.error(`  [ERR] ${metalKey}: ${e.message}`);
      fail++;
    }
  }
  console.log(`  Synced: ${success} metals, ${fail} failed`);
  return success;
}

// ============================================
// SYNC: BULLETIN DATA (bulletin.json)
// ============================================

async function syncBulletinData(bulletinData) {
  console.log('\n[STEP 3] Syncing bulletin data (bulletin.json)...');
  if (!bulletinData) { console.log('  [SKIP] No bulletin data'); return 0; }

  let success = 0;
  for (const product of bulletinData.products || []) {
    const frontContract = product.contracts?.[0];
    try {
      await sql`
        INSERT INTO bulletin_snapshots (date, symbol, product_name, total_volume, total_open_interest, total_oi_change, front_month, front_month_settle, front_month_change)
        VALUES (${bulletinData.parsed_date}::date, ${product.symbol}, ${product.name},
          ${product.total_volume}, ${product.total_open_interest}, ${product.total_oi_change},
          ${frontContract?.month || null}, ${frontContract?.settle || null}, ${frontContract?.change || null})
        ON CONFLICT (date, symbol) DO UPDATE SET
          product_name = EXCLUDED.product_name, total_volume = EXCLUDED.total_volume,
          total_open_interest = EXCLUDED.total_open_interest, total_oi_change = EXCLUDED.total_oi_change,
          front_month = EXCLUDED.front_month, front_month_settle = EXCLUDED.front_month_settle,
          front_month_change = EXCLUDED.front_month_change, created_at = CURRENT_TIMESTAMP`;
      console.log(`  [OK] ${product.symbol}: ${product.name} (OI: ${product.total_open_interest?.toLocaleString()})`);
      success++;
    } catch (e) {
      console.error(`  [ERR] ${product.symbol}: ${e.message}`);
    }
  }
  console.log(`  Synced: ${success} bulletin products`);
  return success;
}

// ============================================
// SYNC: VOLUME SUMMARY → OPEN INTEREST (volume_summary.json)
// ============================================

async function syncVolumeSummary(volumeData) {
  console.log('\n[STEP 4] Syncing volume summary → open interest (volume_summary.json)...');
  if (!volumeData) { console.log('  [SKIP] No volume summary data'); return 0; }

  const reportDate = volumeData.parsed_date;
  let success = 0;

  for (const product of volumeData.products || []) {
    try {
      await sql`
        INSERT INTO open_interest_snapshots (symbol, report_date, open_interest, oi_change, total_volume)
        VALUES (${product.symbol}, ${reportDate}, ${product.open_interest || 0}, ${product.oi_change || 0}, ${product.total_volume || 0})
        ON CONFLICT (symbol, report_date) DO UPDATE SET
          open_interest = EXCLUDED.open_interest, oi_change = EXCLUDED.oi_change,
          total_volume = EXCLUDED.total_volume, created_at = CURRENT_TIMESTAMP`;
      const changeStr = (product.oi_change || 0) >= 0 ? `+${product.oi_change}` : `${product.oi_change}`;
      console.log(`  [OK] ${product.symbol}: OI ${(product.open_interest || 0).toLocaleString()}, Vol ${(product.total_volume || 0).toLocaleString()}, ${changeStr}`);
      success++;
    } catch (e) {
      console.error(`  [ERR] ${product.symbol}: ${e.message}`);
    }
  }
  console.log(`  Synced: ${success} open interest records`);
  return success;
}

// ============================================
// SYNC: DELIVERY DATA (delivery.json)
// ============================================

async function syncDeliveryData(deliveryData) {
  console.log('\n[STEP 5] Syncing delivery data (delivery.json)...');
  if (!deliveryData) { console.log('  [SKIP] No delivery data'); return 0; }

  const reportDate = deliveryData.parsed_date || parseDate(deliveryData.business_date);
  let success = 0;

  for (const delivery of deliveryData.deliveries || []) {
    try {
      const result = await sql`
        INSERT INTO delivery_snapshots (metal, symbol, report_date, contract_month, settlement_price, daily_issued, daily_stopped, month_to_date)
        VALUES (${delivery.metal}, ${delivery.symbol}, ${reportDate},
          ${delivery.contract_month}, ${delivery.settlement || 0},
          ${delivery.daily_issued || 0}, ${delivery.daily_stopped || 0}, ${delivery.month_to_date || 0})
        ON CONFLICT (metal, report_date) DO UPDATE SET
          symbol = EXCLUDED.symbol, contract_month = EXCLUDED.contract_month,
          settlement_price = EXCLUDED.settlement_price, daily_issued = EXCLUDED.daily_issued,
          daily_stopped = EXCLUDED.daily_stopped, month_to_date = EXCLUDED.month_to_date,
          created_at = CURRENT_TIMESTAMP
        RETURNING id`;

      const snapshotId = result[0].id;
      await sql`DELETE FROM delivery_firm_snapshots WHERE delivery_snapshot_id = ${snapshotId}`;

      for (const firm of delivery.firms || []) {
        await sql`INSERT INTO delivery_firm_snapshots (delivery_snapshot_id, firm_code, firm_org, firm_name, issued, stopped)
          VALUES (${snapshotId}, ${firm.code}, ${firm.org}, ${firm.name}, ${firm.issued || 0}, ${firm.stopped || 0})`;
      }

      console.log(`  [OK] ${delivery.metal}: issued=${delivery.daily_issued}, stopped=${delivery.daily_stopped}, MTD=${delivery.month_to_date} (${(delivery.firms || []).length} firms)`);
      success++;
    } catch (e) {
      console.error(`  [ERR] ${delivery.metal}: ${e.message}`);
    }
  }
  console.log(`  Synced: ${success} delivery records`);
  return success;
}

// ============================================
// COMPUTE & SYNC: PAPER/PHYSICAL RATIOS
// ============================================

async function syncPaperPhysicalRatios(warehouseData, bulletinData, volumeData) {
  console.log('\n[STEP 6] Computing & syncing paper/physical ratios...');

  const reportDate = volumeData?.parsed_date || bulletinData?.parsed_date || parseDate(warehouseData?.Gold?.report_date);
  if (!reportDate) { console.log('  [SKIP] No report date available'); return 0; }

  let success = 0;

  for (const config of METAL_CONFIGS) {
    const metalData = warehouseData[config.key];
    if (!metalData || !metalData.totals) continue;

    const registeredInventory = metalData.totals.registered;
    if (registeredInventory <= 0) continue;

    // Get open interest
    let openInterest = 0;
    if (config.futuresSymbol === 'PL+PA') {
      // Combined platinum + palladium
      const plProduct = (volumeData?.products || bulletinData?.products || []).find(p => p.symbol === 'PL');
      const paProduct = (volumeData?.products || bulletinData?.products || []).find(p => p.symbol === 'PA');
      openInterest = (plProduct?.open_interest || plProduct?.total_open_interest || 0) +
                     (paProduct?.open_interest || paProduct?.total_open_interest || 0);
    } else {
      const product = (volumeData?.products || []).find(p => p.symbol === config.futuresSymbol) ||
                      (bulletinData?.products || []).find(p => p.symbol === config.futuresSymbol);
      openInterest = product?.open_interest || product?.total_open_interest || 0;
    }

    if (openInterest <= 0) { console.log(`  [SKIP] ${config.key}: No open interest data`); continue; }

    const openInterestUnits = openInterest * config.contractSize;
    const ratio = openInterestUnits / registeredInventory;
    const riskLevel = getPaperPhysicalRiskLevel(ratio);

    try {
      await sql`
        INSERT INTO paper_physical_snapshots (metal, report_date, futures_symbol, open_interest, open_interest_units, registered_inventory, paper_physical_ratio, risk_level)
        VALUES (${config.key}, ${reportDate}, ${config.futuresSymbol}, ${openInterest}, ${openInterestUnits}, ${registeredInventory}, ${ratio}, ${riskLevel})
        ON CONFLICT (metal, report_date) DO UPDATE SET
          futures_symbol = EXCLUDED.futures_symbol, open_interest = EXCLUDED.open_interest,
          open_interest_units = EXCLUDED.open_interest_units, registered_inventory = EXCLUDED.registered_inventory,
          paper_physical_ratio = EXCLUDED.paper_physical_ratio, risk_level = EXCLUDED.risk_level,
          created_at = CURRENT_TIMESTAMP`;
      console.log(`  [OK] ${config.key}: OI=${openInterest.toLocaleString()} × ${config.contractSize} = ${openInterestUnits.toLocaleString()} ${config.unit} / ${registeredInventory.toLocaleString()} reg = ${ratio.toFixed(2)}:1 [${riskLevel}]`);
      success++;
    } catch (e) {
      console.error(`  [ERR] ${config.key}: ${e.message}`);
    }
  }
  console.log(`  Synced: ${success} paper/physical ratios`);
  return success;
}

// ============================================
// COMPUTE & SYNC: RISK SCORES
// ============================================

async function syncRiskScores(warehouseData, bulletinData, volumeData, deliveryData) {
  console.log('\n[STEP 7] Computing & syncing risk scores...');

  const reportDate = volumeData?.parsed_date || bulletinData?.parsed_date || parseDate(warehouseData?.Gold?.report_date);
  if (!reportDate) { console.log('  [SKIP] No report date available'); return 0; }

  // Build delivery lookup
  const deliveryLookup = {};
  if (deliveryData?.deliveries) {
    for (const d of deliveryData.deliveries) {
      deliveryLookup[d.metal] = d;
    }
  }

  // Get 30-day-ago snapshots for inventory trend
  let monthAgoSnapshots = {};
  try {
    const rows = await sql`
      SELECT DISTINCT ON (metal) metal, registered
      FROM metal_snapshots
      WHERE report_date <= ${reportDate}::date - 30
      ORDER BY metal, report_date DESC`;
    for (const row of rows) {
      monthAgoSnapshots[row.metal] = Number(row.registered);
    }
  } catch (e) {
    console.warn(`  [WARN] Could not fetch historical snapshots: ${e.message}`);
  }

  let success = 0;

  for (const config of METAL_CONFIGS) {
    const metalData = warehouseData[config.key];
    if (!metalData || !metalData.totals) continue;

    const registeredInventory = metalData.totals.registered;
    const coverageRatio = config.monthlyDemand > 0 ? registeredInventory / config.monthlyDemand : 0;

    // Paper/physical ratio
    let ppRatio = 1;
    const futuresSymbol = config.futuresSymbol;
    if (futuresSymbol === 'PL+PA') {
      const plProduct = (volumeData?.products || bulletinData?.products || []).find(p => p.symbol === 'PL');
      const paProduct = (volumeData?.products || bulletinData?.products || []).find(p => p.symbol === 'PA');
      const oi = (plProduct?.open_interest || plProduct?.total_open_interest || 0) +
                 (paProduct?.open_interest || paProduct?.total_open_interest || 0);
      if (oi > 0 && registeredInventory > 0) ppRatio = (oi * config.contractSize) / registeredInventory;
    } else {
      const product = (volumeData?.products || []).find(p => p.symbol === futuresSymbol) ||
                      (bulletinData?.products || []).find(p => p.symbol === futuresSymbol);
      const oi = product?.open_interest || product?.total_open_interest || 0;
      if (oi > 0 && registeredInventory > 0) ppRatio = (oi * config.contractSize) / registeredInventory;
    }

    // Inventory trend (30d change)
    let inventoryChange30d = null;
    const prevRegistered = monthAgoSnapshots[config.key];
    if (prevRegistered && prevRegistered > 0) {
      inventoryChange30d = ((registeredInventory - prevRegistered) / prevRegistered) * 100;
    }

    // Delivery velocity
    const delivery = deliveryLookup[config.key === 'Platinum_Palladium' ? 'Platinum' : config.key];
    const mtdDeliveries = delivery ? delivery.month_to_date * config.contractSize : null;
    
    // Parse day of month for velocity calculation
    const dayOfMonth = reportDate ? parseInt(reportDate.split('-')[2]) : 4;

    // OI change percentage (YoY from volume summary)
    let oiChangePercent = null;
    if (volumeData?.products) {
      const symbol = futuresSymbol === 'PL+PA' ? 'PL' : futuresSymbol;
      const product = volumeData.products.find(p => p.symbol === symbol);
      if (product && product.yoy_open_interest > 0) {
        oiChangePercent = ((product.open_interest - product.yoy_open_interest) / product.yoy_open_interest) * 100;
      }
    }

    const riskScore = computeRiskScore({
      coverageRatio,
      paperPhysicalRatio: ppRatio,
      inventoryChange30d,
      mtdDeliveries,
      registeredInventory,
      daysIntoMonth: dayOfMonth,
      oiChange: oiChangePercent,
    });

    try {
      await sql`
        INSERT INTO risk_score_snapshots (metal, report_date, composite_score, risk_level, coverage_risk, paper_physical_risk, inventory_trend_risk, delivery_velocity_risk, market_activity_risk, dominant_factor, commentary)
        VALUES (${config.key}, ${reportDate}, ${riskScore.composite}, ${riskScore.level},
          ${Math.round(riskScore.breakdown.coverageRisk)}, ${Math.round(riskScore.breakdown.paperPhysicalRisk)},
          ${Math.round(riskScore.breakdown.inventoryTrendRisk)}, ${Math.round(riskScore.breakdown.deliveryVelocityRisk)},
          ${Math.round(riskScore.breakdown.marketActivityRisk)}, ${riskScore.dominantFactor}, ${riskScore.commentary})
        ON CONFLICT (metal, report_date) DO UPDATE SET
          composite_score = EXCLUDED.composite_score, risk_level = EXCLUDED.risk_level,
          coverage_risk = EXCLUDED.coverage_risk, paper_physical_risk = EXCLUDED.paper_physical_risk,
          inventory_trend_risk = EXCLUDED.inventory_trend_risk, delivery_velocity_risk = EXCLUDED.delivery_velocity_risk,
          market_activity_risk = EXCLUDED.market_activity_risk, dominant_factor = EXCLUDED.dominant_factor,
          commentary = EXCLUDED.commentary, created_at = CURRENT_TIMESTAMP`;
      console.log(`  [OK] ${config.key}: Score ${riskScore.composite}/100 [${riskScore.level}] — ${riskScore.dominantFactor}`);
      success++;
    } catch (e) {
      console.error(`  [ERR] ${config.key}: ${e.message}`);
    }
  }
  console.log(`  Synced: ${success} risk scores`);
  return success;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(70));
  console.log('  COMEX MetalStats — Master Database Sync');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70));

  // Load all data files
  const warehouseData = loadJson('data.json');
  const bulletinData = loadJson('bulletin.json');
  const deliveryData = loadJson('delivery.json');
  const volumeData = loadJson('volume_summary.json');

  if (!warehouseData) {
    console.error('[FATAL] Could not load data.json — aborting');
    process.exit(1);
  }

  console.log('\n[INFO] Data files loaded:');
  console.log(`  data.json:           ${Object.keys(warehouseData).filter(k => k !== '_metadata').length} metals`);
  console.log(`  bulletin.json:       ${bulletinData ? bulletinData.products?.length + ' products' : 'NOT FOUND'}`);
  console.log(`  delivery.json:       ${deliveryData ? deliveryData.deliveries?.length + ' deliveries' : 'NOT FOUND'}`);
  console.log(`  volume_summary.json: ${volumeData ? volumeData.products?.length + ' products' : 'NOT FOUND'}`);

  // Run all sync steps
  await initializeAllTables();
  const stocksCount = await syncWarehouseStocks(warehouseData);
  const bulletinCount = await syncBulletinData(bulletinData);
  const volumeCount = await syncVolumeSummary(volumeData);
  const deliveryCount = await syncDeliveryData(deliveryData);
  const ppCount = await syncPaperPhysicalRatios(warehouseData, bulletinData, volumeData);
  const riskCount = await syncRiskScores(warehouseData, bulletinData, volumeData, deliveryData);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SYNC COMPLETE — Summary');
  console.log('='.repeat(70));
  console.log(`  Warehouse stocks:    ${stocksCount} metals`);
  console.log(`  Bulletin products:   ${bulletinCount} symbols`);
  console.log(`  Open interest:       ${volumeCount} symbols`);
  console.log(`  Delivery notices:    ${deliveryCount} metals`);
  console.log(`  Paper/physical:      ${ppCount} ratios`);
  console.log(`  Risk scores:         ${riskCount} scores`);
  console.log('='.repeat(70));

  // Verify by querying counts
  console.log('\n[VERIFY] Database record counts:');
  const counts = await Promise.all([
    sql`SELECT COUNT(*) as c FROM metal_snapshots`,
    sql`SELECT COUNT(*) as c FROM depository_snapshots`,
    sql`SELECT COUNT(*) as c FROM bulletin_snapshots`,
    sql`SELECT COUNT(*) as c FROM open_interest_snapshots`,
    sql`SELECT COUNT(*) as c FROM delivery_snapshots`,
    sql`SELECT COUNT(*) as c FROM delivery_firm_snapshots`,
    sql`SELECT COUNT(*) as c FROM paper_physical_snapshots`,
    sql`SELECT COUNT(*) as c FROM risk_score_snapshots`,
  ]);
  const tableNames = ['metal_snapshots', 'depository_snapshots', 'bulletin_snapshots', 'open_interest_snapshots', 'delivery_snapshots', 'delivery_firm_snapshots', 'paper_physical_snapshots', 'risk_score_snapshots'];
  counts.forEach((r, i) => console.log(`  ${tableNames[i]}: ${r[0].c} rows`));
}

main().catch(error => {
  console.error('\n[FATAL]', error);
  process.exit(1);
});
