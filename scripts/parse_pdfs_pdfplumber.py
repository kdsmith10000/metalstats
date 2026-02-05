"""
Parse CME reports using pdfplumber for better table extraction.
"""

import os
import re
import json
import pdfplumber
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Optional: psycopg2 for database
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


def parse_bulletin_pdf(pdf_path: str) -> dict:
    """Parse Section 62 bulletin for open interest data using pdfplumber."""
    print(f"[INFO] Parsing bulletin: {pdf_path}")
    
    result = {
        'bulletin_number': None,
        'date': None,
        'parsed_date': None,
        'products': [],
        'last_updated': datetime.now().isoformat(),
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text() or ""
            full_text += text + "\n\n"
    
    # Find bulletin number
    bulletin_match = re.search(r'BULLETIN\s*#\s*(\d+)', full_text, re.IGNORECASE)
    if bulletin_match:
        result['bulletin_number'] = int(bulletin_match.group(1))
    
    # Find date
    date_match = re.search(
        r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})',
        full_text, re.IGNORECASE
    )
    if date_match:
        result['date'] = date_match.group(0).lower()
        month_map = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        month = month_map.get(date_match.group(2).lower(), 1)
        day = int(date_match.group(3))
        year = int(date_match.group(4))
        result['parsed_date'] = f"{year:04d}-{month:02d}-{day:02d}"
    
    print(f"[INFO] Bulletin #{result.get('bulletin_number')} - {result.get('date')}")
    
    # Products to extract with their total patterns
    products_config = [
        ('1OZ', '1 OUNCE GOLD FUTURES'),
        ('GC', 'COMEX GOLD FUTURES'),
        ('SI', 'COMEX SILVER FUTURES'),
        ('SIL', '5000 OZ SILVER FUTURES'),
        ('HG', 'COMEX COPPER FUTURES'),
        ('PL', 'NYMEX PLATINUM FUTURES'),
        ('PA', 'NYMEX PALLADIUM FUTURES'),
        ('ALI', 'COMEX PHYSICAL ALUMINUM FUTURES'),
    ]
    
    for code, name in products_config:
        product = extract_product_data(full_text, code, name)
        if product:
            result['products'].append(product)
            print(f"  {code}: Vol={product['total_volume']:,}, OI={product['total_open_interest']:,}, OI_Chg={product['total_oi_change']:+,}")
    
    return result


