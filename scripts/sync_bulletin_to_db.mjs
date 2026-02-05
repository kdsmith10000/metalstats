/**
 * Sync bulletin.json data to Neon database
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

async function syncBulletinData() {
  // Load bulletin.json
  const bulletinPath = join(__dirname, '..', 'public', 'bulletin.json');
  const bulletinData = JSON.parse(readFileSync(bulletinPath, 'utf-8'));
  
  console.log('Syncing bulletin data to Neon database...');
  console.log('Date:', bulletinData.parsed_date);
  console.log('Products:', bulletinData.products.length);
  console.log('='.repeat(60));

  let syncedCount = 0;

  for (const product of bulletinData.products) {
    const frontContract = product.contracts[0];
    
    try {
      await sql`
        INSERT INTO bulletin_snapshots (
          date, symbol, product_name,
          total_volume, total_open_interest, total_oi_change,
          front_month, front_month_settle, front_month_change
        ) VALUES (
          ${bulletinData.parsed_date}::date,
          ${product.symbol},
          ${product.name},
          ${product.total_volume},
          ${product.total_open_interest},
          ${product.total_oi_change},
          ${frontContract?.month || null},
          ${frontContract?.settle || null},
          ${frontContract?.change || null}
        )
        ON CONFLICT (date, symbol) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          total_volume = EXCLUDED.total_volume,
          total_open_interest = EXCLUDED.total_open_interest,
          total_oi_change = EXCLUDED.total_oi_change,
          front_month = EXCLUDED.front_month,
          front_month_settle = EXCLUDED.front_month_settle,
          front_month_change = EXCLUDED.front_month_change,
          created_at = CURRENT_TIMESTAMP
      `;
      
      console.log(`  ✓ ${product.symbol}: ${frontContract?.month || 'N/A'} @ ${frontContract?.settle || 'N/A'}`);
      syncedCount++;
    } catch (error) {
      console.error(`  ✗ ${product.symbol}: ${error.message}`);
    }
  }

  console.log('='.repeat(60));
  console.log(`Synced ${syncedCount}/${bulletinData.products.length} products`);

  // Verify
  console.log('\nVerifying data in database:');
  const result = await sql`
    SELECT symbol, front_month, front_month_settle, front_month_change
    FROM bulletin_snapshots
    WHERE date = ${bulletinData.parsed_date}::date
    ORDER BY symbol
  `;
  
  result.forEach(row => {
    console.log(`  ${row.symbol}: ${row.front_month} @ ${row.front_month_settle} (${row.front_month_change > 0 ? '+' : ''}${row.front_month_change})`);
  });
}

syncBulletinData().catch(console.error);
