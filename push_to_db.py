#!/usr/bin/env python3
"""
COMEX Metals Data → Neon PostgreSQL Push Script
Team 3: Database & Website Push Team

Reads parsed JSON data files and pushes all data to the Neon PostgreSQL database.
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import psycopg2
import psycopg2.extras

# ============================================
# CONFIGURATION
# ============================================

BASE_DIR = Path("/Users/kds/Desktop/metals/metalstats")
PUBLIC_DIR = BASE_DIR / "public"
ENV_FILE = BASE_DIR / "app" / ".env"

# Report date for this data push
REPORT_DATE = "2026-02-12"

# Metal → futures symbol mapping
METAL_SYMBOL_MAP = {
    "Gold": "GC",
    "Silver": "SI",
    "Copper": "HG",
    "Platinum": "PL",
    "Palladium": "PA",
    "Aluminum": "ALI",
}

# Contract sizes (for paper-physical calculations)
CONTRACT_SIZES = {
    "Gold": 100,       # troy oz
    "Silver": 5000,    # troy oz
    "Copper": 25000,   # lbs
    "Platinum": 50,    # troy oz
    "Palladium": 100,  # troy oz
    "Aluminum": 44000, # lbs
}

# ============================================
# HELPERS
# ============================================

def load_env(env_path: Path) -> dict:
    """Load .env file into a dict. Tries project root .env if app/.env missing."""
    env = {}
    for path in [Path(env_path), BASE_DIR / ".env"]:
        if path.exists():
            break
    else:
        path = Path(env_path)
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


def load_json(filename: str) -> dict:
    """Load a JSON file from the public directory."""
    path = PUBLIC_DIR / filename
    with open(path) as f:
        return json.load(f)


def get_connection(dsn: str, retries: int = 5, delay: float = 5.0):
    """Connect to Neon DB with retries for cold-start.
    Neon recommends 10+ second timeout for cold start; we use 60s and longer delays."""
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(dsn, connect_timeout=60)
            conn.autocommit = False
            return conn
        except psycopg2.OperationalError as e:
            print(f"  Connection attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                wait = delay * attempt
                print(f"  Waiting {wait}s before retry...")
                time.sleep(wait)
            else:
                raise


def parse_date(date_str: str) -> str:
    """Parse MM/DD/YYYY or return ISO date as-is."""
    if not date_str:
        return REPORT_DATE
    # Already ISO
    if len(date_str) == 10 and date_str[4] == "-":
        return date_str
    # MM/DD/YYYY
    parts = date_str.split("/")
    if len(parts) == 3:
        m, d, y = parts
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    return REPORT_DATE


# ============================================
# DDL: CREATE TABLES IF NOT EXISTS
# ============================================

DDL_STATEMENTS = [
    # 1. metal_snapshots
    """
    CREATE TABLE IF NOT EXISTS metal_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        activity_date DATE,
        registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
        eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
        total DECIMAL(20, 3) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
    )
    """,
    # 2. depository_snapshots
    """
    CREATE TABLE IF NOT EXISTS depository_snapshots (
        id SERIAL PRIMARY KEY,
        metal_snapshot_id INTEGER REFERENCES metal_snapshots(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
        eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
        total DECIMAL(20, 3) NOT NULL DEFAULT 0
    )
    """,
    # 3. open_interest_snapshots
    """
    CREATE TABLE IF NOT EXISTS open_interest_snapshots (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        report_date DATE NOT NULL,
        open_interest BIGINT NOT NULL DEFAULT 0,
        oi_change INTEGER NOT NULL DEFAULT 0,
        total_volume BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, report_date)
    )
    """,
    # 4. paper_physical_snapshots
    """
    CREATE TABLE IF NOT EXISTS paper_physical_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        futures_symbol VARCHAR(20) NOT NULL,
        open_interest BIGINT NOT NULL DEFAULT 0,
        open_interest_units DECIMAL(20, 3) NOT NULL DEFAULT 0,
        registered_inventory DECIMAL(20, 3) NOT NULL DEFAULT 0,
        paper_physical_ratio DECIMAL(10, 4) NOT NULL DEFAULT 0,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
    )
    """,
    # 5. risk_score_snapshots
    """
    CREATE TABLE IF NOT EXISTS risk_score_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        report_date DATE NOT NULL,
        composite_score INTEGER NOT NULL DEFAULT 0,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
        coverage_risk INTEGER NOT NULL DEFAULT 0,
        paper_physical_risk INTEGER NOT NULL DEFAULT 0,
        inventory_trend_risk INTEGER NOT NULL DEFAULT 0,
        delivery_velocity_risk INTEGER NOT NULL DEFAULT 0,
        market_activity_risk INTEGER NOT NULL DEFAULT 0,
        dominant_factor VARCHAR(100) NOT NULL DEFAULT '',
        commentary TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
    )
    """,
    # 6. delivery_snapshots
    """
    CREATE TABLE IF NOT EXISTS delivery_snapshots (
        id SERIAL PRIMARY KEY,
        metal VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        report_date DATE NOT NULL,
        contract_month VARCHAR(20) NOT NULL,
        settlement_price DECIMAL(15, 6) NOT NULL DEFAULT 0,
        daily_issued INTEGER NOT NULL DEFAULT 0,
        daily_stopped INTEGER NOT NULL DEFAULT 0,
        month_to_date INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(metal, report_date)
    )
    """,
    # 7. delivery_firm_snapshots
    """
    CREATE TABLE IF NOT EXISTS delivery_firm_snapshots (
        id SERIAL PRIMARY KEY,
        delivery_snapshot_id INTEGER REFERENCES delivery_snapshots(id) ON DELETE CASCADE,
        firm_code VARCHAR(10) NOT NULL,
        firm_org VARCHAR(5) NOT NULL,
        firm_name VARCHAR(255) NOT NULL,
        issued INTEGER NOT NULL DEFAULT 0,
        stopped INTEGER NOT NULL DEFAULT 0
    )
    """,
]

INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_metal_snapshots_metal_date ON metal_snapshots(metal, report_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_depository_snapshots_metal_id ON depository_snapshots(metal_snapshot_id)",
    "CREATE INDEX IF NOT EXISTS idx_oi_snapshots_symbol_date ON open_interest_snapshots(symbol, report_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_paper_physical_metal_date ON paper_physical_snapshots(metal, report_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_risk_score_metal_date ON risk_score_snapshots(metal, report_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_delivery_snapshots_metal_date ON delivery_snapshots(metal, report_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_delivery_firm_snapshots_delivery_id ON delivery_firm_snapshots(delivery_snapshot_id)",
]


def ensure_tables(conn):
    """Create all tables and indexes if they don't exist."""
    print("\n[1/7] ENSURING DATABASE TABLES EXIST...")
    cur = conn.cursor()
    for ddl in DDL_STATEMENTS:
        cur.execute(ddl)
    for idx in INDEX_STATEMENTS:
        cur.execute(idx)
    conn.commit()
    print("  ✓ All 7 tables and indexes verified/created.")