def extract_product_data(text: str, code: str, name: str) -> dict:
    """Extract product data including contracts."""
    product = {
        'symbol': code,
        'name': name,
        'contracts': [],
        'total_volume': 0,
        'total_open_interest': 0,
        'total_oi_change': 0,
    }
    
    # Find TOTAL line - format varies by product
    # Pattern: TOTAL GC FUT 280352 7140 411011 - 3765
    # Or: TOTAL SIL FUT 343957 32042 + 323
    
    # Try 4-number format first (with PNT volume)
    pattern_4num = rf'TOTAL\s+{code}\s+FUT\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*([+-]?\s*[\d,]+)'
    match_4 = re.search(pattern_4num, text)
    
    # Try 3-number format (no PNT volume)
    pattern_3num = rf'TOTAL\s+{code}\s+FUT\s+([\d,]+)\s+([\d,]+)\s*([+-]?\s*[\d,]+)'
    match_3 = re.search(pattern_3num, text)
    
    if match_4:
        nums = [int(match_4.group(i).replace(',', '').replace(' ', '')) for i in range(1, 5)]
        # Determine format: if 3rd number >> 2nd, it's vol, pnt, oi, change
        if nums[2] > nums[1] * 10:
            product['total_volume'] = nums[0]
            product['total_open_interest'] = nums[2]
            product['total_oi_change'] = nums[3]
        else:
            # Check if 2nd is OI (should be large)
            if nums[1] > 10000:
                product['total_volume'] = nums[0]
                product['total_open_interest'] = nums[1]
                product['total_oi_change'] = nums[2]
            else:
                product['total_volume'] = nums[0]
                product['total_open_interest'] = nums[2]
                product['total_oi_change'] = nums[3]
    elif match_3:
        nums = [match_3.group(i).replace(',', '').replace(' ', '') for i in range(1, 4)]
        product['total_volume'] = int(nums[0])
        product['total_open_interest'] = int(nums[1])
        change_str = nums[2]
        product['total_oi_change'] = int(change_str) if change_str.lstrip('+-').isdigit() else 0
    
    # Extract individual contracts
    # Format: MONTH SETTLE CHANGE GLOBEX_VOL PNT_VOL OI OI_CHANGE
    # Example: APR26 2873.4 - 5.3 254296 5818 289088 - 4161
    
    # Find the section for this product
    product_start = text.find(f'{code} FUT')
    if product_start == -1:
        product_start = text.find(name)
    
    if product_start != -1:
        # Find end (next TOTAL or end of relevant section)
        product_end = text.find(f'TOTAL {code}', product_start)
        if product_end == -1:
            product_end = product_start + 5000
        
        section = text[product_start:product_end + 200]
        
        # Contract pattern - handle various formats
        contract_pattern = re.compile(
            r'([A-Z]{3}\d{2})\s+'  # Month (FEB26)
            r'([\d,.]+)\s*'        # Settle price
            r'([+-]?\s*[\d,.]+)\s+' # Change
            r'([\d,]+)\s+'          # Globex vol
            r'([\d,]+)\s+'          # PNT vol  
            r'([\d,]+)\s*'          # Open Interest
            r'([+-]?\s*[\d,]+)?'    # OI Change
        )
        
        for match in contract_pattern.finditer(section):
            try:
                month = match.group(1)
                settle = float(match.group(2).replace(',', ''))
                change_str = match.group(3).replace(' ', '').replace(',', '')
                change = float(change_str) if change_str.replace('.', '').replace('-', '').replace('+', '').isdigit() else 0.0
                globex_vol = int(match.group(4).replace(',', ''))
                pnt_vol = int(match.group(5).replace(',', ''))
                oi = int(match.group(6).replace(',', ''))
                oi_change = 0
                if match.group(7):
                    oi_str = match.group(7).replace(' ', '').replace(',', '')
                    oi_change = int(oi_str) if oi_str.lstrip('+-').isdigit() else 0
                
                # Avoid duplicates and validate
                if not any(c['month'] == month for c in product['contracts']) and oi > 0:
                    product['contracts'].append({
                        'month': month,
                        'settle': settle,
                        'change': change,
                        'globex_volume': globex_vol,
                        'pnt_volume': pnt_vol,
                        'open_interest': oi,
                        'oi_change': oi_change,
                    })
            except (ValueError, AttributeError):
                continue
        
        # Sort by volume (most active first)
        product['contracts'].sort(key=lambda x: x['globex_volume'] + x['pnt_volume'], reverse=True)
    
    if product['total_volume'] > 0 or product['total_open_interest'] > 0:
        return product
    return None


