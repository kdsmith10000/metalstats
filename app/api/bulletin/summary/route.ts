import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

function isDatabaseConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

// GET: Retrieve bulletin summary for dashboard cards
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Set POSTGRES_URL environment variable' },
      { status: 503 }
    );
  }

  try {
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

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No bulletin data available' },
        { status: 404 }
      );
    }

    // Build summary object
    const summary = {
      date: result.rows[0].date,
      gold: { settle: 0, change: 0, volume: 0, oi: 0 },
      silver: { settle: 0, change: 0, volume: 0, oi: 0 },
      copper: { settle: 0, change: 0, volume: 0, oi: 0 },
      platinum: { settle: 0, change: 0, volume: 0, oi: 0 },
      palladium: { settle: 0, change: 0, volume: 0, oi: 0 },
      aluminum: { settle: 0, change: 0, volume: 0, oi: 0 },
    };

    for (const row of result.rows) {
      const data = {
        settle: parseFloat(row.front_month_settle) || 0,
        change: parseFloat(row.front_month_change) || 0,
        volume: parseInt(row.total_volume) || 0,
        oi: parseInt(row.total_open_interest) || 0,
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
