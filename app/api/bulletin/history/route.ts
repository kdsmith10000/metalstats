import { neon } from '@neondatabase/serverless';
import { NextResponse, NextRequest } from 'next/server';

interface HistoryRow {
  date: string;
  symbol: string;
  front_month_settle: number | string;
  total_volume: number | string;
  total_open_interest: number | string;
  total_oi_change: number | string;
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

// GET: Retrieve historical bulletin data for a specific symbol
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set DATABASE_URL environment variable' },
      { status: 503 }
    );
  }

  try {
    const sql = getDb();
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'GC';
    const days = parseInt(searchParams.get('days') || '30');

    // Validate inputs
    const validSymbols = ['GC', '1OZ', 'SI', 'SIL', 'HG', 'PL', 'PA', 'ALI'];
    if (!validSymbols.includes(symbol.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid symbol', validSymbols },
        { status: 400 }
      );
    }

    const maxDays = Math.min(days, 365); // Limit to 1 year

    const result = await sql`
      SELECT 
        date,
        symbol,
        front_month_settle,
        total_volume,
        total_open_interest,
        total_oi_change
      FROM bulletin_snapshots
      WHERE symbol = ${symbol.toUpperCase()}
      ORDER BY date DESC
      LIMIT ${maxDays}
    `;

    const history = result.map((row: HistoryRow) => ({
      date: row.date,
      symbol: row.symbol,
      settle: parseFloat(String(row.front_month_settle)) || 0,
      volume: parseInt(String(row.total_volume)) || 0,
      openInterest: parseInt(String(row.total_open_interest)) || 0,
      oiChange: parseInt(String(row.total_oi_change)) || 0,
    })).reverse(); // Return in chronological order

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      days: maxDays,
      history,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching bulletin history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletin history', details: errorMessage },
      { status: 500 }
    );
  }
}