def parse_delivery_pdf(pdf_path: str) -> dict:
    """Parse delivery report."""
    print(f"[INFO] Parsing delivery report: {pdf_path}")
    
    result = {
        'business_date': None,
        'parsed_date': None,
        'deliveries': [],
        'last_updated': datetime.now().isoformat(),
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text() or ""
            full_text += text + "\n\n"
    
    # Extract business date
    date_match = re.search(r'BUSINESS DATE[:\s]*(\d{2}/\d{2}/\d{4})', full_text)
    if date_match:
        date_str = date_match.group(1)
        result['business_date'] = date_str
        parts = date_str.split('/')
        if len(parts) == 3:
            result['parsed_date'] = f"{parts[2]}-{parts[0]}-{parts[1]}"
    
    print(f"[INFO] Business Date: {result.get('business_date')}")
    
    # Split by CONTRACT sections
    sections = re.split(r'CONTRACT:', full_text)
    
    for section in sections[1:]:
        delivery = parse_delivery_section(section)
        if delivery:
            result['deliveries'].append(delivery)
            print(f"  {delivery['metal']}: Daily={delivery['daily_issued']:,}, MTD={delivery['month_to_date']:,}")
    
    return result


def parse_delivery_section(section: str) -> dict:
    """Parse a delivery contract section."""
    name_match = re.search(r'^([^\n]+)', section.strip())
    if not name_match:
        return None
    
    contract_name = name_match.group(1).strip()
    
    metal = None
    symbol = None
    if 'GOLD' in contract_name.upper():
        metal = 'Gold'
        symbol = 'GC'
    elif 'SILVER' in contract_name.upper():
        metal = 'Silver'
        symbol = 'SI'
    elif 'COPPER' in contract_name.upper():
        metal = 'Copper'
        symbol = 'HG'
    elif 'PLATINUM' in contract_name.upper():
        metal = 'Platinum'
        symbol = 'PL'
    elif 'PALLADIUM' in contract_name.upper():
        metal = 'Palladium'
        symbol = 'PA'
    else:
        return None
    
    # Contract month
    month_match = re.search(
        r'(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})',
        contract_name, re.IGNORECASE
    )
    contract_month = None
    if month_match:
        month_map = {
            'JANUARY': 'JAN', 'FEBRUARY': 'FEB', 'MARCH': 'MAR', 'APRIL': 'APR',
            'MAY': 'MAY', 'JUNE': 'JUN', 'JULY': 'JUL', 'AUGUST': 'AUG',
            'SEPTEMBER': 'SEP', 'OCTOBER': 'OCT', 'NOVEMBER': 'NOV', 'DECEMBER': 'DEC'
        }
        month = month_map.get(month_match.group(1).upper())
        year = month_match.group(2)[2:]
        contract_month = f"{month}{year}"
    
    # Settlement
    settle_match = re.search(r'SETTLEMENT[:\s]*([\d,]+\.?\d*)', section)
    settlement = float(settle_match.group(1).replace(',', '')) if settle_match else None
    
    # Delivery date
    delivery_date_match = re.search(r'DELIVERY DATE[:\s]*(\d{2}/\d{2}/\d{4})', section)
    delivery_date = delivery_date_match.group(1) if delivery_date_match else None
    
    # TOTAL
    total_match = re.search(r'TOTAL[:\s]*([\d,]+)\s+([\d,]+)', section)
    daily_issued = int(total_match.group(1).replace(',', '')) if total_match else 0
    daily_stopped = int(total_match.group(2).replace(',', '')) if total_match else 0
    
    # MONTH TO DATE
    mtd_match = re.search(r'MONTH TO DATE[:\s]*([\d,]+)', section)
    month_to_date = int(mtd_match.group(1).replace(',', '')) if mtd_match else 0
    
    # Firms
    firms = []
    firm_pattern = r'(\d{3})\s+([CH])\s+([A-Z][A-Z\s&,.\']+?)\s+(\d+)?\s*(\d+)?(?=\n|\d{3}\s+[CH]|$)'
    for match in re.finditer(firm_pattern, section):
        issued = int(match.group(4)) if match.group(4) else 0
        stopped = int(match.group(5)) if match.group(5) else 0
        if issued > 0 or stopped > 0:
            firms.append({
                'code': match.group(1),
                'org': match.group(2),
                'name': match.group(3).strip(),
                'issued': issued,
                'stopped': stopped,
            })
    
    return {
        'metal': metal,
        'symbol': symbol,
        'contract_name': contract_name,
        'contract_month': contract_month,
        'settlement': settlement,
        'delivery_date': delivery_date,
        'daily_issued': daily_issued,
        'daily_stopped': daily_stopped,
        'month_to_date': month_to_date,
        'firms': firms,
    }


def parse_volume_summary_pdf(pdf_path: str) -> dict:
    """Parse Section 02B volume summary."""
    print(f"[INFO] Parsing volume summary: {pdf_path}")
    
    result = {
        'bulletin_number': None,
        'date': None,
        'parsed_date': None,
        'products': [],
        'totals': {},
        'last_updated': datetime.now().isoformat(),
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text() or ""
            full_text += text + "\n\n"
    
    # Date
    date_match = re.search(
        r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})',
        full_text, re.IGNORECASE
    )
    if date_match:
        result['date'] = date_match.group(0).lower()
        month_map = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        month = month_map.get(date_match.group(2).lower(), 1)
        day = int(date_match.group(3))
        year = int(date_match.group(4))
        result['parsed_date'] = f"{year:04d}-{month:02d}-{day:02d}"
    
    bulletin_match = re.search(r'BULLETIN\s*#\s*(\d+)', full_text, re.IGNORECASE)
    if bulletin_match:
        result['bulletin_number'] = int(bulletin_match.group(1))
    
    print(f"[INFO] Bulletin #{result.get('bulletin_number')} - {result.get('date')}")
    
    # Products
    products_config = [
        ('MGC', 'MICRO GOLD FUTURES'),
        ('SIL', 'MICRO SILVER FUTURES'),
        ('GC', 'COMEX GOLD FUTURES'),
        ('1OZ', '1 OUNCE GOLD FUTURES'),
        ('SI', 'COMEX SILVER FUTURES'),
        ('HG', 'COMEX COPPER FUTURES'),
        ('MHG', 'COMEX MICRO COPPER FUTURES'),
        ('PL', 'NYMEX PLATINUM FUTURES'),
        ('QO', 'E-MINI GOLD FUTURES'),
        ('QI', 'E-MINI SILVER FUTURES'),
        ('PA', 'NYMEX PALLADIUM FUTURES'),
        ('ALI', 'COMEX PHYSICAL ALUMINUM FUTURES'),
        ('QC', 'COMEX E-MINI COPPER FUTURES'),
    ]
    
    for code, name in products_config:
        # Pattern for volume summary line
        pattern = rf'{code}\s+.*?\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*([+-]?\s*[\d,]+)\s+([\d,]+)\s+([\d,]+)'
        match = re.search(pattern, full_text)
        
        if match:
            product = {
                'symbol': code,
                'name': name,
                'globex_volume': int(match.group(1).replace(',', '')),
                'total_volume': int(match.group(2).replace(',', '')),
                'open_interest': int(match.group(3).replace(',', '')),
                'oi_change': int(match.group(4).replace(' ', '').replace(',', '')),
                'yoy_volume': int(match.group(5).replace(',', '')),
                'yoy_open_interest': int(match.group(6).replace(',', '')),
            }
            result['products'].append(product)
            print(f"  {code}: Vol={product['total_volume']:,}, OI={product['open_interest']:,}")
    
    return result


