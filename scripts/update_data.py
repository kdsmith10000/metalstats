"""
Fetch Warehouse & Depository Stocks from CME Group Excel files
and update the Next.js dashboard data.json file.
"""

import requests
import pandas as pd
import io
import json
import sys
import time
import random
from datetime import datetime
from pathlib import Path

# URLs for the warehouse stocks reports
URLS = {
    'Gold': 'https://www.cmegroup.com/delivery_reports/Gold_stocks.xls',
    'Silver': 'https://www.cmegroup.com/delivery_reports/Silver_stocks.xls',
    'Copper': 'https://www.cmegroup.com/delivery_reports/Copper_Stocks.xls',
    'Platinum_Palladium': 'https://www.cmegroup.com/delivery_reports/PA-PL_Stck_Rprt.xls',
    'Aluminum': 'https://www.cmegroup.com/delivery_reports/Aluminum_Stocks.xls',
    'Zinc': 'https://www.cmegroup.com/delivery_reports/Zinc_Stocks.xls',
    'Lead': 'https://www.cmegroup.com/delivery_reports/Lead_Stocks.xls',
}

def fetch_excel_file(url, metal_name):
    """Fetch an Excel file from a URL and return as pandas DataFrame."""
    try:
        print(f"Fetching {metal_name} stocks from {url}...")
        
        # Create a session to handle cookies
        session = requests.Session()
        
        # More comprehensive browser-like headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'Referer': 'https://www.cmegroup.com/clearing/operations-and-deliveries/nymex-delivery-notices.html',
        }
        
        session.headers.update(headers)
        
        # First visit the main page to get cookies
        try:
            session.get('https://www.cmegroup.com/clearing/operations-and-deliveries/nymex-delivery-notices.html', timeout=15)
        except:
            pass
        
        # Now fetch the actual file
        response = session.get(url, timeout=30)
        response.raise_for_status()
        
        # Try reading as Excel file first (most CME files are old-style XLS)
        try:
            df = pd.read_excel(io.BytesIO(response.content), engine='xlrd')
            print(f"  [OK] Parsed as Excel/xlrd ({len(df)} rows)")
            return df
        except Exception as e1:
            print(f"  [DEBUG] xlrd failed: {e1}")
            
            # Try with openpyxl for newer Excel formats
            try:
                df = pd.read_excel(io.BytesIO(response.content), engine='openpyxl')
                print(f"  [OK] Parsed as Excel/openpyxl ({len(df)} rows)")
                return df
            except Exception as e2:
                print(f"  [DEBUG] openpyxl failed: {e2}")
                
                # Try parsing as HTML table (CME sometimes serves HTML as .xls)
                try:
                    dfs = pd.read_html(io.BytesIO(response.content))
                    if dfs:
                        df = dfs[0]
                        print(f"  [OK] Parsed as HTML table ({len(df)} rows)")
                        return df
                except Exception as e3:
                    print(f"  [DEBUG] HTML parsing failed: {e3}")
                
                # Try with calamine engine (supports more formats)
                try:
                    df = pd.read_excel(io.BytesIO(response.content), engine='calamine')
                    print(f"  [OK] Parsed as Excel/calamine ({len(df)} rows)")
                    return df
                except Exception as e4:
                    print(f"  [DEBUG] calamine failed: {e4}")
        
        print(f"  [ERROR] Could not parse {metal_name} file with any method")
        return None
    except Exception as e:
        print(f"  [ERROR] Error fetching {metal_name}: {e}")
        return None

