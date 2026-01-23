"""
View database tables and data in Neon database.
"""

import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv
from tabulate import tabulate

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL or POSTGRES_URL not found in .env file")
    exit(1)

def view_tables():
    """List all tables in the database."""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # List all tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cur.fetchall()
        print("\n" + "=" * 70)
        print("  Database Tables")
        print("=" * 70)
        if tables:
            for table in tables:
                print(f"  • {table[0]}")
        else:
            print("  No tables found")
        
        cur.close()
    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
    finally:
        if conn:
            conn.close()

def view_warehouse_snapshots(limit=20):
    """View warehouse_snapshots table data."""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get table structure
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'warehouse_snapshots'
            ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        print("\n" + "=" * 70)
        print("  Table Structure: warehouse_snapshots")
        print("=" * 70)
        for col in columns:
            print(f"  • {col[0]}: {col[1]}")
        
        # Get data
        cur.execute(f"""
            SELECT date, metal, registered, eligible, total, report_date, activity_date
            FROM warehouse_snapshots
            ORDER BY date DESC, metal
            LIMIT {limit};
        """)
        
        rows = cur.fetchall()
        print("\n" + "=" * 70)
        print(f"  Recent Data (showing {len(rows)} rows)")
        print("=" * 70)
        
        if rows:
            headers = ['Date', 'Metal', 'Registered', 'Eligible', 'Total', 'Report Date', 'Activity Date']
            print(tabulate(rows, headers=headers, tablefmt='grid', floatfmt='.0f'))
        else:
            print("  No data found")
        
        # Get summary stats
        cur.execute("""
            SELECT 
                COUNT(DISTINCT date) as unique_dates,
                COUNT(*) as total_records,
                MIN(date) as earliest_date,
                MAX(date) as latest_date
            FROM warehouse_snapshots;
        """)
        
        stats = cur.fetchone()
        print("\n" + "=" * 70)
        print("  Summary Statistics")
        print("=" * 70)
        print(f"  Unique dates: {stats[0]}")
        print(f"  Total records: {stats[1]}")
        print(f"  Earliest date: {stats[2]}")
        print(f"  Latest date: {stats[3]}")
        
        cur.close()
    except psycopg2.Error as e:
        print(f"[ERROR] Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    print("=" * 70)
    print("  Neon Database Viewer")
    print("=" * 70)
    
    view_tables()
    view_warehouse_snapshots()
    
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)
