"""
Parse local CME Excel files from the data folder and sync to database.
"""

import pandas as pd
import json
import os
import re
from pathlib import Path

# Mapping of file names to metal keys
FILE_MAPPING = {
    'Gold_Stocks.xls': 'Gold',
    'Silver_stocks.xls': 'Silver',
    'Copper_Stocks.xls': 'Copper',
    'PA-PL_Stck_Rprt.xls': 'Platinum_Palladium',
    'Aluminum_Stocks.xls': 'Aluminum',
    'Zinc_Stocks.xls': 'Zinc',
    'Lead_Stocks.xls': 'Lead',
}


def parse_metal_file(filepath, metal_name):
    """Parse a CME metal stocks Excel file."""
    print(f"\nParsing {metal_name} from {filepath}...")
    
    try:
        df = pd.read_excel(filepath, engine='xlrd')
    except Exception as e:
        print(f"  [ERROR] Could not read file: {e}")
        return None
    
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
    
    # Find dates in the file
    for i in range(min(20, len(df))):
        row_str = ' '.join([str(x) for x in df.iloc[i].values if pd.notna(x)])
        
        # Look for Report Date
        report_match = re.search(r'Report Date[:\s]*(\d{1,2}/\d{1,2}/\d{4})', row_str)
        if report_match:
            data['report_date'] = report_match.group(1)
            
        # Look for Activity Date
        activity_match = re.search(r'Activity Date[:\s]*(\d{1,2}/\d{1,2}/\d{4})', row_str)
        if activity_match:
            data['activity_date'] = activity_match.group(1)
    
    print(f"  Report Date: {data['report_date']}")
    print(f"  Activity Date: {data['activity_date']}")
    
    # Keywords that indicate header/skip rows
    SKIP_KEYWORDS = [
        'COMMODITY EXCHANGE', 'METAL DEPOSITORY', 'METAL WAREHOUSE', 'TROY OUNCE', 
        'DEPOSITORY', 'DELIVERY POINT', 'PREV TOTAL', 'NOTE:', 'THE INFORMATION',
        'FOR QUESTIONS', 'SHORT TON', 'METRIC TON', 'WAREHOUSE', 'LOCATION'
    ]
    
    # Keywords that indicate data rows (registered/eligible values)
    DATA_ROW_PATTERNS = [
        ('REGISTERED', 'registered'),
        ('ELIGIBLE', 'eligible'),
    ]
    
    # Keywords that indicate total rows
    TOTAL_PATTERNS = [
        ('TOTAL REGISTERED', 'registered'),
        ('TOTAL ELIGIBLE', 'eligible'),
        ('COMBINED TOTAL', 'total'),
        ('TOTAL COPPER', 'total'),
        ('TOTAL ALUMINUM', 'total'),
        ('TOTAL ZINC', 'total'),
        ('TOTAL LEAD', 'total'),
        ('TOTAL GOLD', 'total'),
        ('TOTAL SILVER', 'total'),
        ('GRAND TOTAL', 'total'),
    ]
    
    # Parse depositories
    current_depository = None
    depository_data = {}
    
    for i in range(len(df)):
        row = df.iloc[i]
        first_col = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
        first_col_upper = first_col.upper()
        
        # Skip empty rows
        if not first_col or first_col == 'nan':
            continue
        
        # Skip header rows
        if any(skip in first_col_upper for skip in SKIP_KEYWORDS):
            continue
        
        # Check for total rows first
        is_total_row = False
        for pattern, field in TOTAL_PATTERNS:
            if pattern in first_col_upper:
                # Find the TOTAL TODAY value
                total_today = get_last_numeric_value(row)
                if total_today is not None:
                    data['totals'][field] = total_today
                is_total_row = True
                break
        
        if is_total_row:
            continue
        
        # Check if this is a data row (Registered, Eligible, etc.)
        is_data_row = False
        for pattern, field in DATA_ROW_PATTERNS:
            if pattern in first_col_upper and 'TOTAL' not in first_col_upper:
                total_today = get_last_numeric_value(row)
                if total_today is not None:
                    depository_data[field] = total_today
                is_data_row = True
                break
        
        if is_data_row:
            continue
        
        # Skip rows that are just "Total" for a depository
        if first_col_upper == 'TOTAL':
            continue
        
        # Skip "ENHANCED DELIVERY" variants
        if 'ENHANCED DELIVERY' in first_col_upper:
            continue
        
        # Skip "PLEDGED" rows
        if 'PLEDGED' in first_col_upper:
            continue
        
        # This must be a new depository/location name
        # Save previous depository if it has data
        if current_depository and depository_data:
            if depository_data.get('registered', 0) > 0 or depository_data.get('eligible', 0) > 0:
                data['depositories'].append({
                    'name': current_depository,
                    'registered': depository_data.get('registered', 0),
                    'eligible': depository_data.get('eligible', 0),
                    'total': depository_data.get('registered', 0) + depository_data.get('eligible', 0)
                })
        
        current_depository = first_col
        depository_data = {}
    
    # Don't forget the last depository
    if current_depository and depository_data:
        if depository_data.get('registered', 0) > 0 or depository_data.get('eligible', 0) > 0:
            data['depositories'].append({
                'name': current_depository,
                'registered': depository_data.get('registered', 0),
                'eligible': depository_data.get('eligible', 0),
                'total': depository_data.get('registered', 0) + depository_data.get('eligible', 0)
            })
    
    # If we didn't find totals in the file, calculate them
    if data['totals']['registered'] == 0:
        data['totals']['registered'] = sum(d['registered'] for d in data['depositories'])
    if data['totals']['eligible'] == 0:
        data['totals']['eligible'] = sum(d['eligible'] for d in data['depositories'])
    if data['totals']['total'] == 0:
        data['totals']['total'] = data['totals']['registered'] + data['totals']['eligible']
    
    print(f"  Found {len(data['depositories'])} depositories")
    print(f"  Total Registered: {data['totals']['registered']:,.0f}")
    print(f"  Total Eligible: {data['totals']['eligible']:,.0f}")
    print(f"  Combined Total: {data['totals']['total']:,.0f}")
    
    return data


