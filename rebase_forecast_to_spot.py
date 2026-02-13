#!/usr/bin/env python3
"""
Rebase forecast.json prices from COMEX futures to spot prices.

Fetches live spot prices via physical-metal ETFs and rescales all
price-denominated fields in forecast.json while preserving percentage-
based metrics (direction, confidence, signals, etc.).
"""
import json
import os
import time
from datetime import datetime

import requests

# Spot sources: same as in forecast.py and /api/prices/route.ts
SPOT_SOURCES = {
    "Gold":      ("GLD",  0.09155, "GC=F"),
    "Silver":    ("SLV",  1.0,     "SI=F"),
    "Copper":    ("",     1.0,     "HG=F"),    # No ETF, stays on futures
    "Platinum":  ("PPLT", 0.09385, "PL=F"),
    "Palladium": ("PALL", 0.09385, "PA=F"),
}


def fetch_price(ticker: str) -> float | None:
    """Fetch the latest price from Yahoo Finance for any ticker."""
    ts = int(time.time())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1m&range=1d&_={ts}"
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        return result[0].get("meta", {}).get("regularMarketPrice")
    except Exception as e:
        print(f"  ERROR fetching {ticker}: {e}")
        return None


def get_spot_price(metal: str) -> float | None:
    """Get the spot price for a metal (per ounce or per lb for copper)."""
    etf, oz_per_share, futures = SPOT_SOURCES[metal]
    if etf:
        etf_price = fetch_price(etf)
        if etf_price and etf_price > 0:
            return round(etf_price / oz_per_share, 2)
    # Fallback to futures
    futures_price = fetch_price(futures)
    if futures_price and futures_price > 0:
        return round(futures_price, 2)
    return None


def main():
    forecast_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "public", "forecast.json"
    )

    print("Loading forecast.json...")
    with open(forecast_path) as f:
        data = json.load(f)

    print("Fetching live spot prices...\n")

    for metal, fc in data["metals"].items():
        old_price = fc.get("current_price", 0)
        spot = get_spot_price(metal)

        if not spot or spot <= 0:
            print(f"  {metal}: Could not fetch spot price, skipping")
            continue

        if old_price <= 0:
            print(f"  {metal}: No existing price to rebase from, setting to ${spot:,.2f}")
            fc["current_price"] = spot
            continue

        ratio = spot / old_price
        print(f"  {metal}: COMEX ${old_price:,.2f} → Spot ${spot:,.2f}  (ratio: {ratio:.4f})")

        # Update current price
        fc["current_price"] = spot

        # Rescale forecast price levels (low/mid/high) proportionally
        for horizon in ("forecast_5d", "forecast_20d"):
            fh = fc.get(horizon)
            if not fh:
                continue
            fh["low"]  = round(fh["low"]  * ratio, 2)
            fh["mid"]  = round(fh["mid"]  * ratio, 2)
            fh["high"] = round(fh["high"] * ratio, 2)
            # pct_change is preserved (percentage moves stay the same)

        # Rescale trend indicator SMAs and MACD histogram (price-denominated)
        ti = fc.get("trend_indicators", {})
        for key in ("sma5", "sma20", "sma50"):
            if key in ti:
                ti[key] = round(ti[key] * ratio, 2)
        if "macd_histogram" in ti:
            ti["macd_histogram"] = round(ti["macd_histogram"] * ratio, 4)

    # Update generation timestamp
    data["generated_at"] = datetime.utcnow().isoformat() + "+00:00"

    print(f"\nWriting updated forecast.json...")
    with open(forecast_path, "w") as f:
        json.dump(data, f, indent=2)

    print("Done! Forecast rebased to spot prices.\n")

    # Print summary
    print("=" * 60)
    print("REBASED FORECAST SUMMARY")
    print("=" * 60)
    for metal, fc in data["metals"].items():
        price = fc["current_price"]
        direction = fc["direction"]
        fc5 = fc.get("forecast_5d")
        range_str = ""
        if fc5:
            range_str = f"  5d: ${fc5['low']:,.2f} - ${fc5['high']:,.2f} ({fc5['pct_change']:+.1f}%)"
        print(f"  {metal:12s} {direction:8s}  ${price:>10,.2f}{range_str}")


if __name__ == "__main__":
    main()
