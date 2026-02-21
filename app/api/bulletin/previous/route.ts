import { neon } from '@neondatabase/serverless';
import { NextResponse, NextRequest } from 'next/server';

interface BulletinRow {
  date: string;
  symbol: string;
  product_name: string;
  total_volume: number | string;
  total_open_interest: number | string;
  total_oi_change: number | string;
  front_month: string | null;
  front_month_settle: number | string | null;
  front_month_change: number | string | null;
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

function rowToProduct(row: BulletinRow): ProductData {
  return {
    symbol: row.symbol,
    name: row.product_name || row.symbol,
    totalVolume: parseInt(String(row.total_volume)) || 0,
    totalOpenInterest: parseInt(String(row.total_open_interest)) || 0,
    totalOiChange: parseInt(String(row.total_oi_change)) || 0,
    frontMonth: row.front_month || '',
    frontMonthSettle: parseFloat(String(row.front_month_settle)) || 0,
    frontMonthChange: parseFloat(String(row.front_month_change)) || 0,
  };
}

export const revalidate = 300;

// GET: Retrieve the previous day's bulletin data for comparison.
//
// Accepts an optional `currentDate` query parameter (ISO date string, e.g.
// "2026-02-20"). When provided, the endpoint returns the most recent
// bulletin_snapshots row whose date is strictly BEFORE that date. This
// ensures that after uploading Bulletin #34 (Feb 20), the "Daily Change"
// section compares against Bulletin #33 (Feb 19) — not some stale date.
//
// If `currentDate` is omitted, the endpoint falls back to finding the two
// most recent distinct dates in bulletin_snapshots and returning the older
// one.
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set DATABASE_URL environment variable' },
      { status: 503 }
    );
  }

  try {
    const sql = getDb();
    const currentDate = request.nextUrl.searchParams.get('currentDate');

    let previousDate: string | null = null;
    let previousProducts: Record<string, ProductData> = {};

    if (currentDate) {
      // Find the most recent bulletin date strictly before the current date
      const dateResult = await sql`
        SELECT DISTINCT date
        FROM bulletin_snapshots
        WHERE date < ${currentDate}::date
        ORDER BY date DESC
        LIMIT 1
      `;

      if (dateResult.length > 0) {
        previousDate = dateResult[0].date instanceof Date
          ? dateResult[0].date.toISOString().split('T')[0]
          : String(dateResult[0].date).split('T')[0];
      }
    } else {
      // No currentDate provided — grab the two most recent distinct dates
      const datesResult = await sql`
        SELECT DISTINCT date
        FROM bulletin_snapshots
        ORDER BY date DESC
        LIMIT 2
      `;

      if (datesResult.length >= 2) {
        previousDate = datesResult[1].date instanceof Date
          ? datesResult[1].date.toISOString().split('T')[0]
          : String(datesResult[1].date).split('T')[0];
      } else if (datesResult.length === 1) {
        previousDate = datesResult[0].date instanceof Date
          ? datesResult[0].date.toISOString().split('T')[0]
          : String(datesResult[0].date).split('T')[0];
      }
    }

    if (!previousDate) {
      return NextResponse.json(
        { error: 'No previous bulletin data', message: 'No earlier snapshot found in bulletin_snapshots' },
        { status: 404 }
      );
    }

    // Fetch all products for the previous date
    const rows = await sql`
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
      WHERE date = ${previousDate}::date
      ORDER BY symbol
    `;

    previousProducts = (rows as BulletinRow[]).reduce(
      (acc: Record<string, ProductData>, row) => {
        acc[row.symbol] = rowToProduct(row);
        return acc;
      },
      {}
    );

    return NextResponse.json({
      previousDate,
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
