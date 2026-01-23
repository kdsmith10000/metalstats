import { sql } from '@vercel/postgres';
import { NextResponse, NextRequest } from 'next/server';

function isDatabaseConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

// GET: Retrieve historical bulletin data for a specific symbol
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set POSTGRES_URL environment variable' },
      { status: 503 }
    );
  }

  try {
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

    const history = result.rows.map(row => ({
      date: row.date,
      symbol: row.symbol,
      settle: parseFloat(row.front_month_settle) || 0,
      volume: parseInt(row.total_volume) || 0,
      openInterest: parseInt(row.total_open_interest) || 0,
      oiChange: parseInt(row.total_oi_change) || 0,
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
