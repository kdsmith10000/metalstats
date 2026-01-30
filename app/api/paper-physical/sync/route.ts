import { NextResponse } from 'next/server';
import { 
  initializeOpenInterestTables, 
  upsertOpenInterest, 
  upsertPaperPhysicalRatio,
  isDatabaseAvailable 
} from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

// Metal configurations for paper/physical calculations
const METAL_CONFIGS = [
  { metal: 'Gold', symbol: 'GC', contractSize: 100 },
  { metal: 'Silver', symbol: 'SI', contractSize: 5000 },
  { metal: 'Copper', symbol: 'HG', contractSize: 12.5 },
  { metal: 'Platinum_Palladium', symbol: 'PL+PA', contractSize: 50 },
  { metal: 'Aluminum', symbol: 'ALI', contractSize: 44 },
];

function getRiskLevel(ratio: number): string {
  if (ratio <= 2) return 'LOW';
  if (ratio <= 5) return 'MODERATE';
  if (ratio <= 10) return 'HIGH';
  return 'EXTREME';
}

// POST /api/paper-physical/sync - Sync paper/physical data from JSON files to database
export async function POST() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Initialize tables if they don't exist
    await initializeOpenInterestTables();

    // Read volume summary data (contains open interest)
    const volumeSummaryPath = path.join(process.cwd(), 'public', 'volume_summary.json');
    const volumeSummaryRaw = await fs.readFile(volumeSummaryPath, 'utf-8');
    const volumeSummary = JSON.parse(volumeSummaryRaw);

    // Read inventory data (contains registered inventory)
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    const dataRaw = await fs.readFile(dataPath, 'utf-8');
    const inventoryData = JSON.parse(dataRaw);

    const reportDate = volumeSummary.parsed_date || new Date().toISOString().split('T')[0];
    const results: { symbol: string; status: string }[] = [];

    // 1. Sync open interest for all products in volume summary
    for (const product of volumeSummary.products || []) {
      try {
        await upsertOpenInterest(
          product.symbol,
          reportDate,
          product.open_interest || 0,
          product.oi_change || 0,
          product.total_volume || 0
        );
        results.push({ symbol: product.symbol, status: 'synced' });
      } catch (error) {
        console.error(`Error syncing OI for ${product.symbol}:`, error);
        results.push({ symbol: product.symbol, status: 'error' });
      }
    }

    // 2. Calculate and sync paper/physical ratios for each metal
    const paperPhysicalResults: { metal: string; ratio: number; status: string }[] = [];

    for (const config of METAL_CONFIGS) {
      try {
        // Get registered inventory
        const metalData = inventoryData[config.metal];
        if (!metalData?.totals?.registered) {
          paperPhysicalResults.push({ metal: config.metal, ratio: 0, status: 'no inventory data' });
          continue;
        }

        const registeredInventory = metalData.totals.registered;

        // Get open interest
        let openInterest = 0;
        
        if (config.symbol === 'PL+PA') {
          // Combined Platinum + Palladium
          const plProduct = volumeSummary.products?.find((p: { symbol: string }) => p.symbol === 'PL');
          const paProduct = volumeSummary.products?.find((p: { symbol: string }) => p.symbol === 'PA');
          if (plProduct) openInterest += plProduct.open_interest || 0;
          if (paProduct) openInterest += paProduct.open_interest || 0;
        } else {
          const product = volumeSummary.products?.find((p: { symbol: string }) => p.symbol === config.symbol);
          if (product) openInterest = product.open_interest || 0;
        }

        if (openInterest === 0) {
          paperPhysicalResults.push({ metal: config.metal, ratio: 0, status: 'no OI data' });
          continue;
        }

        // Calculate paper claims in units
        const openInterestUnits = openInterest * config.contractSize;
        
        // Calculate ratio
        const ratio = registeredInventory > 0 ? openInterestUnits / registeredInventory : 0;
        const riskLevel = getRiskLevel(ratio);

        await upsertPaperPhysicalRatio(
          config.metal,
          reportDate,
          config.symbol,
          openInterest,
          openInterestUnits,
          registeredInventory,
          ratio,
          riskLevel
        );

        paperPhysicalResults.push({ 
          metal: config.metal, 
          ratio: Math.round(ratio * 100) / 100, 
          status: `synced (${riskLevel})` 
        });
      } catch (error) {
        console.error(`Error calculating paper/physical for ${config.metal}:`, error);
        paperPhysicalResults.push({ metal: config.metal, ratio: 0, status: 'error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Paper/physical data synced successfully',
      reportDate,
      openInterest: results,
      paperPhysical: paperPhysicalResults,
    });
  } catch (error) {
    console.error('Paper/physical sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync paper/physical data' },
      { status: 500 }
    );
  }
}

// GET /api/paper-physical/sync - Get sync status
export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Initialize tables to ensure they exist
    await initializeOpenInterestTables();

    return NextResponse.json({
      success: true,
      message: 'Paper/physical tables ready',
      tables: ['open_interest_snapshots', 'paper_physical_snapshots'],
    });
  } catch (error) {
    console.error('Paper/physical status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check paper/physical status' },
      { status: 500 }
    );
  }
}