def parse_warehouse_stocks(df, metal_name):
    """Parse warehouse stocks data from DataFrame."""
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
    
    # Get column names as list
    cols = list(df.columns)
    
    # Try to find date information in first 10 rows
    for i in range(min(10, len(df))):
        try:
            row_values = df.iloc[i].values
            row_str = ' '.join([str(x) for x in row_values if pd.notna(x)])
            if 'REPORT DATE' in row_str.upper() or 'AS OF' in row_str.upper():
                for val in row_values:
                    if pd.notna(val) and str(val) != 'nan':
                        date_str = str(val)
                        if '/' in date_str or '-' in date_str:
                            data['report_date'] = date_str
                            break
        except:
            pass
    
    # Find header row with "DEPOSITORY" or "WAREHOUSE"
    header_row = None
    for i in range(len(df)):
        try:
            row_values = df.iloc[i].values
            row_str = ' '.join([str(x) for x in row_values if pd.notna(x)])
            if any(keyword in row_str.upper() for keyword in ['DEPOSITORY', 'WAREHOUSE', 'LOCATION']):
                if any(keyword in row_str.upper() for keyword in ['REGISTERED', 'ELIGIBLE', 'TOTAL']):
                    header_row = i
                    break
        except:
            pass
    
    if header_row is None:
        print(f"  [WARNING] Could not find header row for {metal_name}")
        return data
    
    # Find column indices by examining header row
    depository_col = 0
    registered_col = None
    eligible_col = None
    
    header_row_values = df.iloc[header_row].values
    for idx, col_val in enumerate(header_row_values):
        col_str = str(col_val).upper() if pd.notna(col_val) else ''
        if 'DEPOSITORY' in col_str or 'WAREHOUSE' in col_str or 'LOCATION' in col_str:
            depository_col = idx
        elif 'REGISTERED' in col_str:
            registered_col = idx
        elif 'ELIGIBLE' in col_str:
            eligible_col = idx
    
    # Parse data rows
    reg_sum = 0
    elig_sum = 0
    
    for i in range(header_row + 1, len(df)):
        try:
            row_values = df.iloc[i].values
            
            # Get depository name
            depository_name = ''
            if depository_col < len(row_values):
                val = row_values[depository_col]
                if pd.notna(val):
                    depository_name = str(val).strip()
            
            if not depository_name or depository_name.upper() in ['NAN', '', 'TOTAL', 'GRAND TOTAL']:
                continue
            
            # Skip if it's a summary row
            if any(keyword in depository_name.upper() for keyword in ['TOTAL', 'SUM', 'GRAND']):
                continue
            
            registered = 0
            eligible = 0
            
            if registered_col is not None and registered_col < len(row_values):
                try:
                    val = row_values[registered_col]
                    if pd.notna(val):
                        registered = float(val)
                        reg_sum += registered
                except:
                    pass
            
            if eligible_col is not None and eligible_col < len(row_values):
                try:
                    val = row_values[eligible_col]
                    if pd.notna(val):
                        eligible = float(val)
                        elig_sum += eligible
                except:
                    pass
            
            if registered > 0 or eligible > 0:
                data['depositories'].append({
                    'name': depository_name,
                    'registered': registered,
                    'eligible': eligible,
                    'total': registered + eligible
                })
        except Exception as e:
            print(f"  [WARNING] Error parsing row {i}: {e}")
            continue
    
    data['totals']['registered'] = reg_sum
    data['totals']['eligible'] = elig_sum
    data['totals']['total'] = reg_sum + elig_sum
    
    return data

def fetch_all_stocks():
    """Fetch all warehouse stocks data."""
    all_data = {}
    
    for metal, url in URLS.items():
        # Add random delay between requests to avoid rate limiting
        delay = random.uniform(2, 5)
        print(f"  [INFO] Waiting {delay:.1f}s before next request...")
        time.sleep(delay)
        
        # Try up to 3 times with increasing delays
        for attempt in range(3):
            try:
                df = fetch_excel_file(url, metal)
                if df is not None:
                    parsed = parse_warehouse_stocks(df, metal)
                    if parsed and (parsed['totals']['total'] > 0 or len(parsed['depositories']) > 0):
                        all_data[metal] = parsed
                        print(f"  [OK] Parsed {metal}: {len(parsed['depositories'])} depositories, "
                              f"Registered: {parsed['totals']['registered']:,.0f}, "
                              f"Eligible: {parsed['totals']['eligible']:,.0f}")
                        break
                    else:
                        print(f"  [WARNING] No data found for {metal}")
                        break
                else:
                    if attempt < 2:
                        retry_delay = (attempt + 1) * 5
                        print(f"  [RETRY] Attempt {attempt + 1} failed, retrying in {retry_delay}s...")
                        time.sleep(retry_delay)
                    else:
                        print(f"  [FAILED] All attempts failed for {metal}")
            except Exception as e:
                if attempt < 2:
                    print(f"  [RETRY] Error: {e}, retrying...")
                    time.sleep((attempt + 1) * 5)
                else:
                    print(f"  [ERROR] Failed to process {metal}: {e}")
                continue
    
    return all_data

if __name__ == '__main__':
    print("=" * 70)
    print("  CME Group Warehouse & Depository Stocks Fetcher")
    print("=" * 70)
    print()
    
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_file = project_root / 'public' / 'data.json'
    
    # Load existing data if available
    existing_data = {}
    if data_file.exists():
        try:
            with open(data_file, 'r') as f:
                existing_data = json.load(f)
            print(f"[INFO] Loaded existing data from {data_file}")
        except:
            pass
    
    # Fetch all stocks data
    data = fetch_all_stocks()
    
    if not data:
        print("\n[WARNING] No new data fetched.")
        if existing_data:
            print("Keeping existing data.json unchanged.")
            sys.exit(0)
        else:
            print("No existing data available.")
            sys.exit(0)
    
    # Merge with existing data (keep existing metals if not fetched)
    for metal in existing_data:
        if metal not in data:
            data[metal] = existing_data[metal]
            print(f"[INFO] Keeping existing data for {metal}")
    
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
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)
