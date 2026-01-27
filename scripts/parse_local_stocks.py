"""
Parse local warehouse stocks XLS files and update data.json and Neon database.
"""

import pandas as pd
import json
import os
import sys
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

# Local file mappings
LOCAL_FILES = {
    'Gold': 'Gold_Stocks (1).xls',
    'Silver': 'Silver_stocks.xls',
    'Copper': 'Copper_Stocks.xls',
    'Platinum_Palladium': 'PA-PL_Stck_Rprt.xls',
    'Aluminum': 'Aluminum_Stocks.xls',
    'Zinc': 'Zinc_Stocks.xls',
    'Lead': 'Lead_Stocks.xls',
}


def read_local_excel(file_path, metal_name):
    """Read an Excel file from the local filesystem."""
    try:
        print(f"Reading {metal_name} from {file_path}...")
        
        try:
            df = pd.read_excel(file_path, engine='xlrd')
            print(f"  [OK] Parsed as Excel/xlrd ({len(df)} rows)")
            return df
        except Exception as e1:
            print(f"  [DEBUG] xlrd failed: {e1}")
            
            try:
                df = pd.read_excel(file_path, engine='openpyxl')
                print(f"  [OK] Parsed as Excel/openpyxl ({len(df)} rows)")
                return df
            except Exception as e2:
                print(f"  [DEBUG] openpyxl failed: {e2}")
        
        print(f"  [ERROR] Could not parse {metal_name} file with any method")
        return None
    except Exception as e:
        print(f"  [ERROR] Error reading {metal_name}: {e}")
        return None


def parse_warehouse_stocks(df, metal_name):
    """
    Parse warehouse stocks data from DataFrame.
    
    CME reports have a nested structure:
    - Depository name on one row
    - "Registered", "Eligible", "Total" on subsequent indented rows with values
    """
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
    
    df = df.reset_index(drop=True)
    
    # Extract dates from the file
    for i in range(min(15, len(df))):
        try:
            row_values = df.iloc[i].values
            row_str = ' '.join([str(x) for x in row_values if pd.notna(x)])
            
            # Look for report date
            report_match = re.search(r'Report Date[:\s]+(\d{1,2}/\d{1,2}/\d{4})', row_str)
            if report_match:
                data['report_date'] = report_match.group(1)
                print(f"  [INFO] Found report date: {data['report_date']}")
            
            # Look for activity date
            activity_match = re.search(r'Activity Date[:\s]+(\d{1,2}/\d{1,2}/\d{4})', row_str)
            if activity_match:
                data['activity_date'] = activity_match.group(1)
                print(f"  [INFO] Found activity date: {data['activity_date']}")
        except:
            pass
    
    # Find the "TOTAL TODAY" column index (usually the last column with values)
    total_today_col = None
    for i in range(min(15, len(df))):
        row_values = df.iloc[i].values
        for idx, val in enumerate(row_values):
            if pd.notna(val) and 'TOTAL TODAY' in str(val).upper():
                total_today_col = idx
                print(f"  [INFO] Found 'TOTAL TODAY' column at index {total_today_col}")
                break
        if total_today_col is not None:
            break
    
    # If we didn't find it, use the last column
    if total_today_col is None:
        total_today_col = len(df.columns) - 1
        print(f"  [INFO] Using last column ({total_today_col}) for total values")
    
    # Parse the nested structure
    current_depository = None
    current_registered = 0
    current_eligible = 0
    
    for i in range(len(df)):
        try:
            row_values = df.iloc[i].values
            first_col = str(row_values[0]).strip() if pd.notna(row_values[0]) else ''
            
            # Skip empty rows and headers
            if not first_col or first_col.upper() in ['NAN', 'DEPOSITORY', 'DELIVERY POINT', '']:
                continue
            
            # Skip the summary totals at the end
            if 'GRAND TOTAL' in first_col.upper() or first_col.upper() == 'TOTAL':
                continue
            
            # Check if this is a depository/location name (not indented, no "Registered"/"Eligible")
            is_category_row = first_col.strip().startswith('Registered') or \
                              first_col.strip().startswith('Eligible') or \
                              first_col.strip().startswith('Total') or \
                              first_col.strip().startswith('Pledged')
            
            if not is_category_row and not first_col[0].isspace():
                # This is a depository name - save the previous one first
                if current_depository and (current_registered > 0 or current_eligible > 0):
                    data['depositories'].append({
                        'name': current_depository,
                        'registered': current_registered,
                        'eligible': current_eligible,
                        'total': current_registered + current_eligible
                    })
                    data['totals']['registered'] += current_registered
                    data['totals']['eligible'] += current_eligible
                    data['totals']['total'] += current_registered + current_eligible
                
                # Start new depository
                current_depository = first_col.strip()
                current_registered = 0
                current_eligible = 0
            
            elif 'REGISTERED' in first_col.upper():
                # Get the TOTAL TODAY value for registered
                try:
                    val = row_values[total_today_col]
                    if pd.notna(val):
                        current_registered = float(val)
                except:
                    pass
            
            elif 'ELIGIBLE' in first_col.upper() and 'NON' not in first_col.upper()[:10]:
                # Get the TOTAL TODAY value for eligible (but not "non-warranted" label)
                # Actually, "Eligible (non-warranted)" IS the eligible category
                try:
                    val = row_values[total_today_col]
                    if pd.notna(val):
                        current_eligible = float(val)
                except:
                    pass
                    
        except Exception as e:
            print(f"  [WARNING] Error parsing row {i}: {e}")
            continue
    
    # Don't forget the last depository
    if current_depository and (current_registered > 0 or current_eligible > 0):
        data['depositories'].append({
            'name': current_depository,
            'registered': current_registered,
            'eligible': current_eligible,
            'total': current_registered + current_eligible
        })
        data['totals']['registered'] += current_registered
        data['totals']['eligible'] += current_eligible
        data['totals']['total'] += current_registered + current_eligible
    
    print(f"  [RESULT] Parsed {len(data['depositories'])} depositories")
    for dep in data['depositories']:
        print(f"    {dep['name']}: Reg={dep['registered']:,.0f}, Elig={dep['eligible']:,.0f}")
    
    return data


