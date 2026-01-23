"""
Process local XLS warehouse stock files and delivery reports.
Updates both data.json and the Neon database.
"""

import pandas as pd
import json
import os
import re
from datetime import datetime
from pathlib import Path

# Optional: psycopg2 for direct database connection
try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    print("[INFO] psycopg2 not installed. Database sync will be skipped.")

# Load environment variables from .env file
def load_env():
    env_file = Path(__file__).parent.parent / '.env'
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print(f"[INFO] Loaded environment from {env_file}")

# Mapping of file names to metal names
FILE_MAPPINGS = {
    'Gold_Stocks.xls': 'Gold',
    'Silver_stocks.xls': 'Silver',
    'Copper_Stocks.xls': 'Copper',
    'PA-PL_Stck_Rprt.xls': 'Platinum_Palladium',
    'Aluminum_Stocks.xls': 'Aluminum',
    'Zinc_Stocks.xls': 'Zinc',
    'Lead_Stocks.xls': 'Lead',
}


def parse_warehouse_stocks(df, metal_name):
    """Parse warehouse stocks data from DataFrame - CME format."""
    data = {
        'metal': metal_name,
        'report_date': None,
        'activity_date': None,
        'depositories': [],
        'totals': {
            'registered': 0,
            'eligible': 0,
            'total': 0
        }
    }
    
    # Reset index to ensure numeric indexing works
    df = df.reset_index(drop=True)
    
    # Try to find date information
    for i in range(min(15, len(df))):
        try:
            row_values = df.iloc[i].values
            for val in row_values:
                if pd.notna(val):
                    val_str = str(val)
                    # Look for "Report Date: MM/DD/YYYY"
                    if 'Report Date:' in val_str:
                        match = re.search(r'Report Date:\s*(\d{1,2}/\d{1,2}/\d{4})', val_str)
                        if match:
                            data['report_date'] = match.group(1)
                    # Look for "Activity Date: MM/DD/YYYY"
                    if 'Activity Date:' in val_str:
                        match = re.search(r'Activity Date:\s*(\d{1,2}/\d{1,2}/\d{4})', val_str)
                        if match:
                            data['activity_date'] = match.group(1)
        except:
            pass
    
    # CME format: Depository names are in column 0, followed by rows for Registered/Pledged/Eligible/Total
    # The "TOTAL TODAY" values are in column 7
    
    current_depository = None
    depositories_data = {}
    total_col = 7  # TOTAL TODAY column
    
    for i in range(len(df)):
        try:
            row_values = df.iloc[i].values
            first_col = str(row_values[0]).strip() if pd.notna(row_values[0]) else ''
            
            # Skip empty or header rows
            if not first_col or first_col == 'nan' or first_col == 'DEPOSITORY':
                continue
            
            # Check if this is a depository/delivery point name
            is_depository_name = any(x in first_col.upper() for x in [
                'LLC', 'INC', 'CORP', 'DEPOSITORY', 'BANK', 'TRUST', 'BRINK',
                'MANFRA', 'MALCA', 'LOOMIS', 'ASAHI', 'JP MORGAN', 'HSBC', 
                'MTB', 'DELAWARE', 'CNT', 'INTERNATIONAL'
            ])
            
            # Also check for delivery point names (cities for Copper, etc.)
            is_delivery_point = first_col.upper() in [
                'BALTIMORE', 'DETROIT', 'EL PASO', 'NEW ORLEANS', 'SALT LAKE CITY',
                'CHICAGO', 'PERTH AMBOY', 'ST LOUIS', 'TOLEDO', 'NEW HAVEN',
                'VLISSINGEN', 'DETROIT MI', 'OWENSBORO KY'
            ]
            
            # Also check if it's NOT a category row
            is_category = any(first_col.upper().startswith(x) for x in [
                'REGISTERED', 'PLEDGED', 'ELIGIBLE', 'TOTAL', 
                'TROY OUNCE', 'GOLD', 'SILVER', 'COPPER', 
                'PLATINUM', 'PALLADIUM', 'ALUMINUM', 'ZINC', 'LEAD',
                'SHORT TONS', 'DELIVERY POINT', 'DEPOSITORY', 'METAL',
                'COMMODITY'
            ])
            
            if (is_depository_name or is_delivery_point) and not is_category:
                current_depository = first_col
                if current_depository not in depositories_data:
                    depositories_data[current_depository] = {'registered': 0, 'eligible': 0}
            elif current_depository and ('REGISTERED' in first_col.upper()):
                # Get the TOTAL TODAY value (handles both "Registered" and "Registered (warranted)")
                try:
                    val = row_values[total_col] if total_col < len(row_values) else row_values[2]
                    if pd.notna(val):
                        depositories_data[current_depository]['registered'] = float(val)
                except:
                    pass
            elif current_depository and ('ELIGIBLE' in first_col.upper()):
                # Handles both "Eligible" and "Eligible (non-warranted)"
                try:
                    val = row_values[total_col] if total_col < len(row_values) else row_values[2]
                    if pd.notna(val):
                        depositories_data[current_depository]['eligible'] = float(val)
                except:
                    pass
                    
        except Exception as e:
            continue
    
    # Build final depositories list
    reg_sum = 0
    elig_sum = 0
    
    for name, values in depositories_data.items():
        registered = values.get('registered', 0)
        eligible = values.get('eligible', 0)
        
        if registered > 0 or eligible > 0:
            data['depositories'].append({
                'name': name,
                'registered': registered,
                'eligible': eligible,
                'total': registered + eligible
            })
            reg_sum += registered
            elig_sum += eligible
    
    data['totals']['registered'] = reg_sum
    data['totals']['eligible'] = elig_sum
    data['totals']['total'] = reg_sum + elig_sum
    
    return data


