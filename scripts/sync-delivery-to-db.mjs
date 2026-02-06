#!/usr/bin/env node
/**
 * Sync delivery.json to Neon database using @neondatabase/serverless driver
 * Usage: DATABASE_URL="..." node scripts/sync-delivery-to-db.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[ERROR] DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Parse date from MM/DD/YYYY or ISO format
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // If already in ISO format (YYYY-MM-DD), return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

async function initializeDeliveryTables() {
  console.log('[INFO] Initializing delivery tables...');
  
  try {
    // Create tables if they don't exist (preserves historical data)
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        report_date DATE NOT NULL,
        contract_month VARCHAR(20) NOT NULL,
        settlement_price DECIMAL(15, 6) NOT NULL DEFAULT 0,
        daily_issued INTEGER NOT NULL DEFAULT 0,
        daily_stopped INTEGER NOT NULL DEFAULT 0,
        month_to_date INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS delivery_firm_snapshots (
        id SERIAL PRIMARY KEY,
        delivery_snapshot_id INTEGER REFERENCES delivery_snapshots(id) ON DELETE CASCADE,
        firm_code VARCHAR(10) NOT NULL,
        firm_org VARCHAR(5) NOT NULL,
        firm_name VARCHAR(255) NOT NULL,
        issued INTEGER NOT NULL DEFAULT 0,
        stopped INTEGER NOT NULL DEFAULT 0
      )
    `;

    // Create indexes (IF NOT EXISTS handles idempotency)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_snapshots_metal_date 
      ON delivery_snapshots(metal, report_date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_firm_snapshots_delivery_id 
      ON delivery_firm_snapshots(delivery_snapshot_id)
    `;

    console.log('[OK] Delivery tables initialized (historical data preserved)');
  } catch (error) {
    console.error('[ERROR] Failed to initialize delivery tables:', error.message);
    throw error;
  }
}

async function syncDeliveryData(delivery, reportDate) {
  const metal = delivery.metal;
  const symbol = delivery.symbol;
  const contractMonth = delivery.contract_month;
  const settlement = delivery.settlement || 0;
  const dailyIssued = delivery.daily_issued || 0;
  const dailyStopped = delivery.daily_stopped || 0;
  const monthToDate = delivery.month_to_date || 0;
  const firms = delivery.firms || [];

  const parsedDate = parseDate(reportDate);
  if (!parsedDate) {
    console.log(`  [SKIP] ${metal}: No valid report date`);
    return false;
  }

  try {
    // Upsert the delivery snapshot
    const result = await sql`
      INSERT INTO delivery_snapshots (
        metal, symbol, report_date, contract_month, settlement_price,
        daily_issued, daily_stopped, month_to_date
      )
      VALUES (
        ${metal}, ${symbol}, ${parsedDate}, ${contractMonth}, ${settlement},
        ${dailyIssued}, ${dailyStopped}, ${monthToDate}
      )
      ON CONFLICT (metal, report_date) 
      DO UPDATE SET 
        symbol = EXCLUDED.symbol,
        contract_month = EXCLUDED.contract_month,
        settlement_price = EXCLUDED.settlement_price,
        daily_issued = EXCLUDED.daily_issued,
        daily_stopped = EXCLUDED.daily_stopped,
        month_to_date = EXCLUDED.month_to_date,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const snapshotId = result[0].id;

    // Delete existing firm data
    await sql`
      DELETE FROM delivery_firm_snapshots WHERE delivery_snapshot_id = ${snapshotId}
    `;

    // Insert firm data
    for (const firm of firms) {
      await sql`
        INSERT INTO delivery_firm_snapshots (delivery_snapshot_id, firm_code, firm_org, firm_name, issued, stopped)
        VALUES (${snapshotId}, ${firm.code}, ${firm.org}, ${firm.name}, ${firm.issued || 0}, ${firm.stopped || 0})
      `;
    }

    console.log(`  [OK] ${metal}: synced (date: ${parsedDate}, daily: ${dailyIssued}, MTD: ${monthToDate}, ${firms.length} firms)`);
    return true;
  } catch (error) {
    console.error(`  [ERROR] ${metal}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=' .repeat(70));
  console.log('  Syncing delivery.json to Neon Database');
  console.log('=' .repeat(70));
  console.log();

  // Read delivery.json
  const dataPath = join(__dirname, '..', 'public', 'delivery.json');
  console.log(`[INFO] Reading data from ${dataPath}`);
  
  let data;
  try {
    const fileContent = readFileSync(dataPath, 'utf-8');
    data = JSON.parse(fileContent);
    console.log('[OK] Data loaded successfully');
  } catch (error) {
    console.error(`[ERROR] Failed to read delivery.json: ${error.message}`);
    process.exit(1);
  }

  // Initialize database tables
  await initializeDeliveryTables();

  // Get report date
  const reportDate = data.parsed_date || data.business_date;
  console.log(`[INFO] Report date: ${reportDate}`);

  // Sync each delivery
  console.log();
  console.log('[INFO] Syncing deliveries to database...');
  
  let successCount = 0;
  let failCount = 0;

  for (const delivery of data.deliveries || []) {
    const success = await syncDeliveryData(delivery, reportDate);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log();
  console.log('=' .repeat(70));
  console.log(`  Done! Synced ${successCount} deliveries, ${failCount} failed`);
  console.log('=' .repeat(70));
}

main().catch(error => {
  console.error('[FATAL]', error);
  process.exit(1);
});
