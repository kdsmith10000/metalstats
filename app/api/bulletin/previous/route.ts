import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

interface BulletinRow {
  date: string;
  symbol: string;
  product_name: string;
  total_volume: number | string;
  total_open_interest: number | string;
  total_oi_change: number | string;
  front_month: string;
  front_month_settle: number | string;
  front_month_change: number | string;
}

interface ProductData {
  symbol: string;
  name: string;
  totalVolume: number;
  totalOpenInterest: number;
  totalOiChange: number;
  frontMonth: string;
  frontMonthSettle: number;
  frontMonthChange: number;
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

// GET: Retrieve previous day's bulletin data (for comparison with current)
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set DATABASE_URL environment variable' },
      { status: 503 }
    );
  }

  try {
    const sql = getDb();

    // Get the two most recent bulletin dates
    const datesResult = await sql`
      SELECT DISTINCT date
      FROM bulletin_snapshots
      ORDER BY date DESC
      LIMIT 2
    `;

    if (datesResult.length < 2) {
      return NextResponse.json(
        { error: 'Not enough historical data', message: 'Need at least 2 days of data for comparison' },
        { status: 404 }
      );
    }

    const latestDate = datesResult[0].date;
    const previousDate = datesResult[1].date;

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

    const previousProducts = previousResult.reduce((acc: Record<string, ProductData>, row: BulletinRow) => {
      acc[row.symbol] = {
        symbol: row.symbol,
        name: row.product_name,
        totalVolume: parseInt(String(row.total_volume)) || 0,
        totalOpenInterest: parseInt(String(row.total_open_interest)) || 0,
        totalOiChange: parseInt(String(row.total_oi_change)) || 0,
        frontMonth: row.front_month,
        frontMonthSettle: parseFloat(String(row.front_month_settle)) || 0,
        frontMonthChange: parseFloat(String(row.front_month_change)) || 0,
      };
      return acc;
    }, {});

    const currentProducts = currentResult.reduce((acc: Record<string, ProductData>, row: BulletinRow) => {
      acc[row.symbol] = {
        symbol: row.symbol,
        name: row.product_name,
        totalVolume: parseInt(String(row.total_volume)) || 0,
        totalOpenInterest: parseInt(String(row.total_open_interest)) || 0,
        totalOiChange: parseInt(String(row.total_oi_change)) || 0,
        frontMonth: row.front_month,
        frontMonthSettle: parseFloat(String(row.front_month_settle)) || 0,
        frontMonthChange: parseFloat(String(row.front_month_change)) || 0,
      };
      return acc;
    }, {});

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
