"""
Initialize Neon database schema for storing historical COMEX warehouse data.
Run this once to create the necessary tables.
"""

import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL or POSTGRES_URL not found in .env file")
    sys.exit(1)

def init_database():
    """Create the database schema for storing historical warehouse data."""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Create table for daily warehouse snapshots
        cur.execute("""
            CREATE TABLE IF NOT EXISTS warehouse_snapshots (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                metal VARCHAR(50) NOT NULL,
                report_date VARCHAR(50),
                activity_date VARCHAR(50),
                registered NUMERIC(20, 3) NOT NULL DEFAULT 0,
                eligible NUMERIC(20, 3) NOT NULL DEFAULT 0,
                total NUMERIC(20, 3) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, metal)
            );
        """)
        
        # Create index for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_date 
            ON warehouse_snapshots(date DESC);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_metal 
            ON warehouse_snapshots(metal);
        """)
        
        # Create table for daily bulletin snapshots (Section 62 - Metal Futures)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bulletin_snapshots (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                product_name VARCHAR(100),
                total_volume INTEGER NOT NULL DEFAULT 0,
                total_open_interest INTEGER NOT NULL DEFAULT 0,
                total_oi_change INTEGER NOT NULL DEFAULT 0,
                front_month VARCHAR(10),
                front_month_settle NUMERIC(12, 4),
                front_month_change NUMERIC(10, 4),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, symbol)
            );
        """)
        
        # Create indexes for bulletin table
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_bulletin_snapshots_date 
            ON bulletin_snapshots(date DESC);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_bulletin_snapshots_symbol 
            ON bulletin_snapshots(symbol);
        """)
        
        conn.commit()
        print("[OK] Database schema created successfully")
        print("     Tables: warehouse_snapshots, bulletin_snapshots")
        print("     Indexes: idx_warehouse_snapshots_date, idx_warehouse_snapshots_metal,")
        print("              idx_bulletin_snapshots_date, idx_bulletin_snapshots_symbol")
        
    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == '__main__':
    print("=" * 70)
    print("  Neon Database Schema Initialization")
    print("=" * 70)
    print()
    init_database()
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)
