"""
Parse CME Group Daily Bulletin Section 62 using pdftotext (no OCR needed).
Extracts volume, open interest, and settlement prices for all metals.
"""

import os
import re
import json
import subprocess
from datetime import datetime
from pathlib import Path

# Load environment variables
def load_env():
    env_paths = [
        Path(__file__).parent / '.env',
        Path(__file__).parent.parent / '.env',
    ]
    for env_file in env_paths:
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            print(f"[INFO] Loaded environment from {env_file}")
            break


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext with layout preservation."""
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', pdf_path, '-'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except FileNotFoundError:
        raise RuntimeError("pdftotext not found. Install poppler: brew install poppler")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"PDF text extraction failed: {e.stderr}")


def parse_header(text: str) -> dict:
    """Parse bulletin header for date and bulletin number."""
    result = {
        'bulletin_number': None,
        'date': None,
        'parsed_date': None,
    }
    
    # Find bulletin number: "BULLETIN # 18@" or "BULLETIN # 18"
    bulletin_match = re.search(r'BULLETIN\s*#\s*(\d+)', text, re.IGNORECASE)
    if bulletin_match:
        result['bulletin_number'] = int(bulletin_match.group(1))
    
    # Find date: "Wed, Jan 28, 2026"
    date_match = re.search(
        r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})',
        text, re.IGNORECASE
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
    
    return result


def parse_number(s: str) -> float:
    """Parse a number string, handling commas and special cases."""
    if not s or s == '----' or s == 'UNCH' or s == 'NEW':
        return None
    s = s.replace(',', '').replace('B', '').replace('A', '').strip()
    try:
        return float(s)
    except ValueError:
        return None


def parse_int(s: str) -> int:
    """Parse an integer string."""
    if not s or s == '----' or s == 'UNCH':
        return 0
    s = s.replace(',', '').strip()
    try:
        return int(float(s))
    except ValueError:
        return 0


def extract_product_section(text: str, product_code: str, product_name: str) -> dict:
    """Extract data for a specific product from the bulletin text."""
    product = {
        'symbol': product_code,
        'name': product_name,
        'contracts': [],
        'total_volume': 0,
        'total_open_interest': 0,
        'total_oi_change': 0,
    }
    
    # Find the section for this product
    # Pattern: "GC FUT               COMEX GOLD FUTURES"
    section_start = re.search(
        rf'^{product_code}\s+FUT\s+',
        text, re.MULTILINE | re.IGNORECASE
    )
    
    if not section_start:
        return None
    
    # Find the TOTAL line for this product
    total_pattern = rf'TOTAL\s+{product_code}\s+FUT\s+'
    total_match = re.search(total_pattern, text[section_start.start():], re.IGNORECASE)
    
    if not total_match:
        return None
    
    section_end = section_start.start() + total_match.end()
    section = text[section_start.start():section_end + 200]  # Include some extra for the total line
    
    # Parse contract lines
    # Format: MONTH  OPEN  HIGH/LOW  SETTLE +/- CHANGE  GLOBEX_VOL  PNT_VOL  OI  OI_CHG
    # Example: FEB26  5179.00  5415.20 /5154.80  5303.60 +   221.00  111417  637  40106  - 32438
    
    contract_pattern = re.compile(
        r'^([A-Z]{3}\d{2})\s+'  # Month (e.g., FEB26)
        r'([\d.,]+|----)\s+'    # Open
        r'([\d.,/BA\s]+|----)\s+'  # High/Low
        r'([\d.,]+)\s*'          # Settle
        r'([+-]?\s*[\d.,]+|UNCH|NEW)\s+'  # Change
        r'([\d,]+|----)\s+'      # Globex volume
        r'([\d,]+|----)\s+'      # PNT volume
        r'([\d,]+)\s*'           # Open Interest
        r'([+-]?\s*[\d,]+|UNCH)?',  # OI Change
        re.MULTILINE
    )
    
    for match in contract_pattern.finditer(section):
        month = match.group(1)
        settle = parse_number(match.group(4))
        change_str = match.group(5).replace(' ', '')
        
        if change_str in ['UNCH', 'NEW']:
            change = 0.0
        else:
            change = parse_number(change_str) or 0.0
        
        globex_vol = parse_int(match.group(6))
        pnt_vol = parse_int(match.group(7))
        oi = parse_int(match.group(8))
        
        oi_change_str = match.group(9)
        if oi_change_str:
            oi_change_str = oi_change_str.replace(' ', '')
            oi_change = parse_int(oi_change_str) if oi_change_str not in ['UNCH', ''] else 0
        else:
            oi_change = 0
        
        if settle is not None:
            product['contracts'].append({
                'month': month,
                'settle': settle,
                'change': change,
                'globex_volume': globex_vol,
                'pnt_volume': pnt_vol,
                'open_interest': oi,
                'oi_change': oi_change,
            })
    
    # Parse TOTAL line - handle variable formats
    # Format 1 (with PNT): TOTAL GC FUT  559285  7135  468067  - 20396
    # Format 2 (no PNT):   TOTAL SIL FUT  485896  36370  +  166
    
    # First try format with PNT volume (4 number groups)
    total_with_pnt = re.search(
        rf'TOTAL\s+{product_code}\s+FUT\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*([+-]?\s*[\d,]+)',
        section, re.IGNORECASE
    )
    
    # Also try format without PNT volume (3 number groups)  
    total_no_pnt = re.search(
        rf'TOTAL\s+{product_code}\s+FUT\s+([\d,]+)\s+([\d,]+)\s*([+-]?\s*[\d,]+)',
        section, re.IGNORECASE
    )
    
    if total_with_pnt:
        # Check if this is really 4 numbers or just 3 with change
        vol = parse_int(total_with_pnt.group(1))
        second = parse_int(total_with_pnt.group(2))
        third = parse_int(total_with_pnt.group(3))
        fourth_str = total_with_pnt.group(4).replace(' ', '')
        fourth = parse_int(fourth_str)
        
        # If third number is much larger than second, it's probably: vol, pnt, oi, change
        # GC: 559285, 7135, 468067, -20396 -> vol, pnt, oi, change
        # If second is comparable to third, check the change pattern
        if third > second * 10:  # OI is typically much larger than PNT
            product['total_volume'] = vol
            product['total_open_interest'] = third
            product['total_oi_change'] = fourth
        else:
            # Might be: vol, oi, change1, change2 - use the no_pnt match
            if total_no_pnt:
                product['total_volume'] = parse_int(total_no_pnt.group(1))
                product['total_open_interest'] = parse_int(total_no_pnt.group(2))
                product['total_oi_change'] = parse_int(total_no_pnt.group(3).replace(' ', ''))
    elif total_no_pnt:
        product['total_volume'] = parse_int(total_no_pnt.group(1))
        product['total_open_interest'] = parse_int(total_no_pnt.group(2))
        product['total_oi_change'] = parse_int(total_no_pnt.group(3).replace(' ', ''))
    
    # Sort contracts by volume (most active first)
    product['contracts'].sort(key=lambda x: x['globex_volume'] + x['pnt_volume'], reverse=True)
    
    return product


def parse_bulletin(pdf_path: str) -> dict:
    """Parse a CME bulletin PDF and return structured data."""
    print(f"[INFO] Parsing bulletin: {pdf_path}")
    
    # Extract text from PDF
    print("[INFO] Extracting text from PDF...")
    text = extract_pdf_text(pdf_path)
    
    # Parse header
    header = parse_header(text)
    print(f"[INFO] Bulletin #{header.get('bulletin_number')} - {header.get('date')}")
    
    # Define products to extract
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
    
    products = []
    for code, name in products_config:
        product = extract_product_section(text, code, name)
        if product and (product['total_volume'] > 0 or product['total_open_interest'] > 0):
            products.append(product)
            contract_count = len(product['contracts'])
            print(f"  {code}: Vol={product['total_volume']:,}, OI={product['total_open_interest']:,}, Contracts={contract_count}")
    
    print(f"[INFO] Found {len(products)} products")
    
    return {
        'bulletin_number': header.get('bulletin_number'),
        'date': header.get('date'),
        'parsed_date': header.get('parsed_date'),
        'products': products,
        'last_updated': datetime.now().isoformat(),
    }


def save_to_database(data: dict, database_url: str):
    """Save bulletin data to PostgreSQL database."""
    try:
        import psycopg2
    except ImportError:
        print("[WARNING] psycopg2 not installed. Skipping database save.")
        return
    
    if not database_url:
        print("[INFO] DATABASE_URL not set. Skipping database save.")
        return
    
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        parsed_date = data.get('parsed_date')
        if not parsed_date:
            print("[WARNING] No parsed date. Skipping database save.")
            return
        
        saved_count = 0
        
        for product in data.get('products', []):
            try:
                # Get front month data
                front_month = product['contracts'][0] if product['contracts'] else None
                
                cur.execute("""
                    INSERT INTO bulletin_snapshots (
                        date, symbol, product_name,
                        total_volume, total_open_interest, total_oi_change,
                        front_month, front_month_settle, front_month_change
                    ) VALUES (
                        %s::date, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (date, symbol) 
                    DO UPDATE SET
                        product_name = EXCLUDED.product_name,
                        total_volume = EXCLUDED.total_volume,
                        total_open_interest = EXCLUDED.total_open_interest,
                        total_oi_change = EXCLUDED.total_oi_change,
                        front_month = EXCLUDED.front_month,
                        front_month_settle = EXCLUDED.front_month_settle,
                        front_month_change = EXCLUDED.front_month_change,
                        created_at = CURRENT_TIMESTAMP
                """, (
                    parsed_date,
                    product['symbol'],
                    product['name'],
                    product['total_volume'],
                    product['total_open_interest'],
                    product['total_oi_change'],
                    front_month['month'] if front_month else None,
                    front_month['settle'] if front_month else None,
                    front_month['change'] if front_month else None,
                ))
                saved_count += 1
            except Exception as e:
                print(f"  [WARNING] Error saving {product['symbol']}: {e}")
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"[OK] Saved {saved_count} products to database")
        
    except Exception as e:
        print(f"[ERROR] Database error: {e}")


def main():
    import sys
    
    print("=" * 70)
    print("  CME Group Daily Bulletin Parser (Text-based, no OCR)")
    print("=" * 70)
    print()
    
    # Load environment
    load_env()
    
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = str(project_root / 'data' / 'Section62_Metals_Futures_Products.pdf')
    
    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        sys.exit(1)
    
    # Parse the bulletin
    data = parse_bulletin(pdf_path)
    
    # Save to JSON
    output_file = project_root / 'public' / 'bulletin.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"[OK] Saved bulletin data to {output_file}")
    
    # Save to database
    database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
    save_to_database(data, database_url)
    
    print()
    print("=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