def process_local_xls_files(data_dir):
    """Process all XLS files in the data directory."""
    all_data = {}
    
    for filename, metal_name in FILE_MAPPINGS.items():
        file_path = data_dir / filename
        
        if not file_path.exists():
            print(f"  [SKIP] {filename} not found")
            continue
        
        print(f"Processing {filename}...")
        
        try:
            # Try reading with xlrd first (for old .xls files)
            try:
                df = pd.read_excel(file_path, engine='xlrd')
            except:
                # Try openpyxl for newer formats
                df = pd.read_excel(file_path, engine='openpyxl')
            
            parsed = parse_warehouse_stocks(df, metal_name)
            
            if parsed and (parsed['totals']['total'] > 0 or len(parsed['depositories']) > 0):
                all_data[metal_name] = parsed
                print(f"  [OK] Parsed {metal_name}: {len(parsed['depositories'])} depositories, "
                      f"Registered: {parsed['totals']['registered']:,.0f}, "
                      f"Eligible: {parsed['totals']['eligible']:,.0f}")
            else:
                print(f"  [WARNING] No data found in {filename}")
                
        except Exception as e:
            print(f"  [ERROR] Failed to process {filename}: {e}")
    
    return all_data


def parse_date_for_db(date_str):
    """Parse a date string to YYYY-MM-DD format for database."""
    if not date_str:
        return datetime.now().strftime('%Y-%m-%d')
    
    # Already in ISO format
    if isinstance(date_str, str) and len(date_str) == 10 and date_str[4] == '-':
        return date_str
    
    # Handle MM/DD/YYYY format
    try:
        parts = str(date_str).split('/')
        if len(parts) == 3:
            month, day, year = parts
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except:
        pass
    
    # Fallback to current date
    return datetime.now().strftime('%Y-%m-%d')


