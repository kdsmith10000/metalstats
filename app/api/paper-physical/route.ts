import { NextResponse } from 'next/server';
import { 
  getLatestPaperPhysicalRatios, 
  getLatestOpenInterest,
  isDatabaseAvailable 
} from '@/lib/db';

// ISR: paper/physical ratios change once/day, cache for 5 minutes
export const revalidate = 300;

// GET /api/paper-physical - Get latest paper/physical ratios
export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      );
    }

    const [paperPhysicalRatios, openInterestData] = await Promise.all([
      getLatestPaperPhysicalRatios(),
      getLatestOpenInterest(),
    ]);

    // Format the response
    const ratiosByMetal: Record<string, {
      metal: string;
      reportDate: string;
      futuresSymbol: string;
      openInterest: number;
      openInterestUnits: number;
      registeredInventory: number;
      paperPhysicalRatio: number;
      riskLevel: string;
    }> = {};

    for (const ratio of paperPhysicalRatios) {
      ratiosByMetal[ratio.metal] = {
        metal: ratio.metal,
        reportDate: ratio.report_date,
        futuresSymbol: ratio.futures_symbol,
        openInterest: Number(ratio.open_interest),
        openInterestUnits: Number(ratio.open_interest_units),
        registeredInventory: Number(ratio.registered_inventory),
        paperPhysicalRatio: Number(ratio.paper_physical_ratio),
        riskLevel: ratio.risk_level,
      };
    }

    const openInterestBySymbol: Record<string, {
      symbol: string;
      reportDate: string;
      openInterest: number;
      oiChange: number;
      totalVolume: number;
    }> = {};

    for (const oi of openInterestData) {
      openInterestBySymbol[oi.symbol] = {
        symbol: oi.symbol,
        reportDate: oi.report_date,
        openInterest: Number(oi.open_interest),
        oiChange: Number(oi.oi_change),
        totalVolume: Number(oi.total_volume),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        paperPhysical: ratiosByMetal,
        openInterest: openInterestBySymbol,
      },
    });
  } catch (error) {
    console.error('Error fetching paper/physical data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch paper/physical data' },
      { status: 500 }
    );
  }
}