def parse_platinum_palladium(df):
    """Special parser for Platinum/Palladium combined report."""
    platinum_data = {
        'metal': 'Platinum',
        'report_date': None,
        'activity_date': None,
        'depositories': [],
        'totals': {'registered': 0, 'eligible': 0, 'total': 0}
    }
    
    palladium_data = {
        'metal': 'Palladium',
        'report_date': None,
        'activity_date': None,
        'depositories': [],
        'totals': {'registered': 0, 'eligible': 0, 'total': 0}
    }
    
    df = df.reset_index(drop=True)
    
    # Extract dates
    for i in range(min(20, len(df))):
        try:
            row_values = df.iloc[i].values
            row_str = ' '.join([str(x) for x in row_values if pd.notna(x)])
            
            report_match = re.search(r'Report Date[:\s]+(\d{1,2}/\d{1,2}/\d{4})', row_str)
            if report_match:
                platinum_data['report_date'] = report_match.group(1)
                palladium_data['report_date'] = report_match.group(1)
                print(f"  [INFO] Found report date: {report_match.group(1)}")
            
            activity_match = re.search(r'Activity Date[:\s]+(\d{1,2}/\d{1,2}/\d{4})', row_str)
            if activity_match:
                platinum_data['activity_date'] = activity_match.group(1)
                palladium_data['activity_date'] = activity_match.group(1)
                print(f"  [INFO] Found activity date: {activity_match.group(1)}")
        except:
            pass
    
    # Find the "TOTAL TODAY" column
    total_today_col = None
    for i in range(min(20, len(df))):
        row_values = df.iloc[i].values
        for idx, val in enumerate(row_values):
            if pd.notna(val) and 'TOTAL TODAY' in str(val).upper():
                total_today_col = idx
                print(f"  [INFO] Found 'TOTAL TODAY' column at index {total_today_col}")
                break
        if total_today_col is not None:
            break
    
    if total_today_col is None:
        total_today_col = len(df.columns) - 1
    
    # Find section boundaries
    platinum_start = None
    palladium_start = None
    
    for i in range(len(df)):
        row_values = df.iloc[i].values
        row_str = ' '.join([str(x).upper() for x in row_values if pd.notna(x)])
        
        if 'PLATINUM' in row_str and 'PALLADIUM' not in row_str:
            platinum_start = i
            print(f"  [INFO] Platinum section starts at row {i}")
        elif 'PALLADIUM' in row_str and 'PLATINUM' not in row_str:
            palladium_start = i
            print(f"  [INFO] Palladium section starts at row {i}")
    
    # Parse each section
    def parse_section(start_row, end_row, target_data):
        current_depository = None
        current_registered = 0
        current_eligible = 0
        
        for i in range(start_row, end_row):
            try:
                row_values = df.iloc[i].values
                first_col = str(row_values[0]).strip() if pd.notna(row_values[0]) else ''
                
                if not first_col or first_col.upper() in ['NAN', 'DEPOSITORY', '']:
                    continue
                
                # Skip metal headers and summary rows
                if any(keyword in first_col.upper() for keyword in ['PLATINUM', 'PALLADIUM', 'GRAND TOTAL', 'TROY OUNCE']):
                    continue
                
                is_category_row = first_col.strip().startswith('Registered') or \
                                  first_col.strip().startswith('Eligible') or \
                                  first_col.strip().startswith('Total') or \
                                  first_col.strip().startswith('Pledged')
                
                if not is_category_row and not first_col[0].isspace():
                    # Save previous depository
                    if current_depository and (current_registered > 0 or current_eligible > 0):
                        target_data['depositories'].append({
                            'name': current_depository,
                            'registered': current_registered,
                            'eligible': current_eligible,
                            'total': current_registered + current_eligible
                        })
                        target_data['totals']['registered'] += current_registered
                        target_data['totals']['eligible'] += current_eligible
                        target_data['totals']['total'] += current_registered + current_eligible
                    
                    current_depository = first_col.strip()
                    current_registered = 0
                    current_eligible = 0
                
                elif 'REGISTERED' in first_col.upper():
                    try:
                        val = row_values[total_today_col]
                        if pd.notna(val):
                            current_registered = float(val)
                    except:
                        pass
                
                elif 'ELIGIBLE' in first_col.upper():
                    try:
                        val = row_values[total_today_col]
                        if pd.notna(val):
                            current_eligible = float(val)
                    except:
                        pass
                        
            except Exception as e:
                continue
        
        # Don't forget the last depository
        if current_depository and (current_registered > 0 or current_eligible > 0):
            target_data['depositories'].append({
                'name': current_depository,
                'registered': current_registered,
                'eligible': current_eligible,
                'total': current_registered + current_eligible
            })
            target_data['totals']['registered'] += current_registered
            target_data['totals']['eligible'] += current_eligible
            target_data['totals']['total'] += current_registered + current_eligible
    
    # Parse Platinum section
    if platinum_start is not None:
        platinum_end = palladium_start if palladium_start else len(df)
        parse_section(platinum_start, platinum_end, platinum_data)
        print(f"  [RESULT] Platinum: {len(platinum_data['depositories'])} depositories")
        for dep in platinum_data['depositories']:
            print(f"    {dep['name']}: Reg={dep['registered']:,.0f}, Elig={dep['eligible']:,.0f}")
    
    # Parse Palladium section
    if palladium_start is not None:
        parse_section(palladium_start, len(df), palladium_data)
        print(f"  [RESULT] Palladium: {len(palladium_data['depositories'])} depositories")
        for dep in palladium_data['depositories']:
            print(f"    {dep['name']}: Reg={dep['registered']:,.0f}, Elig={dep['eligible']:,.0f}")
    
    return platinum_data, palladium_data


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
    
    return datetime.now().strftime('%Y-%m-%d')


