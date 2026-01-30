import { NextResponse } from 'next/server';
import { isDatabaseAvailable, getRiskScoreHistory } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ metal: string }> }
) {
  try {
    const { metal } = await params;
    
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90', 10);

    const history = await getRiskScoreHistory(metal, days);

    return NextResponse.json({
      success: true,
      metal,
      days,
      count: history.length,
      history: history.map(h => ({
        date: h.report_date,
        composite: h.composite_score,
        level: h.risk_level,
        breakdown: {
          coverageRisk: h.coverage_risk,
          paperPhysicalRisk: h.paper_physical_risk,
          inventoryTrendRisk: h.inventory_trend_risk,
          deliveryVelocityRisk: h.delivery_velocity_risk,
          marketActivityRisk: h.market_activity_risk,
        },
        dominantFactor: h.dominant_factor,
        commentary: h.commentary,
      })),
    });
  } catch (error) {
    console.error('Error fetching risk score history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk score history', details: String(error) },
      { status: 500 }
    );
  }
}
