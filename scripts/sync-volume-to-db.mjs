#!/usr/bin/env node
/**
 * Sync volume_summary.json to Neon database
 * Usage: DATABASE_URL="..." node scripts/sync-volume-to-db.mjs
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

async function initializeOpenInterestTables() {
  console.log('[INFO] Initializing open interest tables...');
  
  try {
    // Add settlement_price column if it doesn't exist
    try {
      await sql`
        ALTER TABLE open_interest_snapshots 
        ADD COLUMN IF NOT EXISTS settlement_price DECIMAL(15, 6)
      `;
    } catch (e) {
      // Column might already exist or table doesn't exist yet
    }

    // Create open_interest_snapshots table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS open_interest_snapshots (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        report_date DATE NOT NULL,
        open_interest BIGINT NOT NULL DEFAULT 0,
        oi_change INTEGER NOT NULL DEFAULT 0,
        total_volume BIGINT NOT NULL DEFAULT 0,
        settlement_price DECIMAL(15, 6),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, report_date)
      )
    `;

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_oi_snapshots_symbol_date 
      ON open_interest_snapshots(symbol, report_date DESC)
    `;

    console.log('[OK] Open interest tables initialized');
  } catch (error) {
    console.error('[ERROR] Failed to initialize tables:', error.message);
    throw error;
  }
}

async function syncOpenInterestData(product, reportDate, settlementPrices) {
  const symbol = product.symbol;
  const openInterest = product.open_interest || 0;
  const oiChange = product.oi_change || 0;
  const totalVolume = product.total_volume || 0;
  const settlementPrice = settlementPrices[symbol] || null;

  try {
    await sql`
      INSERT INTO open_interest_snapshots (symbol, report_date, open_interest, oi_change, total_volume, settlement_price)
      VALUES (${symbol}, ${reportDate}, ${openInterest}, ${oiChange}, ${totalVolume}, ${settlementPrice})
      ON CONFLICT (symbol, report_date) 
      DO UPDATE SET 
        open_interest = EXCLUDED.open_interest,
        oi_change = EXCLUDED.oi_change,
        total_volume = EXCLUDED.total_volume,
        settlement_price = EXCLUDED.settlement_price,
        created_at = CURRENT_TIMESTAMP
    `;

    const changeStr = oiChange >= 0 ? `+${oiChange}` : `${oiChange}`;
    console.log(`  [OK] ${symbol}: OI ${openInterest.toLocaleString()}, Vol ${totalVolume.toLocaleString()}, Change ${changeStr}`);
    return true;
  } catch (error) {
    console.error(`  [ERROR] ${symbol}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=' .repeat(70));
  console.log('  Syncing volume_summary.json to Neon Database');
  console.log('=' .repeat(70));
  console.log();

  // Read volume_summary.json
  const dataPath = join(__dirname, '..', 'public', 'volume_summary.json');
  console.log(`[INFO] Reading data from ${dataPath}`);
  
  let data;
  try {
    const fileContent = readFileSync(dataPath, 'utf-8');
    data = JSON.parse(fileContent);
    console.log('[OK] Data loaded successfully');
  } catch (error) {
    console.error(`[ERROR] Failed to read volume_summary.json: ${error.message}`);
    process.exit(1);
  }

  // Initialize database tables
  await initializeOpenInterestTables();

  // Get report date
  const reportDate = data.parsed_date;
  const settlementPrices = data.settlement_prices || {};
  console.log(`[INFO] Report date: ${reportDate}, Bulletin #${data.bulletin_number}`);

  // Sync each product
  console.log();
  console.log('[INFO] Syncing open interest data...');
  
  let successCount = 0;
  let failCount = 0;

  for (const product of data.products || []) {
    const success = await syncOpenInterestData(product, reportDate, settlementPrices);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log();
  console.log('=' .repeat(70));
  console.log(`  Done! Synced ${successCount} products, ${failCount} failed`);
  console.log('=' .repeat(70));
}

main().catch(error => {
  console.error('[FATAL]', error);
  process.exit(1);
});
