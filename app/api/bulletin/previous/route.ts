import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

interface OIRow {
  report_date: string;
  symbol: string;
  open_interest: number | string;
  oi_change: number | string;
  total_volume: number | string;
  settlement_price: number | string | null;
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

// Product name mapping
const productNames: Record<string, string> = {
  'GC': 'COMEX GOLD FUTURES',
  'SI': 'COMEX SILVER FUTURES',
  'HG': 'COMEX COPPER FUTURES',
  'PL': 'NYMEX PLATINUM FUTURES',
  'PA': 'NYMEX PALLADIUM FUTURES',
  'MGC': 'MICRO GOLD FUTURES',
  'SIL': 'MICRO SILVER FUTURES',
  'MHG': 'COMEX MICRO COPPER FUTURES',
  '1OZ': '1 OUNCE GOLD FUTURES',
  'QO': 'E-MINI GOLD FUTURES',
  'QI': 'E-MINI SILVER FUTURES',
  'ALI': 'COMEX PHYSICAL ALUMINUM FUTURES',
  'QC': 'COMEX E-MINI COPPER FUTURES',
};

function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  return neon(process.env.DATABASE_URL);
}

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Retrieve previous day's OI data (for comparison with current)
// Uses open_interest_snapshots table which has accurate data from volume_summary
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set DATABASE_URL environment variable', dbUrl: process.env.DATABASE_URL ? 'set' : 'not set' },
      { status: 503 }
    );
  }

  try {
    const sql = getDb();

    // Get the two most recent dates from open_interest_snapshots (more accurate data)
    const datesResult = await sql`
      SELECT DISTINCT report_date
      FROM open_interest_snapshots
      ORDER BY report_date DESC
      LIMIT 2
    `;

    if (datesResult.length < 2) {
      return NextResponse.json(
        { error: 'Not enough historical data', message: 'Need at least 2 days of data for comparison' },
        { status: 404 }
      );
    }

    // Convert dates to ISO string format for consistent handling
    const latestDate = datesResult[0].report_date instanceof Date 
      ? datesResult[0].report_date.toISOString().split('T')[0]
      : String(datesResult[0].report_date);
    const previousDate = datesResult[1].report_date instanceof Date
      ? datesResult[1].report_date.toISOString().split('T')[0]
      : String(datesResult[1].report_date);

    // Fetch all products for the previous date from open_interest_snapshots
    const previousResult = await sql`
      SELECT 
        report_date,
        symbol,
        open_interest,
        oi_change,
        total_volume,
        settlement_price
      FROM open_interest_snapshots
      WHERE report_date = ${previousDate}
      ORDER BY symbol
    `;

    // Also fetch current data for comparison
    const currentResult = await sql`
      SELECT 
        report_date,
        symbol,
        open_interest,
        oi_change,
        total_volume,
        settlement_price
      FROM open_interest_snapshots
      WHERE report_date = ${latestDate}
      ORDER BY symbol
    `;

    const previousProducts = (previousResult as OIRow[]).reduce((acc: Record<string, ProductData>, row) => {
      acc[row.symbol] = {
        symbol: row.symbol,
        name: productNames[row.symbol] || row.symbol,
        totalVolume: parseInt(String(row.total_volume)) || 0,
        totalOpenInterest: parseInt(String(row.open_interest)) || 0,
        totalOiChange: parseInt(String(row.oi_change)) || 0,
        frontMonth: '',
        frontMonthSettle: parseFloat(String(row.settlement_price)) || 0,
        frontMonthChange: 0,
      };
      return acc;
    }, {});

    const currentProducts = (currentResult as OIRow[]).reduce((acc: Record<string, ProductData>, row) => {
      acc[row.symbol] = {
        symbol: row.symbol,
        name: productNames[row.symbol] || row.symbol,
        totalVolume: parseInt(String(row.total_volume)) || 0,
        totalOpenInterest: parseInt(String(row.open_interest)) || 0,
        totalOiChange: parseInt(String(row.oi_change)) || 0,
        frontMonth: '',
        frontMonthSettle: parseFloat(String(row.settlement_price)) || 0,
        frontMonthChange: 0,
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
    console.error('Error fetching previous OI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previous OI data', details: errorMessage },
      { status: 500 }
    );
  }
}