def sync_to_database(bulletin_data: dict, delivery_data: dict, database_url: str):
    """Sync data to database."""
    if not HAS_PSYCOPG2 or not database_url:
        print("[INFO] Database sync skipped")
        return
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Ensure tables exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bulletin_snapshots (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                product_name VARCHAR(100),
                total_volume BIGINT DEFAULT 0,
                total_open_interest BIGINT DEFAULT 0,
                total_oi_change INTEGER DEFAULT 0,
                front_month VARCHAR(10),
                front_month_settle DECIMAL(15, 4),
                front_month_change DECIMAL(15, 4),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, symbol)
            )
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS delivery_snapshots (
                id SERIAL PRIMARY KEY,
                metal VARCHAR(50) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                report_date DATE NOT NULL,
                contract_month VARCHAR(10),
                settlement_price DECIMAL(15, 6),
                daily_issued INTEGER DEFAULT 0,
                daily_stopped INTEGER DEFAULT 0,
                month_to_date INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(metal, report_date)
            )
        """)
        
        conn.commit()
        
        # Sync bulletin
        if bulletin_data and bulletin_data.get('parsed_date'):
            parsed_date = bulletin_data['parsed_date']
            saved = 0
            for product in bulletin_data.get('products', []):
                front = product['contracts'][0] if product.get('contracts') else None
                cur.execute("""
                    INSERT INTO bulletin_snapshots (
                        date, symbol, product_name, total_volume, total_open_interest,
                        total_oi_change, front_month, front_month_settle, front_month_change
                    ) VALUES (%s::date, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (date, symbol) DO UPDATE SET
                        total_volume = EXCLUDED.total_volume,
                        total_open_interest = EXCLUDED.total_open_interest,
                        total_oi_change = EXCLUDED.total_oi_change,
                        front_month = EXCLUDED.front_month,
                        front_month_settle = EXCLUDED.front_month_settle,
                        front_month_change = EXCLUDED.front_month_change,
                        created_at = CURRENT_TIMESTAMP
                """, (
                    parsed_date, product['symbol'], product['name'],
                    product['total_volume'], product['total_open_interest'],
                    product['total_oi_change'],
                    front['month'] if front else None,
                    front['settle'] if front else None,
                    front['change'] if front else None,
                ))
                saved += 1
            print(f"[OK] Synced {saved} bulletin products")
        
        # Sync delivery
        if delivery_data and delivery_data.get('parsed_date'):
            parsed_date = delivery_data['parsed_date']
            saved = 0
            for delivery in delivery_data.get('deliveries', []):
                cur.execute("""
                    INSERT INTO delivery_snapshots (
                        metal, symbol, report_date, contract_month,
                        settlement_price, daily_issued, daily_stopped, month_to_date
                    ) VALUES (%s, %s, %s::date, %s, %s, %s, %s, %s)
                    ON CONFLICT (metal, report_date) DO UPDATE SET
                        symbol = EXCLUDED.symbol,
                        contract_month = EXCLUDED.contract_month,
                        settlement_price = EXCLUDED.settlement_price,
                        daily_issued = EXCLUDED.daily_issued,
                        daily_stopped = EXCLUDED.daily_stopped,
                        month_to_date = EXCLUDED.month_to_date,
                        created_at = CURRENT_TIMESTAMP
                """, (
                    delivery['metal'], delivery['symbol'], parsed_date,
                    delivery['contract_month'], delivery['settlement'],
                    delivery['daily_issued'], delivery['daily_stopped'],
                    delivery['month_to_date'],
                ))
                saved += 1
            print(f"[OK] Synced {saved} delivery records")
        
        conn.commit()
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"[ERROR] Database error: {e}")


def main():
    print("=" * 70)
    print("  CME Reports Parser (pdfplumber) - February 4th, 2026")
    print("=" * 70)
    print()
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    load_dotenv(project_root / '.env')
    database_url = os.environ.get('DATABASE_URL')
    
    bulletin_data = None
    delivery_data = None
    volume_data = None
    
    # 1. Parse bulletin
    bulletin_pdf = project_root / 'Section62_Metals_Futures_Products.pdf'
    if bulletin_pdf.exists():
        bulletin_data = parse_bulletin_pdf(str(bulletin_pdf))
        with open(project_root / 'public' / 'bulletin.json', 'w') as f:
            json.dump(bulletin_data, f, indent=2)
        print(f"[OK] Saved bulletin.json")
    else:
        print(f"[WARNING] Not found: {bulletin_pdf}")
    
    print()
    
    # 2. Parse delivery
    delivery_pdf = project_root / 'MetalsIssuesAndStopsReport.pdf'
    if delivery_pdf.exists():
        delivery_data = parse_delivery_pdf(str(delivery_pdf))
        with open(project_root / 'public' / 'delivery.json', 'w') as f:
            json.dump(delivery_data, f, indent=2)
        print(f"[OK] Saved delivery.json")
    else:
        print(f"[WARNING] Not found: {delivery_pdf}")
    
    print()
    
    # 3. Parse volume summary
    volume_pdf = project_root / 'Section02B_Summary_Volume_And_Open_Interest_Metals_Futures_And_Options.pdf'
    if volume_pdf.exists():
        volume_data = parse_volume_summary_pdf(str(volume_pdf))
        with open(project_root / 'public' / 'volume_summary.json', 'w') as f:
            json.dump(volume_data, f, indent=2)
        print(f"[OK] Saved volume_summary.json")
    else:
        print(f"[WARNING] Not found: {volume_pdf}")
    
    print()
    
    # 4. Sync to database
    if database_url:
        print("[INFO] Syncing to database...")
        sync_to_database(bulletin_data, delivery_data, database_url)
    
    print()
    print("=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
