import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

function isDatabaseConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

// GET: Retrieve latest bulletin data
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set POSTGRES_URL environment variable' },
      { status: 503 }
    );
  }

  try {
    // Get the most recent bulletin date
    const dateResult = await sql`
      SELECT DISTINCT date
      FROM bulletin_snapshots
      ORDER BY date DESC
      LIMIT 1
    `;

    if (dateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No bulletin data available' },
        { status: 404 }
      );
    }

    const latestDate = dateResult.rows[0].date;

    // Fetch all products for that date
    const dataResult = await sql`
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

    const products = dataResult.rows.map(row => ({
      symbol: row.symbol,
      name: row.product_name,
      totalVolume: parseInt(row.total_volume) || 0,
      totalOpenInterest: parseInt(row.total_open_interest) || 0,
      totalOiChange: parseInt(row.total_oi_change) || 0,
      frontMonth: row.front_month,
      frontMonthSettle: parseFloat(row.front_month_settle) || 0,
      frontMonthChange: parseFloat(row.front_month_change) || 0,
    }));

    return NextResponse.json({
      date: latestDate,
      products,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching bulletin data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletin data', details: errorMessage },
      { status: 500 }
    );
  }
}
