import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

function isDatabaseConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

// GET: Retrieve previous day's bulletin data (for comparison with current)
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set POSTGRES_URL environment variable' },
      { status: 503 }
    );
  }

  try {
    // Get the two most recent bulletin dates
    const datesResult = await sql`
      SELECT DISTINCT date
      FROM bulletin_snapshots
      ORDER BY date DESC
      LIMIT 2
    `;

    if (datesResult.rows.length < 2) {
      return NextResponse.json(
        { error: 'Not enough historical data', message: 'Need at least 2 days of data for comparison' },
        { status: 404 }
      );
    }

    const latestDate = datesResult.rows[0].date;
    const previousDate = datesResult.rows[1].date;

    // Fetch all products for the previous date
    const previousResult = await sql`
      SELECT 
        date,
        symbol,
        product_name,
        total_volume,
        total_open_interest,
        total_oi_change,
        front_month,
        front_month_settle,
        front_month_change
      FROM bulletin_snapshots
      WHERE date = ${previousDate}
      ORDER BY symbol
    `;

    // Also fetch current data for comparison
    const currentResult = await sql`
      SELECT 
        date,
        symbol,
        product_name,
        total_volume,
        total_open_interest,
        total_oi_change,
        front_month,
        front_month_settle,
        front_month_change
      FROM bulletin_snapshots
      WHERE date = ${latestDate}
      ORDER BY symbol
    `;

    const previousProducts = previousResult.rows.reduce((acc, row) => {
      acc[row.symbol] = {
        symbol: row.symbol,
        name: row.product_name,
        totalVolume: parseInt(row.total_volume) || 0,
        totalOpenInterest: parseInt(row.total_open_interest) || 0,
        totalOiChange: parseInt(row.total_oi_change) || 0,
        frontMonth: row.front_month,
        frontMonthSettle: parseFloat(row.front_month_settle) || 0,
        frontMonthChange: parseFloat(row.front_month_change) || 0,
      };
      return acc;
    }, {} as Record<string, {
      symbol: string;
      name: string;
      totalVolume: number;
      totalOpenInterest: number;
      totalOiChange: number;
      frontMonth: string;
      frontMonthSettle: number;
      frontMonthChange: number;
    }>);

    const currentProducts = currentResult.rows.reduce((acc, row) => {
      acc[row.symbol] = {
        symbol: row.symbol,
        name: row.product_name,
        totalVolume: parseInt(row.total_volume) || 0,
        totalOpenInterest: parseInt(row.total_open_interest) || 0,
        totalOiChange: parseInt(row.total_oi_change) || 0,
        frontMonth: row.front_month,
        frontMonthSettle: parseFloat(row.front_month_settle) || 0,
        frontMonthChange: parseFloat(row.front_month_change) || 0,
      };
      return acc;
    }, {} as Record<string, {
      symbol: string;
      name: string;
      totalVolume: number;
      totalOpenInterest: number;
      totalOiChange: number;
      frontMonth: string;
      frontMonthSettle: number;
      frontMonthChange: number;
    }>);

    return NextResponse.json({
      currentDate: latestDate,
      previousDate,
      current: currentProducts,
      previous: previousProducts,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching previous bulletin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previous bulletin data', details: errorMessage },
      { status: 500 }
    );
  }
}