def sync_to_database(data, database_url):
    """Sync data directly to Neon database using psycopg2."""
    if not HAS_PSYCOPG2:
        print("[WARNING] psycopg2 not installed, skipping database sync")
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
        
        conn.commit()
        print("[OK] Database tables verified")
        
        # Insert/update data for each metal
        for metal_name, metal_data in data.items():
            if metal_name == '_metadata':
                continue
                
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
    print("  Local Warehouse Stocks Parser")
    print("=" * 70)
    print()
    
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / 'data'
    data_file = project_root / 'public' / 'data.json'
    
    print(f"Data directory: {data_dir}")
    print(f"Output file: {data_file}")
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
    
    # Parse all local files
    all_data = {}
    
    for metal, filename in LOCAL_FILES.items():
        file_path = data_dir / filename
        
        if not file_path.exists():
            print(f"[WARNING] File not found: {file_path}")
            continue
        
        if metal == 'Platinum_Palladium':
            df = read_local_excel(file_path, metal)
            if df is not None:
                platinum_data, palladium_data = parse_platinum_palladium(df)
                
                if platinum_data['totals']['total'] > 0 or len(platinum_data['depositories']) > 0:
                    all_data['Platinum'] = platinum_data
                    print(f"  [OK] Parsed Platinum: {len(platinum_data['depositories'])} depositories, "
                          f"Registered: {platinum_data['totals']['registered']:,.0f}, "
                          f"Eligible: {platinum_data['totals']['eligible']:,.0f}")
                
                if palladium_data['totals']['total'] > 0 or len(palladium_data['depositories']) > 0:
                    all_data['Palladium'] = palladium_data
                    print(f"  [OK] Parsed Palladium: {len(palladium_data['depositories'])} depositories, "
                          f"Registered: {palladium_data['totals']['registered']:,.0f}, "
                          f"Eligible: {palladium_data['totals']['eligible']:,.0f}")
        else:
            df = read_local_excel(file_path, metal)
            if df is not None:
                parsed = parse_warehouse_stocks(df, metal)
                if parsed and (parsed['totals']['total'] > 0 or len(parsed['depositories']) > 0):
                    all_data[metal] = parsed
                    print(f"  [OK] Parsed {metal}: {len(parsed['depositories'])} depositories, "
                          f"Registered: {parsed['totals']['registered']:,.0f}, "
                          f"Eligible: {parsed['totals']['eligible']:,.0f}")
                else:
                    print(f"  [WARNING] No data found for {metal}")
    
    if not all_data:
        print("\n[WARNING] No new data parsed from local files.")
        if existing_data:
            print("[INFO] Keeping existing data.json unchanged.")
            sys.exit(0)
        else:
            print("[ERROR] No data available.")
            sys.exit(1)
    
    # Merge with existing data (keep existing metals if not parsed)
    for metal in existing_data:
        if metal not in all_data and metal != '_metadata':
            all_data[metal] = existing_data[metal]
            print(f"[INFO] Keeping existing data for {metal}")
    
    # Add metadata with last updated timestamp
    all_data['_metadata'] = {
        'last_updated': 'January 26, 2026',
        'source': 'CME Group'
    }
    
    print("\n" + "=" * 70)
    print("  Summary")
    print("=" * 70)
    for metal, info in all_data.items():
        if metal == '_metadata':
            continue
        print(f"\n{metal}:")
        if info.get('report_date'):
            print(f"  Report Date: {info['report_date']}")
        if info.get('activity_date'):
            print(f"  Activity Date: {info['activity_date']}")
        print(f"  Depositories: {len(info.get('depositories', []))}")
        print(f"  Registered: {info['totals']['registered']:,.0f}")
        print(f"  Eligible: {info['totals']['eligible']:,.0f}")
        print(f"  Total: {info['totals']['total']:,.0f}")
    
    # Save data to JSON file
    with open(data_file, 'w') as f:
        json.dump(all_data, f, indent=2, default=str)
    
    print(f"\n[OK] Data saved to {data_file}")
    
    # Sync to database
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        print("\n" + "=" * 70)
        print("  Syncing to Database")
        print("=" * 70)
        sync_to_database(all_data, database_url)
    else:
        print("\n[INFO] DATABASE_URL not set, skipping database sync")
        print("[INFO] Set DATABASE_URL environment variable to sync to Neon database")
    
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
