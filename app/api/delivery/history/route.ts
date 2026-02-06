import { neon } from '@neondatabase/serverless';
import { NextResponse, NextRequest } from 'next/server';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DeliveryRow {
  metal: string;
  report_date: string | Date;
  daily_issued: number | string;
  daily_stopped: number | string;
  month_to_date: number | string;
  settlement_price: number | string;
}

interface MonthlyAggRow {
  metal: string;
  year: number;
  month: number;
  month_total: number | string;
}

// Safely convert any date value (Date object, ISO string, etc.) to YYYY-MM-DD
function toDateString(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val);
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO datetime like "2026-02-05T00:00:00.000Z"
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoMatch) return isoMatch[1];
  // Try parsing as Date (handles "Thu Feb 05 2026 ..." etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return s;
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

// GET: Retrieve delivery history for charting
// Query params:
//   metal: Gold | Silver | Copper | Aluminum | Platinum (default: Gold)
//   days: number of days of history (default: 30, max: 730)
//   aggregate: 'daily' (default) | 'monthly'
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
    const metal = searchParams.get('metal') || 'Gold';
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 730);
    const aggregate = searchParams.get('aggregate') || 'daily';

    // Validate metal
    const validMetals = ['Gold', 'Silver', 'Copper', 'Aluminum', 'Platinum', 'Palladium'];
    if (!validMetals.includes(metal)) {
      return NextResponse.json(
        { error: 'Invalid metal', validMetals },
        { status: 400 }
      );
    }

    if (aggregate === 'monthly') {
      // Monthly aggregation: get the maximum month_to_date per month per metal
      // This represents the final/latest MTD for each month
      const result = await sql`
        SELECT 
          metal,
          EXTRACT(YEAR FROM report_date)::int as year,
          EXTRACT(MONTH FROM report_date)::int as month,
          MAX(month_to_date) as month_total
        FROM delivery_snapshots
        WHERE metal = ${metal}
          AND report_date >= CURRENT_DATE - ${days}::integer
        GROUP BY metal, EXTRACT(YEAR FROM report_date), EXTRACT(MONTH FROM report_date)
        ORDER BY year ASC, month ASC
      `;

      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const monthly = (result as MonthlyAggRow[]).map((row) => ({
        metal: row.metal,
        year: Number(row.year),
        month: Number(row.month),
        monthName: monthNames[Number(row.month)],
        total: parseInt(String(row.month_total)) || 0,
      }));

      return NextResponse.json({
        metal,
        aggregate: 'monthly',
        days,
        history: monthly,
      });
    } else {
      // Daily: return raw daily delivery data
      const result = await sql`
        SELECT 
          metal,
          report_date,
          daily_issued,
          daily_stopped,
          month_to_date,
          settlement_price
        FROM delivery_snapshots
        WHERE metal = ${metal}
          AND report_date >= CURRENT_DATE - ${days}::integer
        ORDER BY report_date ASC
      `;

      const history = (result as DeliveryRow[]).map((row) => ({
        metal: row.metal,
        date: toDateString(row.report_date),
        dailyIssued: parseInt(String(row.daily_issued)) || 0,
        dailyStopped: parseInt(String(row.daily_stopped)) || 0,
        monthToDate: parseInt(String(row.month_to_date)) || 0,
        settlement: parseFloat(String(row.settlement_price)) || 0,
      }));

      return NextResponse.json({
        metal,
        aggregate: 'daily',
        days,
        history,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching delivery history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery history', details: errorMessage },
      { status: 500 }
    );
  }
}