def sync_to_database(data):
    """Sync the data to the Neon database."""
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("[WARNING] DATABASE_URL not set. Skipping database sync.")
        return
    
    if not HAS_PSYCOPG2:
        print("[WARNING] psycopg2 not installed. Skipping database sync.")
        return
    
    print("[INFO] Connecting to database...")
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Ensure tables exist
        cur.execute("""
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
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS depository_snapshots (
                id SERIAL PRIMARY KEY,
                metal_snapshot_id INTEGER REFERENCES metal_snapshots(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                registered DECIMAL(20, 3) NOT NULL DEFAULT 0,
                eligible DECIMAL(20, 3) NOT NULL DEFAULT 0,
                total DECIMAL(20, 3) NOT NULL DEFAULT 0
            )
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_metal_snapshots_metal_date 
            ON metal_snapshots(metal, report_date DESC)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_depository_snapshots_metal_id 
            ON depository_snapshots(metal_snapshot_id)
        """)
        
        conn.commit()
        print("[OK] Database tables verified")
        
        # Insert/update data for each metal
        for metal_name, metal_data in data.items():
            try:
                report_date = parse_date_for_db(metal_data.get('report_date'))
                activity_date = parse_date_for_db(metal_data.get('activity_date'))
                totals = metal_data.get('totals', {})
                
                # Upsert metal snapshot
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
                """, (
                    metal_name,
                    report_date,
                    activity_date,
                    totals.get('registered', 0),
                    totals.get('eligible', 0),
                    totals.get('total', 0)
                ))
                
                snapshot_id = cur.fetchone()[0]
                
                # Delete existing depositories
                cur.execute("DELETE FROM depository_snapshots WHERE metal_snapshot_id = %s", (snapshot_id,))
                
                # Insert depositories
                depositories = metal_data.get('depositories', [])
                if depositories:
                    execute_values(cur, """
                        INSERT INTO depository_snapshots (metal_snapshot_id, name, registered, eligible, total)
                        VALUES %s
                    """, [
                        (snapshot_id, dep['name'], dep['registered'], dep['eligible'], dep['total'])
                        for dep in depositories
                    ])
                
                conn.commit()
                print(f"  [OK] Synced {metal_name} to database (report_date: {report_date})")
                
            except Exception as e:
                conn.rollback()
                print(f"  [ERROR] Failed to sync {metal_name}: {e}")
        
        print("[OK] Database sync complete")
        
    finally:
        cur.close()
        conn.close()


def main():
    print("=" * 70)
    print("  Local Data Processor - COMEX Warehouse Stocks")
    print("=" * 70)
    print()
    
    # Load environment variables
    load_env()
    
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / 'data'
    data_file = project_root / 'public' / 'data.json'
    
    print(f"[INFO] Data directory: {data_dir}")
    print(f"[INFO] Output file: {data_file}")
    print()
    
    # Load existing data if available
    existing_data = {}
    if data_file.exists():
        try:
            with open(data_file, 'r') as f:
                existing_data = json.load(f)
            print(f"[INFO] Loaded existing data from {data_file}")
        except:
            pass
    
    # Process local XLS files
    print("\n" + "=" * 70)
    print("  Processing XLS Files")
    print("=" * 70)
    
    data = process_local_xls_files(data_dir)
    
    if not data:
        print("\n[WARNING] No data processed from local files.")
        if existing_data:
            print("Keeping existing data.json unchanged.")
            return
    
    # Merge with existing data (keep existing metals if not processed)
    for metal in existing_data:
        if metal not in data:
            data[metal] = existing_data[metal]
            print(f"[INFO] Keeping existing data for {metal}")
    
    # Print summary
    print("\n" + "=" * 70)
    print("  Summary")
    print("=" * 70)
    for metal, info in data.items():
        print(f"\n{metal}:")
        if info.get('report_date'):
            print(f"  Report Date: {info['report_date']}")
        print(f"  Depositories: {len(info.get('depositories', []))}")
        print(f"  Registered: {info['totals']['registered']:,.0f}")
        print(f"  Eligible: {info['totals']['eligible']:,.0f}")
        print(f"  Total: {info['totals']['total']:,.0f}")
    
    # Save data to JSON file
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"\n[OK] Data saved to {data_file}")
    
    # Sync to database
    print("\n" + "=" * 70)
    print("  Syncing to Database")
    print("=" * 70)
    
    sync_to_database(data)
    
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
