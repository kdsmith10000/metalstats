import { NextResponse, NextRequest } from 'next/server';
import { getPaperPhysicalHistory, isDatabaseAvailable } from '@/lib/db';

// GET /api/paper-physical/[metal]/history - Get paper/physical history for a metal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ metal: string }> }
) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { metal } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90', 10);

    const history = await getPaperPhysicalHistory(metal, days);

    return NextResponse.json({
      success: true,
      metal,
      days,
      data: history.map(h => ({
        date: h.report_date,
        openInterest: Number(h.open_interest),
        openInterestUnits: Number(h.open_interest_units),
        registeredInventory: Number(h.registered_inventory),
        paperPhysicalRatio: Number(h.paper_physical_ratio),
        riskLevel: h.risk_level,
      })),
    });
  } catch (error) {
    console.error('Error fetching paper/physical history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch paper/physical history' },
      { status: 500 }
    );
  }
}
