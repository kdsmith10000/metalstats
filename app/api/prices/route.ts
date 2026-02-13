import { NextResponse } from 'next/server';

// Force dynamic rendering, cache for 60 seconds
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 60 }, // Cache for 60s
    });

    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      price,
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
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
