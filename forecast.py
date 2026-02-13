#!/usr/bin/env python3
"""
COMEX Metals Price Forecasting Engine
Generates directional price forecasts using time-series analysis,
physical market signals, ARIMA models, and statistical tests.
"""

import json
import os
import warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv
from scipy import stats as scipy_stats

# Suppress convergence warnings from statsmodels/pmdarima
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

load_dotenv()

# ── Metal configuration ──────────────────────────────────────────────────────
METALS = {
    "Gold":      {"symbol": "GC", "contract_size": 100,   "unit": "oz"},
    "Silver":    {"symbol": "SI", "contract_size": 5000,  "unit": "oz"},
    "Copper":    {"symbol": "HG", "contract_size": 25000, "unit": "lbs"},
    "Platinum":  {"symbol": "PL", "contract_size": 50,    "unit": "oz"},
    "Palladium": {"symbol": "PA", "contract_size": 100,   "unit": "oz"},
}

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")


# ═══════════════════════════════════════════════════════════════════════════════
# DATA FETCHING
# ═══════════════════════════════════════════════════════════════════════════════

def get_db_connection():
    """Get a psycopg2 connection from DATABASE_URL."""
    url = os.environ.get("DATABASE_URL") or os.environ.get("DATABASE_URL_UNPOOLED")
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(url)


