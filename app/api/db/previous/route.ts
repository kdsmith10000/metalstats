import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET: Retrieve previous day's data (most recent before today)
export async function GET() {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Query for the most recent date before today
    const result = await sql`
      SELECT DISTINCT date
      FROM warehouse_snapshots
      WHERE date < ${todayStr}
      ORDER BY date DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No previous day data available' },
        { status: 404 }
      );
    }

    const previousDate = (result as Record<string, unknown>[])[0].date;

    // Fetch all metals for that date
    const dataResult = await sql`
      SELECT 
        metal,
        report_date,
        activity_date,
        registered,
        eligible,
        total
      FROM warehouse_snapshots
      WHERE date = ${previousDate}
      ORDER BY metal
    `;

    // Transform to match WarehouseStocksData structure
    const data: Record<string, Record<string, unknown>> = {};
    for (const row of dataResult as Record<string, string>[]) {
      data[row.metal] = {
        metal: row.metal,
        report_date: row.report_date,
        activity_date: row.activity_date,
        totals: {
          registered: parseFloat(row.registered),
          eligible: parseFloat(row.eligible),
          total: parseFloat(row.total),
        },
      };
    }

    return NextResponse.json({
      date: previousDate,
      data,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching previous day data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previous day data', details: errMsg },
      { status: 500 }
    );
  }
}
