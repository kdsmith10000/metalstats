import { NextResponse, NextRequest } from 'next/server';
import { isDatabaseAvailable, getForecastPriceTracking, upsertForecastPriceTracking } from '@/lib/db';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Retrieve price tracking data for a metal
export async function GET(request: NextRequest) {
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
  }

  const metal = request.nextUrl.searchParams.get('metal') || 'Gold';
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30');

  try {
    const tracking = await getForecastPriceTracking(metal, days);
    return NextResponse.json({ success: true, metal, tracking });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST: Record a live price observation against recent forecasts
export async function POST(request: NextRequest) {
  if (!isDatabaseAvailable()) {
    return NextResponse.json({ success: false, error: 'Database not available' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const livePrices: Record<string, number> = body.prices || {};
    const today = new Date().toISOString().split('T')[0];

    // Get recent non-neutral forecasts
    const recentForecasts = await sql`
      SELECT metal, forecast_date, direction, price_at_forecast
      FROM forecast_snapshots
      WHERE forecast_date >= CURRENT_DATE - 30
        AND direction != 'NEUTRAL'
      ORDER BY forecast_date DESC
    `;

    let tracked = 0;
    for (const row of recentForecasts as { metal: string; forecast_date: string; direction: string; price_at_forecast: number }[]) {
      const livePrice = livePrices[row.metal];
      if (!livePrice || Number(row.price_at_forecast) <= 0) continue;

      const forecastDate = typeof row.forecast_date === 'string'
        ? row.forecast_date.split('T')[0]
        : new Date(row.forecast_date).toISOString().split('T')[0];

      const daysSince = Math.floor((Date.now() - new Date(forecastDate).getTime()) / 86400000);

      await upsertForecastPriceTracking(
        row.metal,
        forecastDate,
        today,
        daysSince,
        Number(row.price_at_forecast),
        livePrice,
        row.direction,
      );
      tracked++;
    }

    return NextResponse.json({ success: true, tracked });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
