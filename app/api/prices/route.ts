import { NextResponse } from 'next/server';

// Force dynamic rendering, no server-side caching for fresh prices
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Yahoo Finance futures symbols for COMEX metals
const SYMBOLS: Record<string, string> = {
  Gold: 'GC=F',
  Silver: 'SI=F',
  Copper: 'HG=F',
  Platinum: 'PL=F',
  Palladium: 'PA=F',
};

interface PriceResult {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  marketState: string;
}

async function fetchYahooPrice(symbol: string): Promise<PriceResult | null> {
  try {
    // Use 1-minute interval to get the most recent intraday price
    // Add cache-busting timestamp to prevent stale CDN/proxy responses
    const cacheBust = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&_=${cacheBust}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store', // Never use Next.js server-side cache — always hit Yahoo
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    if (!meta) return null;

    // Best source: regularMarketPrice from metadata (latest trade)
    let price = meta.regularMarketPrice ?? 0;

    // Fallback: if regularMarketPrice is missing or zero, walk back through
    // the intraday closes to find the most recent actual tick
    if (!price || price <= 0) {
      const closes = result.indicators?.quote?.[0]?.close;
      if (Array.isArray(closes)) {
        for (let i = closes.length - 1; i >= 0; i--) {
          if (closes[i] != null && closes[i] > 0) {
            price = closes[i];
            break;
          }
        }
      }
    }

    if (!price || price <= 0) return null;

    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: (meta.regularMarketTime ?? 0) * 1000,
      marketState: meta.marketState ?? 'UNKNOWN',
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Fetch all prices in parallel
    const entries = Object.entries(SYMBOLS);
    const results = await Promise.all(
      entries.map(async ([metal, symbol]) => {
        const result = await fetchYahooPrice(symbol);
        return [metal, result] as const;
      })
    );

    const prices: Record<string, PriceResult | null> = {};
    for (const [metal, result] of results) {
      prices[metal] = result;
    }

    return NextResponse.json({
      success: true,
      prices,
      fetched_at: new Date().toISOString(),
    }, {
      headers: {
        // Short server cache, no stale-while-revalidate to avoid serving old prices
        'Cache-Control': 'public, s-maxage=30, max-age=0, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
