import { NextResponse } from 'next/server';
import { getMetalHistory } from '@/lib/db';

// GET /api/metals/[metal]/history - Get historical data for a specific metal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ metal: string }> }
) {
  try {
    const { metal } = await params;
    
    // Parse query params for days
    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 90;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, error: 'Invalid days parameter (1-365)' },
        { status: 400 }
      );
    }

    const history = await getMetalHistory(metal, days);

    if (history.length === 0) {
      return NextResponse.json(
        { success: false, error: `No history found for ${metal}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      metal,
      days,
      data: history.map(h => ({
        date: h.report_date,
        registered: Number(h.registered),
        eligible: Number(h.eligible),
        total: Number(h.total),
      }))
    });
  } catch (error) {
    console.error('Error fetching metal history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metal history' },
      { status: 500 }
    );
  }
}
