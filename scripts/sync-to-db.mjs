#!/usr/bin/env node
/**
 * Sync data.json to Neon database using @neondatabase/serverless driver
 * Usage: DATABASE_URL="..." node scripts/sync-to-db.mjs
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

async function initializeDatabase() {
  console.log('[INFO] Initializing database tables...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS metal_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        activity_date DATE,
        registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
        eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
        total DECIMAL(20, 3) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS depository_snapshots (
        id SERIAL PRIMARY KEY,
        metal_snapshot_id INTEGER REFERENCES metal_snapshots(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
        eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
        total DECIMAL(20, 3) NOT NULL DEFAULT 0
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_metal_snapshots_metal_date 
      ON metal_snapshots(metal, report_date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_depository_snapshots_metal_id 
      ON depository_snapshots(metal_snapshot_id)
    `;

    console.log('[OK] Database tables initialized');
  } catch (error) {
    console.error('[ERROR] Failed to initialize database:', error.message);
    throw error;
  }
}

async function syncMetalData(metalKey, metalData) {
  const reportDate = parseDate(metalData.report_date);
  const activityDate = parseDate(metalData.activity_date);
  const totals = metalData.totals || {};
  const depositories = metalData.depositories || [];

  if (!reportDate) {
    console.log(`  [SKIP] ${metalKey}: No valid report date`);
    return false;
  }

  try {
    // Upsert the metal snapshot
    const result = await sql`
      INSERT INTO metal_snapshots (metal, report_date, activity_date, registered, eligible, total)
      VALUES (${metalKey}, ${reportDate}, ${activityDate}, ${totals.registered || 0}, ${totals.eligible || 0}, ${totals.total || 0})
      ON CONFLICT (metal, report_date) 
      DO UPDATE SET 
        activity_date = EXCLUDED.activity_date,
        registered = EXCLUDED.registered,
        eligible = EXCLUDED.eligible,
        total = EXCLUDED.total,
        created_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const snapshotId = result[0].id;

    // Delete existing depositories for this snapshot
    await sql`
      DELETE FROM depository_snapshots WHERE metal_snapshot_id = ${snapshotId}
    `;

    // Insert new depositories
    for (const dep of depositories) {
      await sql`
        INSERT INTO depository_snapshots (metal_snapshot_id, name, registered, eligible, total)
        VALUES (${snapshotId}, ${dep.name}, ${dep.registered || 0}, ${dep.eligible || 0}, ${dep.total || 0})
      `;
    }

    console.log(`  [OK] ${metalKey}: synced (report_date: ${reportDate}, ${depositories.length} depositories)`);
    return true;
  } catch (error) {
    console.error(`  [ERROR] ${metalKey}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=' .repeat(70));
  console.log('  Syncing data.json to Neon Database');
  console.log('=' .repeat(70));
  console.log();

  // Read data.json
  const dataPath = join(__dirname, '..', 'public', 'data.json');
  console.log(`[INFO] Reading data from ${dataPath}`);
  
  let data;
  try {
    const fileContent = readFileSync(dataPath, 'utf-8');
    data = JSON.parse(fileContent);
    console.log('[OK] Data loaded successfully');
  } catch (error) {
    console.error(`[ERROR] Failed to read data.json: ${error.message}`);
    process.exit(1);
  }

  // Initialize database
  await initializeDatabase();

  // Sync each metal
  console.log();
  console.log('[INFO] Syncing metals to database...');
  
  let successCount = 0;
  let failCount = 0;

  for (const [metalKey, metalData] of Object.entries(data)) {
    if (metalKey === '_metadata') continue;
    
    const success = await syncMetalData(metalKey, metalData);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log();
  console.log('=' .repeat(70));
  console.log(`  Done! Synced ${successCount} metals, ${failCount} failed`);
  console.log('=' .repeat(70));
}

main().catch(error => {
  console.error('[FATAL]', error);
  process.exit(1);
});
