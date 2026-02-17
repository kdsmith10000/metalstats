import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { 
  isDatabaseAvailable, 
  initializeRiskScoreTables, 
  upsertRiskScore 
} from '@/lib/db';
import { isAuthorized } from '@/lib/auth';
import { 
  metalConfigs, 
  calculateCoverageRatio, 
  calculatePaperPhysicalRatio,
  WarehouseStocksData 
} from '@/lib/data';
import { 
  calculateCompositeRiskScore, 
  RiskFactors 
} from '@/lib/riskScore';

interface VolumeSummaryData {
  bulletin_number: number;
  date: string;
  products: Array<{
    symbol: string;
    name: string;
    volume: number;
    open_interest: number;
    oi_change: number;
    yoy_open_interest: number;
    yoy_difference: number;
    yoy_percent_change: number;
  }>;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Initialize tables
    await initializeRiskScoreTables();

    // Read data files
    const publicDir = path.join(process.cwd(), 'public');
    
    const dataJson = await fs.readFile(path.join(publicDir, 'data.json'), 'utf-8');
    const warehouseData: WarehouseStocksData = JSON.parse(dataJson);
    
    const volumeJson = await fs.readFile(path.join(publicDir, 'volume_summary.json'), 'utf-8');
    const volumeData: VolumeSummaryData = JSON.parse(volumeJson);

    const reportDate = volumeData.date || new Date().toISOString().split('T')[0];
    const results: Array<{ metal: string; score: number; level: string }> = [];

    // Calculate and store risk scores for each metal
    for (const config of metalConfigs) {
      const metalData = warehouseData[config.key];
      if (!metalData || metalData.totals.total === 0) continue;

      // Get coverage ratio
      const coverageRatio = calculateCoverageRatio(metalData.totals.registered, config.monthlyDemand);

      // Get open interest for paper/physical
      let openInterest = 0;
      if (config.futuresSymbol) {
        if (config.futuresSymbol === 'PL+PA') {
          // Combined Platinum & Palladium
          const plProduct = volumeData.products.find(p => p.symbol === 'PL');
          const paProduct = volumeData.products.find(p => p.symbol === 'PA');
          openInterest = (plProduct?.open_interest || 0) + (paProduct?.open_interest || 0);
        } else {
          const product = volumeData.products.find(p => p.symbol === config.futuresSymbol);
          openInterest = product?.open_interest || 0;
        }
      }

      // Calculate paper/physical ratio
      const ppData = openInterest > 0 
        ? calculatePaperPhysicalRatio(openInterest, config.contractSize, metalData.totals.registered)
        : null;

      // Get OI change percentage
      let oiChangePercent: number | null = null;
      if (config.futuresSymbol && config.futuresSymbol !== 'PL+PA') {
        const product = volumeData.products.find(p => p.symbol === config.futuresSymbol);
        if (product && product.yoy_open_interest > 0) {
          oiChangePercent = ((product.open_interest - product.yoy_open_interest) / product.yoy_open_interest) * 100;
        }
      }

      // Build risk factors
      const riskFactors: RiskFactors = {
        coverageRatio,
        paperPhysicalRatio: ppData?.ratio ?? 1,
        inventoryChange30d: metalData.changes?.month.registered ?? null,
        deliveryVelocity: null,
        oiChange: oiChangePercent,
      };

      // Calculate composite risk score
      const riskScore = calculateCompositeRiskScore(riskFactors);

      // Store in database
      await upsertRiskScore(
        config.key,
        reportDate,
        riskScore.composite,
        riskScore.level,
        Math.round(riskScore.breakdown.coverageRisk),
        Math.round(riskScore.breakdown.paperPhysicalRisk),
        Math.round(riskScore.breakdown.inventoryTrendRisk),
        Math.round(riskScore.breakdown.deliveryVelocityRisk),
        Math.round(riskScore.breakdown.marketActivityRisk),
        riskScore.dominantFactor,
        riskScore.commentary
      );

      results.push({
        metal: config.key,
        score: riskScore.composite,
        level: riskScore.level,
      });
    }

    return NextResponse.json({
      success: true,
      date: reportDate,
      count: results.length,
      scores: results,
    });
  } catch (error) {
    console.error('Error syncing risk scores:', error);
    return NextResponse.json(
      { error: 'Failed to sync risk scores' },
      { status: 500 }
    );
  }
}
