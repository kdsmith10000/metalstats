import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

interface BulletinRow {
  symbol: string;
  product_name: string;
  total_volume: number | string;
  total_open_interest: number | string;
  total_oi_change: number | string;
  front_month: string;
  front_month_settle: number | string;
  front_month_change: number | string;
}

function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  return neon(process.env.DATABASE_URL);
}

// GET: Retrieve latest bulletin data
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set DATABASE_URL environment variable' },
      { status: 503 }
    );
  }

  try {
    const sql = getDb();

    // Get the most recent bulletin date
    const dateResult = await sql`
      SELECT DISTINCT date
      FROM bulletin_snapshots
      ORDER BY date DESC
      LIMIT 1
    `;

    if (dateResult.length === 0) {
      return NextResponse.json(
        { error: 'No bulletin data available' },
        { status: 404 }
      );
    }

    const latestDate = dateResult[0].date;

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

    const products = (dataResult as BulletinRow[]).map((row) => ({
      symbol: row.symbol,
      name: row.product_name,
      totalVolume: parseInt(String(row.total_volume)) || 0,
      totalOpenInterest: parseInt(String(row.total_open_interest)) || 0,
      totalOiChange: parseInt(String(row.total_oi_change)) || 0,
      frontMonth: row.front_month,
      frontMonthSettle: parseFloat(String(row.front_month_settle)) || 0,
      frontMonthChange: parseFloat(String(row.front_month_change)) || 0,
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
