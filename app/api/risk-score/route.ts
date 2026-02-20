import { NextResponse } from 'next/server';
import { isDatabaseAvailable, getLatestRiskScores } from '@/lib/db';

// ISR: risk scores change once/day, cache for 5 minutes
export const revalidate = 300;

export async function GET() {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const riskScores = await getLatestRiskScores();

    // Transform to a more usable format
    const scores: Record<string, {
      composite: number;
      level: string;
      breakdown: {
        coverageRisk: number;
        paperPhysicalRisk: number;
        inventoryTrendRisk: number;
        deliveryVelocityRisk: number;
        marketActivityRisk: number;
      };
      dominantFactor: string;
      commentary: string;
      reportDate: string;
    }> = {};

    for (const score of riskScores) {
      scores[score.metal] = {
        composite: score.composite_score,
        level: score.risk_level,
        breakdown: {
          coverageRisk: score.coverage_risk,
          paperPhysicalRisk: score.paper_physical_risk,
          inventoryTrendRisk: score.inventory_trend_risk,
          deliveryVelocityRisk: score.delivery_velocity_risk,
          marketActivityRisk: score.market_activity_risk,
        },
        dominantFactor: score.dominant_factor,
        commentary: score.commentary,
        reportDate: score.report_date,
      };
    }

    return NextResponse.json({
      success: true,
      count: riskScores.length,
      scores,
    });
  } catch (error) {
    console.error('Error fetching risk scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk scores', details: String(error) },
      { status: 500 }
    );
  }
}
