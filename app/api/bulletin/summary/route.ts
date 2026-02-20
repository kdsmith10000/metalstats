import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

// ISR: summary data changes once/day, cache for 5 minutes
export const revalidate = 300;

interface SummaryRow {
  date: string;
  symbol: string;
  front_month_settle: number | string;
  front_month_change: number | string;
  total_volume: number | string;
  total_open_interest: number | string;
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

// GET: Retrieve bulletin summary for dashboard cards
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
    const result = await sql`
      SELECT 
        date,
        symbol,
        front_month_settle,
        front_month_change,
        total_volume,
        total_open_interest
      FROM bulletin_snapshots
      WHERE date = (SELECT MAX(date) FROM bulletin_snapshots)
      ORDER BY symbol
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No bulletin data available' },
        { status: 404 }
      );
    }

    // Build summary object
    const summary = {
      date: result[0].date,
      gold: { settle: 0, change: 0, volume: 0, oi: 0 },
      silver: { settle: 0, change: 0, volume: 0, oi: 0 },
      copper: { settle: 0, change: 0, volume: 0, oi: 0 },
      platinum: { settle: 0, change: 0, volume: 0, oi: 0 },
      palladium: { settle: 0, change: 0, volume: 0, oi: 0 },
      aluminum: { settle: 0, change: 0, volume: 0, oi: 0 },
    };

    for (const row of result as SummaryRow[]) {
      const data = {
        settle: parseFloat(String(row.front_month_settle)) || 0,
        change: parseFloat(String(row.front_month_change)) || 0,
        volume: parseInt(String(row.total_volume)) || 0,
        oi: parseInt(String(row.total_open_interest)) || 0,
      };

      switch (row.symbol) {
        case 'GC':
        case '1OZ':
          // Prefer GC (main gold contract)
          if (row.symbol === 'GC' || summary.gold.settle === 0) {
            summary.gold = data;
          }
          break;
        case 'SI':
        case 'SIL':
          // Prefer SIL (5000 oz silver)
          if (row.symbol === 'SIL' || summary.silver.settle === 0) {
            summary.silver = data;
          }
          break;
        case 'HG':
          summary.copper = data;
          break;
        case 'PL':
          summary.platinum = data;
          break;
        case 'PA':
          summary.palladium = data;
          break;
        case 'ALI':
          summary.aluminum = data;
          break;
      }
    }

    return NextResponse.json(summary);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching bulletin summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletin summary', details: errorMessage },
      { status: 500 }
    );
  }
}