def fetch_all_data(metal: str, days: int = 365) -> dict:
    """Fetch all historical data for a single metal from the database."""
    symbol = METALS[metal]["symbol"]
    conn = get_db_connection()
    try:
        cur = conn.cursor()

        # 1. Bulletin snapshots (price, volume, OI)
        cur.execute("""
            SELECT date, front_month_settle, total_volume, total_open_interest, total_oi_change
            FROM bulletin_snapshots
            WHERE symbol = %s AND date >= CURRENT_DATE - %s
            ORDER BY date ASC
        """, (symbol, days))
        bulletin_rows = cur.fetchall()

        # 2. Metal snapshots (warehouse inventory)
        cur.execute("""
            SELECT report_date, registered, eligible, total
            FROM metal_snapshots
            WHERE metal = %s AND report_date >= CURRENT_DATE - %s
            ORDER BY report_date ASC
        """, (metal, days))
        inventory_rows = cur.fetchall()

        # 3. Delivery snapshots
        cur.execute("""
            SELECT report_date, settlement_price, daily_issued, daily_stopped, month_to_date
            FROM delivery_snapshots
            WHERE metal = %s AND report_date >= CURRENT_DATE - %s
            ORDER BY report_date ASC
        """, (metal, days))
        delivery_rows = cur.fetchall()

        # 4. Open interest snapshots
        cur.execute("""
            SELECT report_date, open_interest, oi_change, total_volume
            FROM open_interest_snapshots
            WHERE symbol = %s AND report_date >= CURRENT_DATE - %s
            ORDER BY report_date ASC
        """, (symbol, days))
        oi_rows = cur.fetchall()

        # 5. Paper/physical snapshots
        cur.execute("""
            SELECT report_date, paper_physical_ratio, registered_inventory, open_interest
            FROM paper_physical_snapshots
            WHERE metal = %s AND report_date >= CURRENT_DATE - %s
            ORDER BY report_date ASC
        """, (metal, days))
        pp_rows = cur.fetchall()

        # 6. Risk score snapshots
        cur.execute("""
            SELECT report_date, composite_score, coverage_risk, paper_physical_risk,
                   inventory_trend_risk, delivery_velocity_risk, market_activity_risk
            FROM risk_score_snapshots
            WHERE metal = %s AND report_date >= CURRENT_DATE - %s
            ORDER BY report_date ASC
        """, (metal, days))
        risk_rows = cur.fetchall()

        cur.close()
    finally:
        conn.close()

    # ── Build DataFrames ─────────────────────────────────────────────────
    prices_df = pd.DataFrame(
        bulletin_rows,
        columns=["date", "settle", "volume", "open_interest", "oi_change"]
    )
    if not prices_df.empty:
        prices_df["date"] = pd.to_datetime(prices_df["date"])
        prices_df.set_index("date", inplace=True)
        for c in ["settle", "volume", "open_interest", "oi_change"]:
            prices_df[c] = pd.to_numeric(prices_df[c], errors="coerce")
        prices_df.sort_index(inplace=True)

    inventory_df = pd.DataFrame(
        inventory_rows, columns=["date", "registered", "eligible", "total"]
    )
    if not inventory_df.empty:
        inventory_df["date"] = pd.to_datetime(inventory_df["date"])
        inventory_df.set_index("date", inplace=True)
        for c in ["registered", "eligible", "total"]:
            inventory_df[c] = pd.to_numeric(inventory_df[c], errors="coerce")
        inventory_df.sort_index(inplace=True)

    delivery_df = pd.DataFrame(
        delivery_rows,
        columns=["date", "settlement_price", "daily_issued", "daily_stopped", "month_to_date"]
    )
    if not delivery_df.empty:
        delivery_df["date"] = pd.to_datetime(delivery_df["date"])
        delivery_df.set_index("date", inplace=True)
        for c in ["settlement_price", "daily_issued", "daily_stopped", "month_to_date"]:
            delivery_df[c] = pd.to_numeric(delivery_df[c], errors="coerce")
        delivery_df.sort_index(inplace=True)

    oi_df = pd.DataFrame(
        oi_rows, columns=["date", "open_interest", "oi_change", "total_volume"]
    )
    if not oi_df.empty:
        oi_df["date"] = pd.to_datetime(oi_df["date"])
        oi_df.set_index("date", inplace=True)
        for c in ["open_interest", "oi_change", "total_volume"]:
            oi_df[c] = pd.to_numeric(oi_df[c], errors="coerce")
        oi_df.sort_index(inplace=True)

    pp_df = pd.DataFrame(
        pp_rows, columns=["date", "pp_ratio", "registered_inventory", "open_interest"]
    )
    if not pp_df.empty:
        pp_df["date"] = pd.to_datetime(pp_df["date"])
        pp_df.set_index("date", inplace=True)
        for c in ["pp_ratio", "registered_inventory", "open_interest"]:
            pp_df[c] = pd.to_numeric(pp_df[c], errors="coerce")
        pp_df.sort_index(inplace=True)

    risk_df = pd.DataFrame(
        risk_rows,
        columns=["date", "composite_score", "coverage_risk", "paper_physical_risk",
                  "inventory_trend_risk", "delivery_velocity_risk", "market_activity_risk"]
    )
    if not risk_df.empty:
        risk_df["date"] = pd.to_datetime(risk_df["date"])
        risk_df.set_index("date", inplace=True)
        for c in risk_df.columns:
            risk_df[c] = pd.to_numeric(risk_df[c], errors="coerce")
        risk_df.sort_index(inplace=True)

    return {
        "prices": prices_df,
        "inventory": inventory_df,
        "delivery": delivery_df,
        "oi": oi_df,
        "pp": pp_df,
        "risk": risk_df,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 1. PRICE TREND ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

def compute_trend_signals(prices: pd.DataFrame) -> dict:
    """Compute SMA/EMA crossovers, Bollinger Bands, RSI, MACD."""
    result = {
        "score": 50,
        "details": "Insufficient price data",
        "indicators": {},
    }
    if prices.empty or "settle" not in prices.columns:
        return result

    s = prices["settle"].dropna()
    if len(s) < 20:
        return result

    # ── Moving Averages ──────────────────────────────────────────────────
    sma5 = s.rolling(5).mean()
    sma10 = s.rolling(10).mean()
    sma20 = s.rolling(20).mean()
    sma50 = s.rolling(min(50, len(s))).mean()
    ema12 = s.ewm(span=12, adjust=False).mean()
    ema26 = s.ewm(span=26, adjust=False).mean()

    latest = s.iloc[-1]
    latest_sma5 = sma5.iloc[-1] if not np.isnan(sma5.iloc[-1]) else latest
    latest_sma20 = sma20.iloc[-1] if not np.isnan(sma20.iloc[-1]) else latest
    latest_sma50 = sma50.iloc[-1] if not np.isnan(sma50.iloc[-1]) else latest

    # SMA crossover score: +1 for each bullish crossover
    ma_score = 0
    if latest_sma5 > latest_sma20:
        ma_score += 1
    else:
        ma_score -= 1
    if latest > latest_sma50:
        ma_score += 1
    else:
        ma_score -= 1
    if latest_sma20 > latest_sma50:
        ma_score += 1
    else:
        ma_score -= 1

    # ── Bollinger Bands ──────────────────────────────────────────────────
    bb_mid = sma20
    bb_std = s.rolling(20).std()
    bb_upper = bb_mid + 2 * bb_std
    bb_lower = bb_mid - 2 * bb_std

    bb_position = 0.5  # neutral
    if not np.isnan(bb_upper.iloc[-1]) and not np.isnan(bb_lower.iloc[-1]):
        bb_range = bb_upper.iloc[-1] - bb_lower.iloc[-1]
        if bb_range > 0:
            bb_position = (latest - bb_lower.iloc[-1]) / bb_range
            bb_position = max(0.0, min(1.0, bb_position))

    # ── RSI (14-day) ─────────────────────────────────────────────────────
    delta = s.diff()
    gain = delta.where(delta > 0, 0.0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    latest_rsi = rsi.iloc[-1] if not np.isnan(rsi.iloc[-1]) else 50.0

    # ── MACD (12, 26, 9) ────────────────────────────────────────────────
    macd_line = ema12 - ema26
    macd_signal = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - macd_signal

    macd_bullish = False
    if len(macd_hist) >= 2:
        macd_bullish = macd_hist.iloc[-1] > 0 and macd_hist.iloc[-1] > macd_hist.iloc[-2]

    # ── Rate of Change (10-day) ──────────────────────────────────────────
    roc_10 = ((s / s.shift(10)) - 1) * 100 if len(s) >= 11 else pd.Series([0.0])
    latest_roc = roc_10.iloc[-1] if not np.isnan(roc_10.iloc[-1]) else 0.0

    # ── Volatility ───────────────────────────────────────────────────────
    returns = s.pct_change().dropna()
    vol_10 = returns.rolling(10).std().iloc[-1] * 100 if len(returns) >= 10 else 0.0
    vol_20 = returns.rolling(20).std().iloc[-1] * 100 if len(returns) >= 20 else 0.0

    # ── Composite trend score (0-100, >50 = bullish) ─────────────────────
    # MA contribution: ma_score ranges -3 to +3 -> map to 20-80
    ma_norm = (ma_score + 3) / 6 * 60 + 20

    # RSI contribution: 30-70 = neutral zone
    if latest_rsi > 70:
        rsi_score = 70  # overbought, slightly bullish but caution
    elif latest_rsi < 30:
        rsi_score = 30  # oversold, slightly bearish but bounce likely
    else:
        rsi_score = latest_rsi  # linear mapping

    # MACD contribution
    macd_score = 65 if macd_bullish else 35

    # Bollinger position: extreme positions suggest mean-reversion
    bb_score = bb_position * 100

    # Weighted composite
    score = (
        ma_norm * 0.30 +
        rsi_score * 0.25 +
        macd_score * 0.25 +
        bb_score * 0.20
    )
    score = max(0, min(100, score))

    # Build details string
    details_parts = []
    if latest_sma5 > latest_sma20:
        details_parts.append("SMA5 > SMA20")
    else:
        details_parts.append("SMA5 < SMA20")

    if macd_bullish:
        details_parts.append("MACD bullish")
    else:
        details_parts.append("MACD bearish")

    details_parts.append(f"RSI {latest_rsi:.0f}")
    details_parts.append(f"ROC(10) {latest_roc:+.1f}%")

    result["score"] = round(score, 1)
    result["details"] = ", ".join(details_parts)
    result["indicators"] = {
        "sma5": round(float(latest_sma5), 2),
        "sma20": round(float(latest_sma20), 2),
        "sma50": round(float(latest_sma50), 2),
        "rsi": round(float(latest_rsi), 1),
        "macd_bullish": macd_bullish,
        "macd_histogram": round(float(macd_hist.iloc[-1]), 4) if not np.isnan(macd_hist.iloc[-1]) else 0,
        "bollinger_position": round(float(bb_position), 3),
        "roc_10d": round(float(latest_roc), 2),
        "volatility_10d": round(float(vol_10), 4),
        "volatility_20d": round(float(vol_20), 4),
    }
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 2. PHYSICAL MARKET SIGNALS
# ═══════════════════════════════════════════════════════════════════════════════

def compute_physical_signals(
    inventory: pd.DataFrame,
    delivery: pd.DataFrame,
    oi: pd.DataFrame,
    pp: pd.DataFrame,
    metal_config: dict,
) -> dict:
    """Compute physical market stress signals: inventory drawdown,
    delivery acceleration, squeeze score, coverage erosion, eligible flow."""
    result = {
        "score": 50,
        "details": "Insufficient physical data",
        "signals": {},
    }

    signals = {}
    score_components = []

    # ── Inventory Drawdown Signal ────────────────────────────────────────
    if not inventory.empty and "registered" in inventory.columns and len(inventory) >= 10:
        reg = inventory["registered"].dropna()
        if len(reg) >= 10:
            # 5-day change
            change_5d = reg.diff(5)
            # Z-score vs 60-day distribution
            roll_mean = change_5d.rolling(min(60, len(change_5d))).mean()
            roll_std = change_5d.rolling(min(60, len(change_5d))).std()

            latest_change = change_5d.iloc[-1] if not np.isnan(change_5d.iloc[-1]) else 0
            latest_mean = roll_mean.iloc[-1] if not np.isnan(roll_mean.iloc[-1]) else 0
            latest_std = roll_std.iloc[-1] if not np.isnan(roll_std.iloc[-1]) else 1

            z_inv = (latest_change - latest_mean) / latest_std if latest_std > 0 else 0
            z_inv = max(-5.0, min(5.0, z_inv))  # Clamp to avoid extremes

            # Negative z = drawdown = bullish for price
            inv_score = 50 + (-z_inv * 15)  # z of -2 -> score 80 (bullish)
            inv_score = max(0, min(100, inv_score))

            signals["inventory_drawdown"] = {
                "z_score": round(float(z_inv), 2),
                "change_5d": round(float(latest_change), 2),
                "interpretation": "Rapid drawdown" if z_inv < -1.5 else (
                    "Building" if z_inv > 1.5 else "Normal"
                ),
            }
            score_components.append(inv_score)

    # ── Delivery Acceleration Signal ─────────────────────────────────────
    if not delivery.empty and "daily_issued" in delivery.columns and len(delivery) >= 5:
        issued = delivery["daily_issued"].dropna()
        if len(issued) >= 5:
            avg_20 = issued.rolling(min(20, len(issued))).mean()
            latest_issued = issued.iloc[-1]
            latest_avg = avg_20.iloc[-1] if not np.isnan(avg_20.iloc[-1]) else 1

            if latest_avg > 0:
                accel_ratio = latest_issued / latest_avg
            else:
                accel_ratio = 1.0

            # High delivery acceleration = bullish for price (demand)
            del_score = 50 + (accel_ratio - 1.0) * 30
            del_score = max(0, min(100, del_score))

            signals["delivery_acceleration"] = {
                "current_daily": int(latest_issued),
                "avg_20d": round(float(latest_avg), 1),
                "acceleration_ratio": round(float(accel_ratio), 2),
                "interpretation": "Surging" if accel_ratio > 1.5 else (
                    "Elevated" if accel_ratio > 1.2 else (
                        "Below average" if accel_ratio < 0.7 else "Normal"
                    )
                ),
            }
            score_components.append(del_score)

    # ── Paper/Physical Squeeze Score ─────────────────────────────────────
    if not pp.empty and "pp_ratio" in pp.columns and len(pp) >= 5:
        ppr = pp["pp_ratio"].dropna()
        if len(ppr) >= 5:
            latest_pp = ppr.iloc[-1]
            pp_5d_ago = ppr.iloc[-5] if len(ppr) >= 5 else ppr.iloc[0]
            pp_roc = ((latest_pp - pp_5d_ago) / pp_5d_ago * 100) if pp_5d_ago > 0 else 0

            # Higher ratio AND rising = more squeeze pressure = bullish
            level_score = min(100, latest_pp * 8)  # 10:1 -> 80
            trend_score = 50 + pp_roc * 5  # +2% -> 60
            squeeze_score = level_score * 0.6 + max(0, min(100, trend_score)) * 0.4

            signals["pp_squeeze"] = {
                "current_ratio": round(float(latest_pp), 2),
                "roc_5d_pct": round(float(pp_roc), 2),
                "squeeze_score": round(float(squeeze_score), 1),
                "interpretation": "Extreme" if latest_pp > 10 else (
                    "Elevated" if latest_pp > 5 else (
                        "Moderate" if latest_pp > 2 else "Low"
                    )
                ),
            }
            score_components.append(squeeze_score)

    # ── Coverage Erosion Rate ────────────────────────────────────────────
    if (not inventory.empty and not delivery.empty
            and "registered" in inventory.columns and "daily_issued" in delivery.columns):
        reg = inventory["registered"].dropna()
        issued = delivery["daily_issued"].dropna()
        if len(reg) >= 2 and len(issued) >= 5:
            latest_reg = reg.iloc[-1]
            avg_daily = issued.rolling(min(20, len(issued))).mean().iloc[-1]
            contract_size = metal_config["contract_size"]

            if avg_daily > 0 and latest_reg > 0:
                # For copper: registered is in short tons, contract_size is lbs
                # The conversion factor depends on the metal
                coverage_days = latest_reg / (avg_daily * contract_size) if contract_size > 0 else 999

                # Lower coverage days = bullish for price (supply stress)
                cov_score = max(0, min(100, 100 - coverage_days * 0.5))

                signals["coverage_erosion"] = {
                    "coverage_days": round(float(coverage_days), 1),
                    "avg_daily_delivery": round(float(avg_daily), 1),
                    "interpretation": "Critical" if coverage_days < 30 else (
                        "Tight" if coverage_days < 90 else (
                            "Adequate" if coverage_days < 365 else "Comfortable"
                        )
                    ),
                }
                score_components.append(cov_score)

    # ── Eligible-to-Registered Flow ──────────────────────────────────────
    if not inventory.empty and "eligible" in inventory.columns and "registered" in inventory.columns:
        reg = inventory["registered"].dropna()
        elig = inventory["eligible"].dropna()
        if len(reg) >= 5 and len(elig) >= 5:
            reg_change = reg.diff(5).iloc[-1] if len(reg) >= 6 else 0
            elig_change = elig.diff(5).iloc[-1] if len(elig) >= 6 else 0

            if not np.isnan(reg_change) and not np.isnan(elig_change):
                # If registered is rising and eligible falling, metal is being
                # moved to "available for delivery" = potential supply stress
                if reg_change > 0 and elig_change < 0:
                    flow_signal = "Eligible → Registered (delivery intent)"
                    flow_score = 65
                elif reg_change < 0:
                    flow_signal = "Registered declining (drawdown)"
                    flow_score = 70  # bullish for price
                else:
                    flow_signal = "Stable"
                    flow_score = 50

                signals["eligible_flow"] = {
                    "registered_change_5d": round(float(reg_change), 2),
                    "eligible_change_5d": round(float(elig_change), 2),
                    "interpretation": flow_signal,
                }
                score_components.append(flow_score)

    # ── Aggregate physical score ─────────────────────────────────────────
    if score_components:
        result["score"] = round(sum(score_components) / len(score_components), 1)
    result["signals"] = signals

    # Build details string
    parts = []
    if "inventory_drawdown" in signals:
        z = signals["inventory_drawdown"]["z_score"]
        parts.append(f"Inventory z={z}")
    if "delivery_acceleration" in signals:
        r = signals["delivery_acceleration"]["acceleration_ratio"]
        parts.append(f"Delivery accel {r:.1f}x")
    if "pp_squeeze" in signals:
        pp_val = signals["pp_squeeze"]["current_ratio"]
        parts.append(f"P/P {pp_val:.1f}:1")
    if "coverage_erosion" in signals:
        cd = signals["coverage_erosion"]["coverage_days"]
        parts.append(f"Coverage {cd:.0f}d")
    result["details"] = ", ".join(parts) if parts else "No physical signals"

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ARIMA FORECASTING
# ═══════════════════════════════════════════════════════════════════════════════

def run_arima_forecast(prices: pd.DataFrame, horizons: list = None) -> dict:
    """Fit auto-ARIMA and produce point forecasts with confidence intervals."""
    if horizons is None:
        horizons = [5, 20]

    result = {
        "score": 50,
        "details": "Insufficient data for ARIMA",
        "forecasts": {},
    }

    if prices.empty or "settle" not in prices.columns:
        return result

    s = prices["settle"].dropna()
    if len(s) < 30:
        return result

    current_price = float(s.iloc[-1])

    try:
        import pmdarima as pm

        # Use log returns for stationarity
        log_prices = np.log(s.values.astype(float))

        model = pm.auto_arima(
            log_prices,
            start_p=0, max_p=3,
            start_q=0, max_q=3,
            d=None,  # auto-detect differencing
            max_d=2,
            seasonal=False,
            stepwise=True,
            suppress_warnings=True,
            error_action="ignore",
            trace=False,
            n_fits=30,
        )

        model_order = model.order

        for h in horizons:
            fc, conf_int = model.predict(n_periods=h, return_conf_int=True, alpha=0.20)
            # Convert back from log scale
            point = float(np.exp(fc[-1]))
            low = float(np.exp(conf_int[-1, 0]))
            high = float(np.exp(conf_int[-1, 1]))

            result["forecasts"][f"{h}d"] = {
                "low": round(low, 2),
                "mid": round(point, 2),
                "high": round(high, 2),
                "pct_change": round((point - current_price) / current_price * 100, 2),
            }

        # Score based on 5-day forecast direction
        if "5d" in result["forecasts"]:
            fc_5d = result["forecasts"]["5d"]
            pct = fc_5d["pct_change"]
            # Map projected return to score: +2% -> 70, -2% -> 30
            arima_score = 50 + pct * 10
            result["score"] = round(max(0, min(100, arima_score)), 1)

        result["details"] = f"ARIMA{model_order} projects {result['forecasts'].get('5d', {}).get('pct_change', 0):+.1f}% over 5d"

    except Exception as e:
        result["details"] = f"ARIMA fitting failed: {str(e)[:60]}"

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 4. MARKET ACTIVITY SIGNALS
# ═══════════════════════════════════════════════════════════════════════════════

def compute_market_activity(prices: pd.DataFrame, oi: pd.DataFrame) -> dict:
    """Analyze OI expansion, volume trends, speculative pressure."""
    result = {
        "score": 50,
        "details": "Insufficient market data",
        "metrics": {},
    }

    scores = []

    # ── OI trend ─────────────────────────────────────────────────────────
    oi_series = None
    if not prices.empty and "open_interest" in prices.columns:
        oi_series = prices["open_interest"].dropna()
    elif not oi.empty and "open_interest" in oi.columns:
        oi_series = oi["open_interest"].dropna()

    if oi_series is not None and len(oi_series) >= 10:
        oi_latest = oi_series.iloc[-1]
        oi_10d_ago = oi_series.iloc[-10] if len(oi_series) >= 10 else oi_series.iloc[0]
        oi_pct = ((oi_latest - oi_10d_ago) / oi_10d_ago * 100) if oi_10d_ago > 0 else 0

        # Rising OI = new money = directional (bullish if price rising too)
        oi_score = 50 + oi_pct * 2
        oi_score = max(0, min(100, oi_score))
        scores.append(oi_score)

        result["metrics"]["oi_10d_change_pct"] = round(float(oi_pct), 2)

    # ── Volume trend ─────────────────────────────────────────────────────
    vol_series = None
    if not prices.empty and "volume" in prices.columns:
        vol_series = prices["volume"].dropna()
    elif not oi.empty and "total_volume" in oi.columns:
        vol_series = oi["total_volume"].dropna()

    if vol_series is not None and len(vol_series) >= 10:
        avg_5 = vol_series.rolling(5).mean().iloc[-1]
        avg_20 = vol_series.rolling(min(20, len(vol_series))).mean().iloc[-1]

        if not np.isnan(avg_5) and not np.isnan(avg_20) and avg_20 > 0:
            vol_ratio = avg_5 / avg_20
            # High recent volume = confirming trend
            vol_score = 50 + (vol_ratio - 1.0) * 30
            vol_score = max(0, min(100, vol_score))
            scores.append(vol_score)

            result["metrics"]["volume_5d_avg"] = round(float(avg_5), 0)
            result["metrics"]["volume_20d_avg"] = round(float(avg_20), 0)
            result["metrics"]["volume_ratio"] = round(float(vol_ratio), 2)

    if scores:
        result["score"] = round(sum(scores) / len(scores), 1)

    parts = []
    if "oi_10d_change_pct" in result["metrics"]:
        pct = result["metrics"]["oi_10d_change_pct"]
        direction = "expanding" if pct > 0 else "contracting"
        parts.append(f"OI {direction} {abs(pct):.1f}%")
    if "volume_ratio" in result["metrics"]:
        vr = result["metrics"]["volume_ratio"]
        if vr > 1.2:
            parts.append("volume elevated")
        elif vr < 0.8:
            parts.append("volume light")
        else:
            parts.append("volume normal")
    result["details"] = ", ".join(parts) if parts else "No market data"

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 5. CORRELATION AND CAUSALITY
# ═══════════════════════════════════════════════════════════════════════════════

def run_correlation_analysis(prices: pd.DataFrame, data: dict) -> dict:
    """Compute Pearson/Spearman correlations and Granger causality tests
    between physical indicators and future price returns."""
    correlations = {}

    if prices.empty or "settle" not in prices.columns:
        return correlations

    s = prices["settle"].dropna()
    if len(s) < 30:
        return correlations

    # Forward returns at various horizons
    returns_5d = s.pct_change(5).shift(-5)  # 5-day forward return
    returns_10d = s.pct_change(10).shift(-10)

    inventory = data.get("inventory", pd.DataFrame())
    delivery = data.get("delivery", pd.DataFrame())

    # ── Inventory change vs future returns ───────────────────────────────
    if not inventory.empty and "registered" in inventory.columns:
        inv_change = inventory["registered"].pct_change(5)
        # Align on shared dates
        combined = pd.DataFrame({
            "inv_change": inv_change,
            "fwd_return_5d": returns_5d,
        }).dropna()

        if len(combined) >= 20:
            r_pearson, p_pearson = scipy_stats.pearsonr(
                combined["inv_change"], combined["fwd_return_5d"]
            )
            r_spearman, p_spearman = scipy_stats.spearmanr(
                combined["inv_change"], combined["fwd_return_5d"]
            )
            correlations["inventory_change_vs_5d_return"] = {
                "pearson": round(float(r_pearson), 4),
                "pearson_pvalue": round(float(p_pearson), 4),
                "spearman": round(float(r_spearman), 4),
                "spearman_pvalue": round(float(p_spearman), 4),
                "n_observations": len(combined),
            }

    # ── Delivery rate vs future returns ──────────────────────────────────
    if not delivery.empty and "daily_issued" in delivery.columns:
        del_rate = delivery["daily_issued"].rolling(5).mean()
        combined = pd.DataFrame({
            "delivery_rate": del_rate,
            "fwd_return_5d": returns_5d,
        }).dropna()

        if len(combined) >= 20:
            r_pearson, p_pearson = scipy_stats.pearsonr(
                combined["delivery_rate"], combined["fwd_return_5d"]
            )
            correlations["delivery_rate_vs_5d_return"] = {
                "pearson": round(float(r_pearson), 4),
                "pearson_pvalue": round(float(p_pearson), 4),
                "n_observations": len(combined),
            }

    # ── OI change vs future returns ──────────────────────────────────────
    if "open_interest" in prices.columns:
        oi_change = prices["open_interest"].pct_change(5)
        combined = pd.DataFrame({
            "oi_change": oi_change,
            "fwd_return_10d": returns_10d,
        }).dropna()

        if len(combined) >= 20:
            r_pearson, p_pearson = scipy_stats.pearsonr(
                combined["oi_change"], combined["fwd_return_10d"]
            )
            correlations["oi_change_vs_10d_return"] = {
                "pearson": round(float(r_pearson), 4),
                "pearson_pvalue": round(float(p_pearson), 4),
                "n_observations": len(combined),
            }

    # ── Granger causality: inventory -> price ────────────────────────────
    try:
        from statsmodels.tsa.stattools import grangercausalitytests

        if not inventory.empty and "registered" in inventory.columns:
            inv_ret = inventory["registered"].pct_change().dropna()
            price_ret = s.pct_change().dropna()

            combined = pd.DataFrame({
                "price_return": price_ret,
                "inv_return": inv_ret,
            }).dropna()

            if len(combined) >= 30:
                # Test if inventory changes Granger-cause price changes
                gc_result = grangercausalitytests(
                    combined[["price_return", "inv_return"]].values,
                    maxlag=5, verbose=False
                )
                # Extract p-values for lag 1 and lag 5
                p_lag1 = gc_result[1][0]["ssr_ftest"][1]
                best_lag = min(5, len(combined) // 10)
                if best_lag >= 1:
                    p_best = gc_result[best_lag][0]["ssr_ftest"][1]
                else:
                    p_best = p_lag1

                correlations["granger_inventory_causes_price"] = {
                    "p_value_lag1": round(float(p_lag1), 4),
                    "p_value_best_lag": round(float(p_best), 4),
                    "best_lag": best_lag,
                    "significant": p_best < 0.05,
                }
    except Exception:
        pass  # Granger test can fail with insufficient data

    return correlations


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ANOMALY DETECTION & REGIME DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def detect_anomalies(data: dict) -> list:
    """Flag z-score anomalies across all metrics."""
    anomalies = []

    series_checks = []

    # Inventory changes
    inv = data.get("inventory", pd.DataFrame())
    if not inv.empty and "registered" in inv.columns:
        series_checks.append(("registered_inventory_change", inv["registered"].diff()))

    # Delivery
    deliv = data.get("delivery", pd.DataFrame())
    if not deliv.empty and "daily_issued" in deliv.columns:
        series_checks.append(("daily_deliveries", deliv["daily_issued"]))

    # Volume
    prices = data.get("prices", pd.DataFrame())
    if not prices.empty and "volume" in prices.columns:
        series_checks.append(("trading_volume", prices["volume"]))

    # OI change
    if not prices.empty and "oi_change" in prices.columns:
        series_checks.append(("oi_change", prices["oi_change"]))

    for name, series in series_checks:
        s = series.dropna()
        if len(s) < 20:
            continue
        roll_mean = s.rolling(30, min_periods=10).mean()
        roll_std = s.rolling(30, min_periods=10).std()
        latest_val = s.iloc[-1]
        mean_val = roll_mean.iloc[-1]
        std_val = roll_std.iloc[-1]

        if std_val > 0 and not np.isnan(mean_val):
            z = (latest_val - mean_val) / std_val
            z = max(-10.0, min(10.0, z))  # Clamp to reasonable range
            if abs(z) > 2.0:
                direction = "above" if z > 0 else "below"
                anomalies.append({
                    "metric": name,
                    "z_score": round(float(z), 2),
                    "description": f"Unusually {'high' if z > 0 else 'low'} {name.replace('_', ' ')} ({direction} normal by {abs(z):.1f} std dev)",
                })

    return anomalies


def detect_regime(prices: pd.DataFrame) -> str:
    """Classify market regime based on volatility structure."""
    if prices.empty or "settle" not in prices.columns:
        return "UNKNOWN"

    s = prices["settle"].dropna()
    if len(s) < 30:
        return "UNKNOWN"

    returns = s.pct_change().dropna()
    if len(returns) < 20:
        return "UNKNOWN"

    vol_short = returns.rolling(5).std().iloc[-1]
    vol_long = returns.rolling(20).std().iloc[-1]

    if np.isnan(vol_short) or np.isnan(vol_long) or vol_long == 0:
        return "UNKNOWN"

    vol_ratio = vol_short / vol_long

    # ADX-like trend strength: absolute returns vs volatility
    abs_return_20 = abs(float(s.iloc[-1] / s.iloc[-20] - 1)) if len(s) >= 20 else 0
    # Annualized vol
    ann_vol = float(vol_long) * np.sqrt(252)

    if vol_ratio > 1.5:
        return "VOLATILE"
    elif abs_return_20 > ann_vol * 0.3:
        return "TRENDING"
    else:
        return "RANGING"


# ═══════════════════════════════════════════════════════════════════════════════
# 7. COMPOSITE FORECAST
# ═══════════════════════════════════════════════════════════════════════════════

def composite_forecast(
    trend: dict,
    physical: dict,
    arima: dict,
    market: dict,
) -> dict:
    """Combine all signal categories into a single directional forecast."""
    # Weights as defined in the plan
    weights = {
        "trend_momentum": 0.30,
        "physical_stress": 0.35,
        "arima_model": 0.20,
        "market_activity": 0.15,
    }

    scores = {
        "trend_momentum": trend.get("score", 50),
        "physical_stress": physical.get("score", 50),
        "arima_model": arima.get("score", 50),
        "market_activity": market.get("score", 50),
    }

    # Weighted composite
    composite = sum(scores[k] * weights[k] for k in weights)
    composite = round(max(0, min(100, composite)), 1)

    # Direction
    if composite >= 60:
        direction = "BULLISH"
    elif composite <= 40:
        direction = "BEARISH"
    else:
        direction = "NEUTRAL"

    # Confidence: based on signal agreement
    score_values = list(scores.values())
    mean_score = np.mean(score_values)
    std_score = np.std(score_values)

    # High agreement (low std) + strong signal (far from 50) = high confidence
    signal_strength = abs(mean_score - 50) / 50  # 0-1
    agreement = max(0, 1.0 - std_score / 25)  # 0-1 (lower std = more agreement)
    confidence = round((signal_strength * 0.6 + agreement * 0.4) * 100, 0)
    confidence = max(10, min(95, confidence))

    # Squeeze probability from physical signals
    pp_squeeze = physical.get("signals", {}).get("pp_squeeze", {})
    squeeze_prob = round(pp_squeeze.get("squeeze_score", 30), 0) if pp_squeeze else 30

    # Key drivers: top factors by deviation from neutral (50)
    deviations = [(k, abs(v - 50), v) for k, v in scores.items()]
    deviations.sort(key=lambda x: x[1], reverse=True)

    key_drivers = []
    driver_details = {
        "trend_momentum": trend.get("details", ""),
        "physical_stress": physical.get("details", ""),
        "arima_model": arima.get("details", ""),
        "market_activity": market.get("details", ""),
    }

    for name, _, score in deviations[:3]:
        detail = driver_details.get(name, "")
        label = name.replace("_", " ").title()
        bull_bear = "bullish" if score > 50 else "bearish" if score < 50 else "neutral"
        key_drivers.append(f"{label}: {bull_bear} ({detail})")

    return {
        "direction": direction,
        "composite_score": composite,
        "confidence": int(confidence),
        "squeeze_probability": int(squeeze_prob),
        "key_drivers": key_drivers,
        "signals": {
            k: {"score": round(scores[k], 1), "details": driver_details[k]}
            for k in scores
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def run_forecast_for_metal(metal: str) -> dict:
    """Run the full forecast pipeline for a single metal."""
    print(f"  Fetching data for {metal}...")
    data = fetch_all_data(metal, days=365)

    prices = data["prices"]
    current_price = 0.0
    if not prices.empty and "settle" in prices.columns:
        s = prices["settle"].dropna()
        if len(s) > 0:
            current_price = float(s.iloc[-1])

    print(f"    Price history: {len(prices)} days, current: ${current_price:,.2f}")

    # 1. Trend signals
    print(f"    Computing trend signals...")
    trend = compute_trend_signals(prices)

    # 2. Physical market signals
    print(f"    Computing physical market signals...")
    physical = compute_physical_signals(
        data["inventory"], data["delivery"], data["oi"], data["pp"],
        METALS[metal],
    )

    # 3. ARIMA forecast
    print(f"    Running ARIMA forecast...")
    arima = run_arima_forecast(prices)

    # 4. Market activity
    print(f"    Analyzing market activity...")
    market = compute_market_activity(prices, data["oi"])

    # 5. Correlations
    print(f"    Running correlation analysis...")
    correlations = run_correlation_analysis(prices, data)

    # 6. Anomaly detection
    print(f"    Detecting anomalies...")
    anomalies = detect_anomalies(data)

    # 7. Regime detection
    regime = detect_regime(prices)

    # 8. Composite forecast
    print(f"    Building composite forecast...")
    forecast = composite_forecast(trend, physical, arima, market)

    # Assemble final output
    result = {
        "direction": forecast["direction"],
        "confidence": forecast["confidence"],
        "composite_score": forecast["composite_score"],
        "current_price": round(current_price, 2),
        "forecast_5d": arima.get("forecasts", {}).get("5d", None),
        "forecast_20d": arima.get("forecasts", {}).get("20d", None),
        "squeeze_probability": forecast["squeeze_probability"],
        "regime": regime,
        "signals": forecast["signals"],
        "key_drivers": forecast["key_drivers"],
        "anomalies": anomalies,
        "correlations": correlations,
        "trend_indicators": trend.get("indicators", {}),
        "physical_signals": physical.get("signals", {}),
        "market_metrics": market.get("metrics", {}),
    }

    print(f"    => {metal}: {forecast['direction']} (confidence: {forecast['confidence']}%, "
          f"composite: {forecast['composite_score']})")

    return result


def _py(val):
    """Convert numpy types to Python native for psycopg2."""
    if val is None:
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, np.ndarray):
        return val.tolist()
    if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
        return None
    return val


def update_forecast_history(output: dict, json_default):
    """Write forecast snapshots to DB, evaluate past accuracy, track prices."""
    today = datetime.now().strftime("%Y-%m-%d")
    conn = get_db_connection()

    try:
        cur = conn.cursor()

        # ── 1. Create tables if they don't exist ─────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS forecast_snapshots (
                id SERIAL PRIMARY KEY,
                metal VARCHAR(50) NOT NULL,
                forecast_date DATE NOT NULL,
                direction VARCHAR(20) NOT NULL,
                confidence INTEGER NOT NULL DEFAULT 0,
                composite_score DECIMAL(6, 2) NOT NULL DEFAULT 50,
                price_at_forecast DECIMAL(15, 4) NOT NULL DEFAULT 0,
                squeeze_probability INTEGER NOT NULL DEFAULT 0,
                regime VARCHAR(20) DEFAULT 'UNKNOWN',
                trend_score DECIMAL(6, 2) DEFAULT 50,
                physical_score DECIMAL(6, 2) DEFAULT 50,
                arima_score DECIMAL(6, 2) DEFAULT 50,
                market_score DECIMAL(6, 2) DEFAULT 50,
                forecast_5d_low DECIMAL(15, 4),
                forecast_5d_mid DECIMAL(15, 4),
                forecast_5d_high DECIMAL(15, 4),
                forecast_20d_low DECIMAL(15, 4),
                forecast_20d_mid DECIMAL(15, 4),
                forecast_20d_high DECIMAL(15, 4),
                key_drivers TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(metal, forecast_date)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS forecast_accuracy (
                id SERIAL PRIMARY KEY,
                forecast_snapshot_id INTEGER REFERENCES forecast_snapshots(id) ON DELETE CASCADE,
                metal VARCHAR(50) NOT NULL,
                forecast_date DATE NOT NULL,
                direction VARCHAR(20) NOT NULL,
                price_at_forecast DECIMAL(15, 4) NOT NULL,
                eval_date DATE NOT NULL,
                eval_horizon_days INTEGER NOT NULL,
                price_at_eval DECIMAL(15, 4) NOT NULL,
                price_change DECIMAL(15, 4) NOT NULL DEFAULT 0,
                price_change_pct DECIMAL(10, 4) NOT NULL DEFAULT 0,
                correct BOOLEAN NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(metal, forecast_date, eval_horizon_days)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS forecast_price_tracking (
                id SERIAL PRIMARY KEY,
                metal VARCHAR(50) NOT NULL,
                forecast_date DATE NOT NULL,
                tracking_date DATE NOT NULL,
                days_since_forecast INTEGER NOT NULL,
                price_at_forecast DECIMAL(15, 4) NOT NULL,
                live_price DECIMAL(15, 4) NOT NULL,
                price_change DECIMAL(15, 4) NOT NULL DEFAULT 0,
                price_change_pct DECIMAL(10, 4) NOT NULL DEFAULT 0,
                direction_at_forecast VARCHAR(20) NOT NULL,
                is_tracking BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(metal, forecast_date, tracking_date)
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_metal_date ON forecast_snapshots(metal, forecast_date DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_metal_date ON forecast_accuracy(metal, forecast_date DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_forecast_price_tracking_metal ON forecast_price_tracking(metal, forecast_date DESC, tracking_date DESC)")
        conn.commit()

        # ── 2. Insert today's forecast snapshots ─────────────────────────
        snapshot_ids = {}
        for metal, fc in output["metals"].items():
            signals = fc.get("signals", {})
            fc_5d = fc.get("forecast_5d")
            fc_20d = fc.get("forecast_20d")

            cur.execute("""
                INSERT INTO forecast_snapshots (
                    metal, forecast_date, direction, confidence, composite_score,
                    price_at_forecast, squeeze_probability, regime,
                    trend_score, physical_score, arima_score, market_score,
                    forecast_5d_low, forecast_5d_mid, forecast_5d_high,
                    forecast_20d_low, forecast_20d_mid, forecast_20d_high,
                    key_drivers
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s
                )
                ON CONFLICT (metal, forecast_date) DO UPDATE SET
                    direction = EXCLUDED.direction,
                    confidence = EXCLUDED.confidence,
                    composite_score = EXCLUDED.composite_score,
                    price_at_forecast = EXCLUDED.price_at_forecast,
                    squeeze_probability = EXCLUDED.squeeze_probability,
                    regime = EXCLUDED.regime,
                    trend_score = EXCLUDED.trend_score,
                    physical_score = EXCLUDED.physical_score,
                    arima_score = EXCLUDED.arima_score,
                    market_score = EXCLUDED.market_score,
                    forecast_5d_low = EXCLUDED.forecast_5d_low,
                    forecast_5d_mid = EXCLUDED.forecast_5d_mid,
                    forecast_5d_high = EXCLUDED.forecast_5d_high,
                    forecast_20d_low = EXCLUDED.forecast_20d_low,
                    forecast_20d_mid = EXCLUDED.forecast_20d_mid,
                    forecast_20d_high = EXCLUDED.forecast_20d_high,
                    key_drivers = EXCLUDED.key_drivers,
                    created_at = CURRENT_TIMESTAMP
                RETURNING id
            """, (
                metal, today,
                str(fc.get("direction", "NEUTRAL")),
                _py(fc.get("confidence", 0)),
                _py(fc.get("composite_score", 50)),
                _py(fc.get("current_price", 0)),
                _py(fc.get("squeeze_probability", 0)),
                str(fc.get("regime", "UNKNOWN")),
                _py(signals.get("trend_momentum", {}).get("score", 50)),
                _py(signals.get("physical_stress", {}).get("score", 50)),
                _py(signals.get("arima_model", {}).get("score", 50)),
                _py(signals.get("market_activity", {}).get("score", 50)),
                _py(fc_5d["low"]) if fc_5d else None,
                _py(fc_5d["mid"]) if fc_5d else None,
                _py(fc_5d["high"]) if fc_5d else None,
                _py(fc_20d["low"]) if fc_20d else None,
                _py(fc_20d["mid"]) if fc_20d else None,
                _py(fc_20d["high"]) if fc_20d else None,
                " | ".join(fc.get("key_drivers", [])),
            ))
            row = cur.fetchone()
            if row:
                snapshot_ids[metal] = row[0]

        conn.commit()
        print(f"\n  Wrote {len(snapshot_ids)} forecast snapshots to DB for {today}")

        # ── 3. Evaluate past forecasts (5-day horizon) ───────────────────
        eval_horizon = 5
        current_prices = {m: fc.get("current_price", 0)
                          for m, fc in output["metals"].items() if fc.get("current_price", 0) > 0}

        # Find past forecasts that are old enough to evaluate but haven't been yet
        cur.execute("""
            SELECT fs.id, fs.metal, fs.forecast_date, fs.direction, fs.price_at_forecast
            FROM forecast_snapshots fs
            LEFT JOIN forecast_accuracy fa
                ON fs.metal = fa.metal AND fs.forecast_date = fa.forecast_date AND fa.eval_horizon_days = %s
            WHERE fs.direction != 'NEUTRAL'
              AND fs.forecast_date <= CURRENT_DATE - %s
              AND fa.id IS NULL
            ORDER BY fs.forecast_date
        """, (eval_horizon, eval_horizon))
        unevaluated = cur.fetchall()

        evaluated_count = 0
        correct_count = 0
        for snap_id, metal, fdate, direction, price_then in unevaluated:
            price_now = current_prices.get(metal)
            if not price_now or float(price_then) <= 0:
                continue

            price_then_f = float(price_then)
            price_change = price_now - price_then_f
            price_change_pct = (price_change / price_then_f) * 100
            correct = (direction == "BULLISH" and price_change > 0) or \
                      (direction == "BEARISH" and price_change < 0)

            cur.execute("""
                INSERT INTO forecast_accuracy (
                    forecast_snapshot_id, metal, forecast_date, direction,
                    price_at_forecast, eval_date, eval_horizon_days,
                    price_at_eval, price_change, price_change_pct, correct
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (metal, forecast_date, eval_horizon_days) DO NOTHING
            """, (snap_id, metal, fdate, direction, price_then_f,
                  today, eval_horizon, price_now, price_change, price_change_pct, correct))
            evaluated_count += 1
            if correct:
                correct_count += 1

        conn.commit()

        if evaluated_count > 0:
            print(f"  Evaluated {evaluated_count} past forecasts: {correct_count} correct")
        else:
            print(f"  No past forecasts ready for evaluation yet (need {eval_horizon}+ days)")

        # ── 4. Record price tracking for all recent forecasts ────────────
        cur.execute("""
            SELECT metal, forecast_date, direction, price_at_forecast
            FROM forecast_snapshots
            WHERE forecast_date >= CURRENT_DATE - 30
              AND direction != 'NEUTRAL'
            ORDER BY forecast_date DESC
        """)
        recent_forecasts = cur.fetchall()

        tracking_count = 0
        for metal, fdate, direction, price_then in recent_forecasts:
            price_now = current_prices.get(metal)
            if not price_now or float(price_then) <= 0:
                continue

            price_then_f = float(price_then)
            days_since = (datetime.now().date() - fdate).days if hasattr(fdate, 'year') else 0
            price_change = price_now - price_then_f
            price_change_pct = (price_change / price_then_f) * 100
            is_tracking = (direction == "BULLISH" and price_change > 0) or \
                          (direction == "BEARISH" and price_change < 0)

            cur.execute("""
                INSERT INTO forecast_price_tracking (
                    metal, forecast_date, tracking_date, days_since_forecast,
                    price_at_forecast, live_price, price_change, price_change_pct,
                    direction_at_forecast, is_tracking
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (metal, forecast_date, tracking_date) DO UPDATE SET
                    live_price = EXCLUDED.live_price,
                    price_change = EXCLUDED.price_change,
                    price_change_pct = EXCLUDED.price_change_pct,
                    is_tracking = EXCLUDED.is_tracking,
                    created_at = CURRENT_TIMESTAMP
            """, (metal, fdate, today, days_since, price_then_f,
                  price_now, price_change, price_change_pct, direction, is_tracking))
            tracking_count += 1

        conn.commit()
        print(f"  Recorded {tracking_count} price tracking entries")

        # ── 5. Print accuracy summary from DB ────────────────────────────
        cur.execute("""
            SELECT metal, COUNT(*) as total,
                   SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_count
            FROM forecast_accuracy
            GROUP BY metal
            ORDER BY metal
        """)
        accuracy_rows = cur.fetchall()

        if accuracy_rows:
            print(f"\n  Accuracy summary:")
            total_all = 0
            correct_all = 0
            for metal, total, correct in accuracy_rows:
                hit = round(correct / total * 100) if total > 0 else 0
                print(f"    {metal:<12} {correct}/{total} correct ({hit}%)")
                total_all += total
                correct_all += correct
            if total_all > 0:
                print(f"    {'Overall':<12} {correct_all}/{total_all} correct ({round(correct_all/total_all*100)}%)")

        cur.close()
    except Exception as e:
        print(f"  ERROR writing forecast history to DB: {e}")
        conn.rollback()
    finally:
        conn.close()

    # Also write a local JSON backup for the accuracy API fallback
    _write_accuracy_json_backup(output)


def _write_accuracy_json_backup(output: dict):
    """Write a local JSON backup of forecast history for API fallback."""
    history_path = os.path.join(BASE_DIR, "forecast_history.json")
    today = datetime.now().strftime("%Y-%m-%d")

    history = {"forecasts": [], "accuracy": {}}
    if os.path.exists(history_path):
        try:
            with open(history_path) as f:
                history = json.load(f)
        except (json.JSONDecodeError, IOError):
            history = {"forecasts": [], "accuracy": {}}

    if "forecasts" not in history:
        history["forecasts"] = []

    existing_dates = {e["date"] for e in history["forecasts"]}
    if today not in existing_dates:
        entry = {"date": today, "generated_at": output["generated_at"], "calls": {}}
        for metal, fc in output["metals"].items():
            entry["calls"][metal] = {
                "direction": fc.get("direction", "NEUTRAL"),
                "confidence": fc.get("confidence", 0),
                "composite_score": fc.get("composite_score", 50),
                "price_at_forecast": fc.get("current_price", 0),
            }
        history["forecasts"].append(entry)

    # Keep last 90 days
    cutoff = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    history["forecasts"] = [e for e in history["forecasts"] if e["date"] >= cutoff]

    def jdefault(obj):
        if isinstance(obj, (np.integer,)): return int(obj)
        if isinstance(obj, (np.floating,)): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return str(obj)

    with open(history_path, "w") as f:
        json.dump(history, f, indent=2, default=jdefault)


def main():
    print("=" * 60)
    print("COMEX METALS PRICE FORECASTING ENGINE")
    print(f"Run time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    output = {
        "generated_at": datetime.now(tz=__import__('datetime').timezone.utc).isoformat(),
        "model_version": "1.0.0",
        "metals": {},
    }

    for metal in METALS:
        print(f"\n{'─' * 40}")
        print(f"Processing {metal}...")
        try:
            forecast = run_forecast_for_metal(metal)
            output["metals"][metal] = forecast
        except Exception as e:
            print(f"  ERROR forecasting {metal}: {e}")
            output["metals"][metal] = {
                "direction": "NEUTRAL",
                "confidence": 0,
                "composite_score": 50,
                "current_price": 0,
                "forecast_5d": None,
                "forecast_20d": None,
                "squeeze_probability": 0,
                "regime": "UNKNOWN",
                "signals": {},
                "key_drivers": [f"Forecast unavailable: {str(e)[:80]}"],
                "anomalies": [],
                "correlations": {},
                "trend_indicators": {},
                "physical_signals": {},
                "market_metrics": {},
                "error": str(e)[:200],
            }

    # ── Summary ──────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print("FORECAST SUMMARY")
    print("=" * 60)

    for metal, fc in output["metals"].items():
        direction = fc["direction"]
        confidence = fc["confidence"]
        price = fc["current_price"]
        squeeze = fc["squeeze_probability"]
        fc_5d = fc.get("forecast_5d")
        range_str = ""
        if fc_5d:
            range_str = f" | 5d range: ${fc_5d['low']:,.2f} - ${fc_5d['high']:,.2f}"
        print(f"  {metal:<12} {direction:<10} conf={confidence}%  "
              f"price=${price:>10,.2f}  squeeze={squeeze}%{range_str}")

    # ── Write output ─────────────────────────────────────────────────────
    output_path = os.path.join(BASE_DIR, "forecast.json")

    # JSON serialization helper
    def json_default(obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (pd.Timestamp, datetime)):
            return obj.isoformat()
        if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
            return None
        return str(obj)

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, default=json_default)

    print(f"\nForecast written to {output_path}")

    # ── Append to forecast history & evaluate accuracy ────────────────────
    update_forecast_history(output, json_default)
    print("Done.")


if __name__ == "__main__":
    main()
