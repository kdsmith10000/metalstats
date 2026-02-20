import { NextResponse } from 'next/server';

// ISR: cache prices for 60s on the server (markets move slowly enough)
export const revalidate = 60;

// ── Spot price sources ──────────────────────────────────────────────────────
// Primary: physical-metal ETFs that closely track spot prices.
// We convert from ETF share price → per-ounce (or per-lb) spot using each
// fund's current ounces-per-share factor.
// Fallback: COMEX futures symbols (may carry a premium over spot).

interface SpotSource {
  etf: string;         // Yahoo symbol for the physical ETF
  ozPerShare: number;  // How many ounces of metal each ETF share represents
  futures: string;     // COMEX futures symbol as fallback
}

const SPOT_SOURCES: Record<string, SpotSource> = {
  Gold:      { etf: 'GLD',  ozPerShare: 0.09155, futures: 'GC=F' },  // SPDR Gold Trust
  Silver:    { etf: 'SLV',  ozPerShare: 1.0,     futures: 'SI=F' },  // iShares Silver Trust
  Copper:    { etf: '',      ozPerShare: 1.0,     futures: 'HG=F' },  // No good copper spot ETF
  Platinum:  { etf: 'PPLT', ozPerShare: 0.09385, futures: 'PL=F' },  // abrdn Platinum ETF
  Palladium: { etf: 'PALL', ozPerShare: 0.09385, futures: 'PA=F' },  // abrdn Palladium ETF
};

interface PriceResult {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  marketState: string;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
  marketState?: string;
}

/**
 * Fetch a price from Yahoo Finance chart API.
 * Returns the raw price data (no oz conversion — caller handles that).
 */
async function fetchYahooChart(symbol: string): Promise<{
  price: number;
  prevClose: number;
  timestamp: number;
  marketState: string;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta: YahooChartMeta = result.meta ?? {};

    // Best source: regularMarketPrice from metadata (latest trade)
    let price = meta.regularMarketPrice ?? 0;

    // Fallback: walk back through intraday closes
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

    return {
      price,
      prevClose: meta.chartPreviousClose ?? meta.previousClose ?? price,
      timestamp: (meta.regularMarketTime ?? 0) * 1000,
      marketState: meta.marketState ?? 'UNKNOWN',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the spot price for a metal.
 * 1. Try the physical ETF and convert share price → per-ounce spot
 * 2. Fall back to COMEX futures if ETF is unavailable
 */
async function fetchSpotPrice(metal: string, source: SpotSource): Promise<PriceResult | null> {
  // ── Try ETF first (spot-tracking) ──
  if (source.etf) {
    const etfData = await fetchYahooChart(source.etf);
    if (etfData) {
      const spotPrice = etfData.price / source.ozPerShare;
      const spotPrev = etfData.prevClose / source.ozPerShare;
      const change = spotPrice - spotPrev;
      const changePercent = spotPrev > 0 ? (change / spotPrev) * 100 : 0;

      return {
        price: Math.round(spotPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        timestamp: etfData.timestamp,
        marketState: etfData.marketState,
      };
    }
  }

  // ── Fallback to COMEX futures ──
  const futuresData = await fetchYahooChart(source.futures);
  if (futuresData) {
    const change = futuresData.price - futuresData.prevClose;
    const changePercent = futuresData.prevClose > 0 ? (change / futuresData.prevClose) * 100 : 0;

    return {
      price: Math.round(futuresData.price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: futuresData.timestamp,
      marketState: futuresData.marketState,
    };
  }

  return null;
}

export async function GET() {
  try {
    // Fetch all spot prices in parallel
    const entries = Object.entries(SPOT_SOURCES);
    const results = await Promise.all(
      entries.map(async ([metal, source]) => {
        const result = await fetchSpotPrice(metal, source);
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