def get_last_numeric_value(row):
    """Get the last numeric value in a row (usually TOTAL TODAY column)."""
    for col_idx in range(len(row) - 1, -1, -1):
        val = row.iloc[col_idx]
        if pd.notna(val) and isinstance(val, (int, float)):
            return float(val)
    return None


def main():
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'
    public_dir = script_dir.parent / 'public'
    
    if not data_dir.exists():
        print(f"Data directory not found: {data_dir}")
        return
    
    print("=" * 70)
    print("  Parsing Local CME Data Files")
    print("=" * 70)
    
    all_data = {}
    
    for filename, metal_key in FILE_MAPPING.items():
        filepath = data_dir / filename
        if filepath.exists():
            parsed = parse_metal_file(filepath, metal_key)
            if parsed and parsed['totals']['total'] > 0:
                all_data[metal_key] = parsed
        else:
            print(f"\n[SKIP] {filename} not found")
    
    if not all_data:
        print("\n[ERROR] No data parsed successfully")
        return
    
    # Save to data.json
    output_file = public_dir / 'data.json'
    with open(output_file, 'w') as f:
        json.dump(all_data, f, indent=2)
    
    print(f"\n[OK] Saved data to {output_file}")
    
    # Sync to database
    print("\n" + "=" * 70)
    print("  Syncing to Database")
    print("=" * 70)
    
    import requests
    
    api_url = os.environ.get('API_URL', 'http://localhost:3000')
    sync_url = f"{api_url}/api/metals/sync"
    
    try:
        response = requests.post(
            sync_url,
            json=all_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.ok:
            result = response.json()
            print(f"[OK] {result.get('message', 'Sync complete')}")
        else:
            print(f"[ERROR] API sync failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"[WARNING] Could not connect to API at {sync_url}")
        print("[INFO] Data saved to data.json - site will use that")
    except Exception as e:
        print(f"[ERROR] {e}")
    
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