# ============================================
# PUSH FUNCTIONS
# ============================================

def push_warehouse_stocks(conn) -> dict:
    """Push warehouse stock data from data.json."""
    print("\n[2/7] PUSHING WAREHOUSE STOCK DATA (metal_snapshots + depository_snapshots)...")
    data = load_json("data.json")
    cur = conn.cursor()

    metals_pushed = 0
    depositories_pushed = 0
    skip_keys = {"_metadata", "Platinum_Palladium"}  # Skip combined/metadata entries

    for metal_name, metal_data in data.items():
        if metal_name in skip_keys:
            continue

        report_date = parse_date(metal_data.get("report_date", ""))
        activity_date = parse_date(metal_data.get("activity_date", ""))
        totals = metal_data.get("totals", {})
        registered = totals.get("registered", 0)
        eligible = totals.get("eligible", 0)
        total = totals.get("total", 0)

        # Upsert metal_snapshot
        cur.execute("""
            INSERT INTO metal_snapshots (metal, report_date, activity_date, registered, eligible, total)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (metal, report_date)
            DO UPDATE SET
                activity_date = EXCLUDED.activity_date,
                registered = EXCLUDED.registered,
                eligible = EXCLUDED.eligible,
                total = EXCLUDED.total,
                created_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (metal_name, report_date, activity_date, registered, eligible, total))
        snapshot_id = cur.fetchone()[0]
        metals_pushed += 1

        # Delete old depositories for this snapshot
        cur.execute("DELETE FROM depository_snapshots WHERE metal_snapshot_id = %s", (snapshot_id,))

        # Insert depositories
        for dep in metal_data.get("depositories", []):
            cur.execute("""
                INSERT INTO depository_snapshots (metal_snapshot_id, name, registered, eligible, total)
                VALUES (%s, %s, %s, %s, %s)
            """, (snapshot_id, dep["name"], dep["registered"], dep["eligible"], dep["total"]))
            depositories_pushed += 1

    conn.commit()
    print(f"  ✓ Upserted {metals_pushed} metals into metal_snapshots")
    print(f"  ✓ Inserted {depositories_pushed} depository records into depository_snapshots")
    return {"metal_snapshots": metals_pushed, "depository_snapshots": depositories_pushed}


def push_open_interest(conn) -> dict:
    """Push open interest data from volume_summary.json."""
    print("\n[3/7] PUSHING OPEN INTEREST DATA (open_interest_snapshots)...")
    data = load_json("volume_summary.json")
    cur = conn.cursor()

    records_pushed = 0
    report_date = data.get("parsed_date", REPORT_DATE)

    for product in data.get("products", []):
        symbol = product.get("symbol", "")
        open_interest = product.get("open_interest", 0)
        oi_change = product.get("oi_change", 0)
        total_volume = product.get("total_volume", 0)

        cur.execute("""
            INSERT INTO open_interest_snapshots (symbol, report_date, open_interest, oi_change, total_volume)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (symbol, report_date)
            DO UPDATE SET
                open_interest = EXCLUDED.open_interest,
                oi_change = EXCLUDED.oi_change,
                total_volume = EXCLUDED.total_volume,
                created_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (symbol, report_date, open_interest, oi_change, total_volume))
        records_pushed += 1

    conn.commit()
    print(f"  ✓ Upserted {records_pushed} symbols into open_interest_snapshots")
    return {"open_interest_snapshots": records_pushed}


def push_paper_physical(conn) -> dict:
    """Push paper-to-physical ratios from analysis.json."""
    print("\n[4/7] PUSHING PAPER-TO-PHYSICAL RATIOS (paper_physical_snapshots)...")
    analysis = load_json("analysis.json")
    cur = conn.cursor()

    market_structure = analysis.get("market_structure", {})
    records_pushed = 0

    for metal_name, ms_data in market_structure.items():
        if metal_name not in METAL_SYMBOL_MAP:
            continue

        symbol = ms_data.get("symbol", METAL_SYMBOL_MAP[metal_name])
        open_interest = ms_data.get("open_interest", 0)
        paper_claims = ms_data.get("paper_claims_physical", 0)
        registered_inv = ms_data.get("registered_inventory_converted", 0)
        ratio = ms_data.get("paper_to_physical_ratio", 0)

        # Determine risk level based on ratio
        if ratio >= 10:
            risk_level = "HIGH"
        elif ratio >= 5:
            risk_level = "ELEVATED"
        elif ratio >= 3:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        cur.execute("""
            INSERT INTO paper_physical_snapshots (
                metal, report_date, futures_symbol, open_interest,
                open_interest_units, registered_inventory, paper_physical_ratio, risk_level
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (metal, report_date)
            DO UPDATE SET
                futures_symbol = EXCLUDED.futures_symbol,
                open_interest = EXCLUDED.open_interest,
                open_interest_units = EXCLUDED.open_interest_units,
                registered_inventory = EXCLUDED.registered_inventory,
                paper_physical_ratio = EXCLUDED.paper_physical_ratio,
                risk_level = EXCLUDED.risk_level,
                created_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (metal_name, REPORT_DATE, symbol, open_interest,
              paper_claims, registered_inv, ratio, risk_level))
        records_pushed += 1

    conn.commit()
    print(f"  ✓ Upserted {records_pushed} metals into paper_physical_snapshots")
    return {"paper_physical_snapshots": records_pushed}


def push_risk_scores(conn) -> dict:
    """Push risk scores from analysis.json."""
    print("\n[5/7] PUSHING RISK SCORES (risk_score_snapshots)...")
    analysis = load_json("analysis.json")
    cur = conn.cursor()

    risk_data = analysis.get("risk_assessment", {}).get("per_metal", {})
    market_structure = analysis.get("market_structure", {})
    records_pushed = 0

    # Risk level → numeric score mapping
    risk_level_scores = {
        "LOW": 20,
        "MODERATE": 45,
        "ELEVATED": 65,
        "HIGH": 80,
        "CRITICAL": 95,
    }

    for metal_name, risk_info in risk_data.items():
        risk_level = risk_info.get("risk_level", "LOW")
        composite_score = risk_level_scores.get(risk_level, 30)

        # Calculate sub-scores from available data
        coverage_days = risk_info.get("coverage_days", 999)
        p2p_ratio = risk_info.get("paper_to_physical_ratio", 0)
        delivery_pct = risk_info.get("mtd_delivery_to_inventory_pct", 0)

        # Coverage risk: lower coverage → higher risk (0-100)
        if coverage_days < 20:
            coverage_risk = 90
        elif coverage_days < 50:
            coverage_risk = 60
        elif coverage_days < 100:
            coverage_risk = 35
        else:
            coverage_risk = 15

        # Paper/physical risk: higher ratio → higher risk (0-100)
        if p2p_ratio >= 10:
            paper_physical_risk = 85
        elif p2p_ratio >= 5:
            paper_physical_risk = 65
        elif p2p_ratio >= 3:
            paper_physical_risk = 40
        else:
            paper_physical_risk = 20

        # Delivery velocity risk: higher delivery pct → higher risk (0-100)
        if delivery_pct >= 30:
            delivery_velocity_risk = 90
        elif delivery_pct >= 20:
            delivery_velocity_risk = 70
        elif delivery_pct >= 10:
            delivery_velocity_risk = 50
        else:
            delivery_velocity_risk = 20

        # Inventory trend risk (placeholder since we only have one day)
        inventory_trend_risk = 30

        # Market activity risk from volume/OI ratio
        ms = market_structure.get(metal_name, {})
        vol_oi = ms.get("volume_to_oi_ratio", 0.3)
        if vol_oi >= 0.5:
            market_activity_risk = 60
        elif vol_oi >= 0.3:
            market_activity_risk = 40
        else:
            market_activity_risk = 25

        # Determine dominant factor
        risk_scores_map = {
            "coverage": coverage_risk,
            "paper_physical": paper_physical_risk,
            "delivery_velocity": delivery_velocity_risk,
            "inventory_trend": inventory_trend_risk,
            "market_activity": market_activity_risk,
        }
        dominant_factor = max(risk_scores_map, key=risk_scores_map.get)

        # Build commentary from risk factors
        risk_factors = risk_info.get("risk_factors", [])
        commentary = "; ".join(risk_factors) if risk_factors else f"{metal_name}: {risk_level} risk"

        cur.execute("""
            INSERT INTO risk_score_snapshots (
                metal, report_date, composite_score, risk_level,
                coverage_risk, paper_physical_risk, inventory_trend_risk,
                delivery_velocity_risk, market_activity_risk,
                dominant_factor, commentary
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (metal, report_date)
            DO UPDATE SET
                composite_score = EXCLUDED.composite_score,
                risk_level = EXCLUDED.risk_level,
                coverage_risk = EXCLUDED.coverage_risk,
                paper_physical_risk = EXCLUDED.paper_physical_risk,
                inventory_trend_risk = EXCLUDED.inventory_trend_risk,
                delivery_velocity_risk = EXCLUDED.delivery_velocity_risk,
                market_activity_risk = EXCLUDED.market_activity_risk,
                dominant_factor = EXCLUDED.dominant_factor,
                commentary = EXCLUDED.commentary,
                created_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (metal_name, REPORT_DATE, composite_score, risk_level,
              coverage_risk, paper_physical_risk, inventory_trend_risk,
              delivery_velocity_risk, market_activity_risk,
              dominant_factor, commentary))
        records_pushed += 1

    conn.commit()
    print(f"  ✓ Upserted {records_pushed} metals into risk_score_snapshots")
    return {"risk_score_snapshots": records_pushed}


def push_delivery_data(conn) -> dict:
    """Push delivery data from delivery_daily.json and delivery_ytd.json."""
    print("\n[6/7] PUSHING DELIVERY DATA (delivery_snapshots + delivery_firm_snapshots)...")
    daily_data = load_json("delivery_daily.json")
    ytd_data = load_json("delivery_ytd.json")
    cur = conn.cursor()

    delivery_count = 0
    firm_count = 0
    report_date = daily_data.get("parsed_date", REPORT_DATE)

    # Build a lookup for YTD firms per product symbol
    ytd_firms_by_symbol = {}
    for product in ytd_data.get("products", []):
        symbol = product.get("symbol", "")
        ytd_firms_by_symbol[symbol] = product.get("firms", [])

    for delivery in daily_data.get("deliveries", []):
        metal = delivery.get("metal", "")
        symbol = delivery.get("symbol", "")
        contract_month = delivery.get("contract_month", "")
        settlement = delivery.get("settlement", 0)
        daily_issued = delivery.get("daily_issued", 0)
        daily_stopped = delivery.get("daily_stopped", 0)
        month_to_date = delivery.get("month_to_date", 0)

        # Upsert delivery_snapshot
        cur.execute("""
            INSERT INTO delivery_snapshots (
                metal, symbol, report_date, contract_month, settlement_price,
                daily_issued, daily_stopped, month_to_date
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (metal, report_date)
            DO UPDATE SET
                symbol = EXCLUDED.symbol,
                contract_month = EXCLUDED.contract_month,
                settlement_price = EXCLUDED.settlement_price,
                daily_issued = EXCLUDED.daily_issued,
                daily_stopped = EXCLUDED.daily_stopped,
                month_to_date = EXCLUDED.month_to_date,
                created_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (metal, symbol, report_date, contract_month, settlement,
              daily_issued, daily_stopped, month_to_date))
        snapshot_id = cur.fetchone()[0]
        delivery_count += 1

        # Delete existing firm data for this snapshot
        cur.execute("DELETE FROM delivery_firm_snapshots WHERE delivery_snapshot_id = %s", (snapshot_id,))

        # Insert daily firms first
        daily_firms = delivery.get("firms", [])
        for firm in daily_firms:
            cur.execute("""
                INSERT INTO delivery_firm_snapshots (delivery_snapshot_id, firm_code, firm_org, firm_name, issued, stopped)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (snapshot_id, firm.get("code", ""), firm.get("org", ""),
                  firm.get("name", ""), firm.get("issued", 0), firm.get("stopped", 0)))
            firm_count += 1

    conn.commit()
    print(f"  ✓ Upserted {delivery_count} metals into delivery_snapshots")
    print(f"  ✓ Inserted {firm_count} firm records into delivery_firm_snapshots")
    return {"delivery_snapshots": delivery_count, "delivery_firm_snapshots": firm_count}


def verify_data(conn) -> dict:
    """Verify all data was pushed correctly."""
    print("\n[7/7] VERIFYING DATA...")
    cur = conn.cursor()
    counts = {}

    tables = [
        "metal_snapshots",
        "depository_snapshots",
        "open_interest_snapshots",
        "paper_physical_snapshots",
        "risk_score_snapshots",
        "delivery_snapshots",
        "delivery_firm_snapshots",
    ]

    print("\n  ╔══════════════════════════════════╦═══════════╗")
    print("  ║ Table                            ║ Row Count ║")
    print("  ╠══════════════════════════════════╬═══════════╣")
    for table in tables:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        counts[table] = count
        print(f"  ║ {table:<32} ║ {count:>9} ║")
    print("  ╚══════════════════════════════════╩═══════════╝")

    # Verification Query 1: Latest snapshot for each metal
    print("\n  --- Verification: Latest Metal Snapshots ---")
    cur.execute("""
        SELECT DISTINCT ON (metal)
            metal, report_date, registered, eligible, total
        FROM metal_snapshots
        ORDER BY metal, report_date DESC
    """)
    rows = cur.fetchall()
    print(f"  {'Metal':<12} {'Date':<12} {'Registered':>16} {'Eligible':>16} {'Total':>16}")
    print(f"  {'─'*12} {'─'*12} {'─'*16} {'─'*16} {'─'*16}")
    for row in rows:
        metal, rdate, reg, elig, tot = row
        print(f"  {metal:<12} {str(rdate):<12} {float(reg):>16,.2f} {float(elig):>16,.2f} {float(tot):>16,.2f}")

    # Verification Query 2: Paper-to-physical ratios
    print("\n  --- Verification: Paper-to-Physical Ratios ---")
    cur.execute("""
        SELECT DISTINCT ON (metal)
            metal, futures_symbol, open_interest, paper_physical_ratio, risk_level
        FROM paper_physical_snapshots
        ORDER BY metal, report_date DESC
    """)
    rows = cur.fetchall()
    print(f"  {'Metal':<12} {'Symbol':<8} {'Open Interest':>14} {'P/P Ratio':>10} {'Risk':>10}")
    print(f"  {'─'*12} {'─'*8} {'─'*14} {'─'*10} {'─'*10}")
    for row in rows:
        metal, sym, oi, ratio, risk = row
        print(f"  {metal:<12} {sym:<8} {int(oi):>14,} {float(ratio):>10.2f} {risk:>10}")

    # Verification Query 3: Risk scores
    print("\n  --- Verification: Risk Scores ---")
    cur.execute("""
        SELECT DISTINCT ON (metal)
            metal, composite_score, risk_level, dominant_factor, commentary
        FROM risk_score_snapshots
        ORDER BY metal, report_date DESC
    """)
    rows = cur.fetchall()
    print(f"  {'Metal':<12} {'Score':>6} {'Risk Level':<12} {'Dominant Factor':<20} {'Commentary'}")
    print(f"  {'─'*12} {'─'*6} {'─'*12} {'─'*20} {'─'*40}")
    for row in rows:
        metal, score, risk, factor, comment = row
        commentary_short = comment[:60] + "..." if len(comment) > 60 else comment
        print(f"  {metal:<12} {score:>6} {risk:<12} {factor:<20} {commentary_short}")

    # Verification Query 4: Delivery snapshots
    print("\n  --- Verification: Latest Delivery Data ---")
    cur.execute("""
        SELECT DISTINCT ON (metal)
            metal, symbol, contract_month, settlement_price, daily_issued, daily_stopped, month_to_date
        FROM delivery_snapshots
        ORDER BY metal, report_date DESC
    """)
    rows = cur.fetchall()
    print(f"  {'Metal':<12} {'Sym':<6} {'Month':<8} {'Price':>10} {'Issued':>8} {'Stopped':>8} {'MTD':>8}")
    print(f"  {'─'*12} {'─'*6} {'─'*8} {'─'*10} {'─'*8} {'─'*8} {'─'*8}")
    for row in rows:
        metal, sym, month, price, issued, stopped, mtd = row
        print(f"  {metal:<12} {sym:<6} {month:<8} {float(price):>10.2f} {issued:>8} {stopped:>8} {mtd:>8}")

    # Verification Query 5: Open interest
    print("\n  --- Verification: Open Interest Data ---")
    cur.execute("""
        SELECT DISTINCT ON (symbol)
            symbol, report_date, open_interest, oi_change, total_volume
        FROM open_interest_snapshots
        ORDER BY symbol, report_date DESC
    """)
    rows = cur.fetchall()
    print(f"  {'Symbol':<8} {'Date':<12} {'Open Interest':>14} {'OI Change':>10} {'Volume':>12}")
    print(f"  {'─'*8} {'─'*12} {'─'*14} {'─'*10} {'─'*12}")
    for row in rows:
        sym, rdate, oi, change, vol = row
        print(f"  {sym:<8} {str(rdate):<12} {int(oi):>14,} {int(change):>10,} {int(vol):>12,}")

    return counts


# ============================================
# MAIN
# ============================================

def main():
    print("=" * 70)
    print("  COMEX METALS DATA → NEON POSTGRESQL PUSH")
    print(f"  Report Date: {REPORT_DATE}")
    print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Load environment
    env = load_env(ENV_FILE)
    dsn_unpooled = env.get("DATABASE_URL_UNPOOLED", "")
    dsn_pooled = env.get("DATABASE_URL", "")
    dsn = dsn_unpooled or dsn_pooled
    if not dsn:
        print("ERROR: No DATABASE_URL found in .env file!")
        sys.exit(1)

    def add_neon_endpoint(url: str, is_pooled: bool = False) -> str:
        """Neon SNI workaround: explicit endpoint for libpq routing. Skip for pooled (pgbouncer doesn't support options)."""
        if not url or "neon.tech" not in url:
            return url
        if is_pooled or "pooler" in url:
            return url  # PgBouncer rejects unsupported options
        if "options=" in url:
            return url
        sep = "&" if "?" in url else "?"
        return url + f"{sep}options=endpoint%3Dep-flat-dew-ahfe5qxc"

    dsn_unpooled = add_neon_endpoint(env.get("DATABASE_URL_UNPOOLED", ""), is_pooled=False)
    dsn_pooled = add_neon_endpoint(env.get("DATABASE_URL", ""), is_pooled=True)
    dsn = dsn_unpooled or dsn_pooled

    conn_type = "unpooled" if dsn == dsn_unpooled else "pooled"
    print(f"\n  Database: Neon PostgreSQL ({conn_type} connection)")
    print(f"  Host: {dsn.split('@')[1].split('/')[0] if '@' in dsn else 'unknown'}")

    # Connect (try unpooled first, fall back to pooled)
    print("\n  Connecting to database...")
    try:
        conn = get_connection(dsn)
        print("  ✓ Connected successfully!")
    except Exception as e:
        if dsn == dsn_unpooled and dsn_pooled:
            print(f"  Unpooled connection failed, trying pooled...")
            dsn = dsn_pooled
            print(f"  Host: {dsn.split('@')[1].split('/')[0] if '@' in dsn else 'unknown'}")
            conn = get_connection(dsn)
            print("  ✓ Connected via pooled connection!")
        else:
            raise e

    results = {}
    errors = []

    try:
        # Step 1: Ensure tables
        ensure_tables(conn)

        # Step 2: Push warehouse stocks
        try:
            r = push_warehouse_stocks(conn)
            results.update(r)
        except Exception as e:
            errors.append(f"Warehouse stocks: {e}")
            print(f"  ✗ ERROR: {e}")
            conn.rollback()

        # Step 3: Push open interest
        try:
            r = push_open_interest(conn)
            results.update(r)
        except Exception as e:
            errors.append(f"Open interest: {e}")
            print(f"  ✗ ERROR: {e}")
            conn.rollback()

        # Step 4: Push paper-to-physical ratios
        try:
            r = push_paper_physical(conn)
            results.update(r)
        except Exception as e:
            errors.append(f"Paper/physical: {e}")
            print(f"  ✗ ERROR: {e}")
            conn.rollback()

        # Step 5: Push risk scores
        try:
            r = push_risk_scores(conn)
            results.update(r)
        except Exception as e:
            errors.append(f"Risk scores: {e}")
            print(f"  ✗ ERROR: {e}")
            conn.rollback()

        # Step 6: Push delivery data
        try:
            r = push_delivery_data(conn)
            results.update(r)
        except Exception as e:
            errors.append(f"Delivery data: {e}")
            print(f"  ✗ ERROR: {e}")
            conn.rollback()

        # Step 7: Verify all data
        counts = verify_data(conn)

    except Exception as e:
        errors.append(f"Fatal error: {e}")
        print(f"\n  FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("\n  Database connection closed.")

    # Final summary
    print("\n" + "=" * 70)
    print("  PUSH SUMMARY")
    print("=" * 70)
    print(f"\n  Records pushed this run:")
    for table, count in results.items():
        print(f"    • {table}: {count} records")

    if errors:
        print(f"\n  ERRORS ({len(errors)}):")
        for err in errors:
            print(f"    ✗ {err}")
    else:
        print(f"\n  ✓ ALL DATA PUSHED SUCCESSFULLY — NO ERRORS")

    print(f"\n  Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
