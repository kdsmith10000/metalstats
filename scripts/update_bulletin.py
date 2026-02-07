"""
Parse CME Group Daily Bulletin Section 62 (Metal Futures Products) from PDF text.
Extracts volume, open interest, and settlement prices for key metals.
"""

import json
import re
import os
import subprocess
from datetime import datetime
from pathlib import Path

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


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext."""
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', pdf_path, '-'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except FileNotFoundError:
        print("[WARNING] pdftotext not found. Trying alternate method...")
        # Fallback: try using PyPDF2 or similar
        try:
            import PyPDF2
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except ImportError:
            raise RuntimeError("Install pdftotext (poppler) or PyPDF2 to parse PDFs")


def parse_bulletin_header(text: str) -> dict:
    """Parse bulletin header to extract date and bulletin number."""
    result = {
        'bulletin_number': None,
        'date': None,
        'parsed_date': None,
    }
    
    # Find bulletin number: "BULLETIN # 13@" or "BULLETIN # 13"
    bulletin_match = re.search(r'BULLETIN\s*#\s*(\d+)', text, re.IGNORECASE)
    if bulletin_match:
        result['bulletin_number'] = int(bulletin_match.group(1))
    
    # Find date: "Wed, Jan 21, 2026" or "PG62 Wed, Jan 21, 2026"
    date_patterns = [
        r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})',
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text, re.IGNORECASE)
        if date_match:
            result['date'] = date_match.group(0).lower()
            # Parse to ISO format
            try:
                month_map = {
                    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                }
                month = month_map.get(date_match.group(2).lower()[:3], 1)
                day = int(date_match.group(3))
                year = int(date_match.group(4))
                result['parsed_date'] = f"{year:04d}-{month:02d}-{day:02d}"
            except (ValueError, IndexError):
                pass
            break
    
    return result


def parse_product_totals(text: str) -> dict:
    """Parse product lines for each product to get volume and OI."""
    products = {}
    
    # Section02B format varies by PDF extraction method
    # PyPDF2 format (symbol at END of line):
    # 79247	MICRO GOLD FUTURES 946168 - 2832	946168 37318	146334	MGC
    # 531609	COMEX GOLD FUTURES 655762 - 7555	640341 583174	337585	15421	GC
    # pdftotext format (symbol at START of line):
    # MGC MICRO GOLD FUTURES ... 557540 82478 + 4481
    
    product_configs = [
        ('1OZ', '1 OUNCE GOLD FUTURES'),
        ('GC', 'COMEX GOLD FUTURES'),
        ('SI', 'COMEX SILVER FUTURES'),
        ('SIL', 'MICRO SILVER FUTURES'),
        ('HG', 'COMEX COPPER FUTURES'),
        ('PL', 'NYMEX PLATINUM FUTURES'),
        ('PA', 'NYMEX PALLADIUM FUTURES'),
        ('ALI', 'COMEX PHYSICAL ALUMINUM FUTURES'),
        ('MGC', 'MICRO GOLD FUTURES'),
        ('MHG', 'COMEX MICRO COPPER FUTURES'),
        ('QO', 'E-MINI GOLD FUTURES'),
        ('QI', 'E-MINI SILVER FUTURES'),
    ]
    
    for symbol, name in product_configs:
        # Try PyPDF2 format first (symbol at end of line)
        # Format: VOLUME NAME OI SIGN OI_CHANGE ... SYMBOL
        # Example: 531609	COMEX GOLD FUTURES 655762 - 7555	640341 583174	337585	15421	GC
        # Note: sometimes the sign is attached to the number: -14103 instead of - 14103
        pattern = rf'(\d+)\s+{re.escape(name)}\s+(\d+)\s+([+-])\s*(\d+).*?{symbol}\b'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                total_volume = int(match.group(1))
                total_oi = int(match.group(2))
                sign = match.group(3)
                oi_change = int(match.group(4))
                if sign == '-':
                    oi_change = -oi_change
                
                products[symbol] = {
                    'symbol': symbol,
                    'name': name,
                    'contracts': [],
                    'total_volume': total_volume,
                    'total_open_interest': total_oi,
                    'total_oi_change': oi_change,
                }
                continue
            except (ValueError, IndexError):
                pass
        
        # Try pdftotext format (symbol at start of line)
        # Pattern: SYMBOL NAME ... numbers ... COMBINED_VOL OI SIGN OI_CHANGE
        pattern = rf'^{symbol}\s+.*?(\d+)\s+(\d+)\s+([+-])\s+(\d+)'
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            try:
                total_volume = int(match.group(1))
                total_oi = int(match.group(2))
                sign = match.group(3)
                oi_change = int(match.group(4))
                if sign == '-':
                    oi_change = -oi_change
                
                products[symbol] = {
                    'symbol': symbol,
                    'name': name,
                    'contracts': [],
                    'total_volume': total_volume,
                    'total_open_interest': total_oi,
                    'total_oi_change': oi_change,
                }
                continue
            except (ValueError, IndexError):
                pass
        
        # Fallback to Section62 format (TOTAL lines)
        pattern = rf'TOTAL\s+{symbol}\s+FUT\s+(\d+)\s+(?:\d+\s+)?(\d+)\s+([+-])\s+(\d+)'
        match = re.search(pattern, text)
        if match:
            try:
                total_volume = int(match.group(1))
                total_oi = int(match.group(2))
                sign = match.group(3)
                oi_change = int(match.group(4))
                if sign == '-':
                    oi_change = -oi_change
                
                products[symbol] = {
                    'symbol': symbol,
                    'name': name,
                    'contracts': [],
                    'total_volume': total_volume,
                    'total_open_interest': total_oi,
                    'total_oi_change': oi_change,
                }
            except (ValueError, IndexError):
                continue
    
    return products


def parse_contracts(text: str, products: dict) -> dict:
    """Parse individual contract data for each product."""
    
    # Contract line patterns - different products have different formats
    # Format: MONTH +/- VOLUME CHANGE SETTLE HIGH/LOW OI OI_CHANGE OPEN ---
    # Example: FEB26 + 131092	71.75	4837.50	4890.75 /4756.75 16336 + 773	4768.75 ----
    
    # For 1OZ Gold: FEB26 + 131092	71.75	4837.50	...
    contract_pattern = r'([A-Z]{3})(\d{2})\s+([+-]?)\s*(\d+)\s+([\d.]+)\s+([\d.]+)'
    
    for match in re.finditer(contract_pattern, text):
        try:
            month = match.group(1) + match.group(2)
            sign = match.group(3)
            volume = int(match.group(4))
            change = float(match.group(5))
            settle = float(match.group(6))
            
            if sign == '-':
                change = -change
            
            # Find which product this belongs to by looking at context
            # For now, just store the raw contract data
            contract = {
                'month': month,
                'settle': settle,
                'change': change,
                'globex_volume': volume,
                'pnt_volume': 0,
                'oi_change': 0,
            }
            
        except (ValueError, IndexError):
            continue
    
    return products


def parse_1oz_gold_contracts(text: str) -> list:
    """Parse 1OZ Gold futures contracts."""
    contracts = []
    
    # Find the 1OZ FUT section
    section_match = re.search(r'1OZ FUT.*?TOTAL 1OZ FUT', text, re.DOTALL | re.IGNORECASE)
    if not section_match:
        return contracts
    
    section = section_match.group(0)
    
    # Pattern for 1oz lines: FEB26 + 131092	71.75	4837.50	...
    pattern = r'([A-Z]{3})(\d{2})\s+([+-])\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d./BA\s]+)\s+(\d+)\s+([+-])\s*(\d+)'
    
    for match in re.finditer(pattern, section):
        try:
            month = match.group(1) + match.group(2)
            sign = match.group(3)
            volume = int(match.group(4))
            change = float(match.group(5))
            if sign == '-':
                change = -change
            settle = float(match.group(6))
            oi = int(match.group(8))
            oi_sign = match.group(9)
            oi_change = int(match.group(10))
            if oi_sign == '-':
                oi_change = -oi_change
            
            contracts.append({
                'month': month,
                'settle': settle,
                'change': change,
                'globex_volume': volume,
                'pnt_volume': 0,
                'open_interest': oi,
                'oi_change': oi_change,
            })
        except (ValueError, IndexError):
            continue
    
    # Sort by volume descending
    contracts.sort(key=lambda x: x['globex_volume'], reverse=True)
    return contracts


def parse_gc_contracts(text: str) -> list:
    """Parse GC (COMEX Gold) futures contracts."""
    contracts = []
    
    # Find the GC FUT section
    section_match = re.search(r'GC FUT COMEX GOLD FUTURES.*?TOTAL GC FUT', text, re.DOTALL | re.IGNORECASE)
    if not section_match:
        return contracts
    
    section = section_match.group(0)
    
    # Pattern for GC lines: JAN26 + 1706	72.20	4831.80	4872.30 /4771.50 1801 + 1518	4863.50 ----
    pattern = r'([A-Z]{3})(\d{2})\s+([+-])\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d./BA\s]+)\s+(\d+)\s+([+-])\s*(\d+)'
    
    for match in re.finditer(pattern, section):
        try:
            month = match.group(1) + match.group(2)
            sign = match.group(3)
            volume = int(match.group(4))
            change = float(match.group(5))
            if sign == '-':
                change = -change
            settle = float(match.group(6))
            oi = int(match.group(8))
            oi_sign = match.group(9)
            oi_change = int(match.group(10))
            if oi_sign == '-':
                oi_change = -oi_change
            
            contracts.append({
                'month': month,
                'settle': settle,
                'change': change,
                'globex_volume': volume,
                'pnt_volume': 0,
                'open_interest': oi,
                'oi_change': oi_change,
            })
        except (ValueError, IndexError):
            continue
    
    contracts.sort(key=lambda x: x['globex_volume'], reverse=True)
    return contracts


def parse_hg_contracts(text: str) -> list:
    """Parse HG (COMEX Copper) futures contracts."""
    contracts = []
    
    section_match = re.search(r'HG FUT COMEX COPPER FUTURES.*?TOTAL HG FUT', text, re.DOTALL | re.IGNORECASE)
    if not section_match:
        return contracts
    
    section = section_match.group(0)
    
    # Copper has different price format (5 decimal places)
    pattern = r'([A-Z]{3})(\d{2})\s+([+-])\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d./BA\s]+)\s+(\d+)\s+([+-])\s*(\d+)'
    
    for match in re.finditer(pattern, section):
        try:
            month = match.group(1) + match.group(2)
            sign = match.group(3)
            volume = int(match.group(4))
            change = float(match.group(5))
            if sign == '-':
                change = -change
            settle = float(match.group(6))
            oi = int(match.group(8))
            oi_sign = match.group(9)
            oi_change = int(match.group(10))
            if oi_sign == '-':
                oi_change = -oi_change
            
            contracts.append({
                'month': month,
                'settle': settle,
                'change': change,
                'globex_volume': volume,
                'pnt_volume': 0,
                'open_interest': oi,
                'oi_change': oi_change,
            })
        except (ValueError, IndexError):
            continue
    
    contracts.sort(key=lambda x: x['globex_volume'], reverse=True)
    return contracts


def build_bulletin_data(text: str) -> dict:
    """Build complete bulletin data structure."""
    
    # Parse header
    header = parse_bulletin_header(text)
    
    # Parse product totals
    products = parse_product_totals(text)
    
    # Add contract details for key products
    if '1OZ' in products:
        products['1OZ']['contracts'] = parse_1oz_gold_contracts(text)
    
    if 'GC' in products:
        products['GC']['contracts'] = parse_gc_contracts(text)
    
    if 'HG' in products:
        products['HG']['contracts'] = parse_hg_contracts(text)
    
    return {
        'bulletin_number': header.get('bulletin_number'),
        'date': header.get('date'),
        'parsed_date': header.get('parsed_date'),
        'products': list(products.values()),
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
        
        # Create table if not exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bulletin_snapshots (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                product_name VARCHAR(255),
                total_volume INTEGER DEFAULT 0,
                total_open_interest INTEGER DEFAULT 0,
                total_oi_change INTEGER DEFAULT 0,
                front_month VARCHAR(10),
                front_month_settle DECIMAL(20, 6),
                front_month_change DECIMAL(20, 6),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, symbol)
            )
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_bulletin_date_symbol 
            ON bulletin_snapshots(date, symbol)
        """)
        
        conn.commit()
        
        parsed_date = data.get('parsed_date')
        if not parsed_date:
            print("[WARNING] No parsed date. Skipping database save.")
            return
        
        saved_count = 0
        
        for product in data.get('products', []):
            try:
                front_month = None
                front_settle = None
                front_change = None
                
                if product.get('contracts'):
                    front = product['contracts'][0]
                    front_month = front.get('month')
                    front_settle = front.get('settle')
                    front_change = front.get('change')
                
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
                    front_month,
                    front_settle,
                    front_change,
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


def parse_section62_contracts(text: str) -> dict:
    """Parse contract details from Section 62 PDF text."""
    products = {}
    
    # Product symbols to look for
    product_configs = [
        ('1OZ', '1 OUNCE GOLD FUTURES', '1OZ FUT'),
        ('GC', 'COMEX GOLD FUTURES', 'GC FUT'),
        ('SI', 'COMEX SILVER FUTURES', 'SI FUT'),
        ('SIL', 'MICRO SILVER FUTURES', 'SIL FUT'),
        ('HG', 'COMEX COPPER FUTURES', 'HG FUT'),
        ('PL', 'NYMEX PLATINUM FUTURES', 'PL FUT'),
        ('PA', 'NYMEX PALLADIUM FUTURES', 'PA FUT'),
        ('ALI', 'COMEX PHYSICAL ALUMINUM FUTURES', 'ALI FUT'),
        ('MGC', 'MICRO GOLD FUTURES', 'MGC FUT'),
        ('MHG', 'COMEX MICRO COPPER FUTURES', 'MHG FUT'),
        ('QO', 'E-MINI GOLD FUTURES', 'QO FUT'),
        ('QI', 'E-MINI SILVER FUTURES', 'QI FUT'),
    ]
    
    for symbol, name, section_header in product_configs:
        # Find the section for this product
        # Pattern: "SYMBOL FUT PRODUCT_NAME" followed by contract lines until "TOTAL SYMBOL FUT"
        section_pattern = rf'{re.escape(section_header)}\s+{re.escape(name)}(.*?)TOTAL\s+{re.escape(section_header)}'
        section_match = re.search(section_pattern, text, re.DOTALL | re.IGNORECASE)
        
        if not section_match:
            continue
        
        section = section_match.group(1)
        contracts = []
        
        # Contract line pattern for Section 62 (pdftotext -layout format):
        # MONTH   OPEN(or ----)   HIGH/LOW(or ----)   SETTLE [+-] CHANGE   VOLUME(or ----)   PNT(or ----)   OI   [+-] OI_CHANGE(or UNCH)
        # Example: FEB26                        3007.25             3008.00 /3007.25        3004.00 +   78.75                        3           ----                 5    -       2
        # Example: NOV26                        ----                ----                    3097.00 +   67.00                     ----           ----               282         UNCH

        contract_pattern = r'([A-Z]{3}\d{2})\s+(?:[\d.]+[BA]?|----)\s+(?:[\d.]+[BA]?\s*/[\d.]+[BA]?|----)\s+([\d.]+)\s+([+-])\s+([\d.]+)\s+([\d]+|----)\s+([\d]+|----)\s+([\d]+)\s+(?:([+-])\s*(\d+)|UNCH)'

        for match in re.finditer(contract_pattern, section):
            try:
                month = match.group(1)
                settle = float(match.group(2))
                sign = match.group(3)
                change = float(match.group(4))
                if sign == '-':
                    change = -change

                volume = 0 if match.group(5) == '----' else int(match.group(5))
                pnt_vol = 0 if match.group(6) == '----' else int(match.group(6))
                oi = int(match.group(7))

                oi_change = 0
                if match.group(8) and match.group(9):
                    oi_change = int(match.group(9))
                    if match.group(8) == '-':
                        oi_change = -oi_change

                contracts.append({
                    'month': month,
                    'settle': settle,
                    'change': change,
                    'globex_volume': volume,
                    'pnt_volume': pnt_vol,
                    'oi_change': oi_change,
                })
            except (ValueError, IndexError):
                continue
        
        # Sort by volume descending (front month usually has most volume)
        contracts.sort(key=lambda x: x['globex_volume'], reverse=True)
        
        # Get totals from TOTAL line
        # Format: TOTAL SYMBOL FUT   VOLUME   [PNT_VOL]   OI   [+-] OI_CHANGE
        # Example: TOTAL GC FUT                 203692           4287            403239    +    2287
        # Example: TOTAL     ALI FUT              1117                             2387    -      25
        total_oi = 0
        total_volume = 0
        total_oi_change = 0

        total_pattern = rf'TOTAL\s+{re.escape(section_header)}\s+(\d+).*?(\d+)\s+([+-])\s*(\d+)'
        for line in text.split('\n'):
            if 'TOTAL' in line and section_header in line:
                total_match = re.search(total_pattern, line, re.IGNORECASE)
                if total_match:
                    total_volume = int(total_match.group(1))
                    total_oi = int(total_match.group(2))
                    total_oi_change = int(total_match.group(4))
                    if total_match.group(3) == '-':
                        total_oi_change = -total_oi_change
                    break
        
        if contracts:
            products[symbol] = {
                'symbol': symbol,
                'name': name,
                'contracts': contracts[:10],  # Top 10 contracts by volume
                'total_volume': total_volume,
                'total_open_interest': total_oi,
                'total_oi_change': total_oi_change,
            }
    
    return products


def main():
    print("=" * 70)
    print("  CME Group Daily Bulletin Parser")
    print("=" * 70)
    print()
    
    # Load environment
    load_env()
    
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_file = project_root / 'public' / 'bulletin.json'
    
    # Check for both PDFs - Section 62 has contract details, Section 02B has summaries
    section62_path = project_root / 'data' / 'Section62_Metals_Futures_Products.pdf'
    section02b_path = project_root / 'data' / 'Section02B_Summary_Volume_And_Open_Interest_Metals_Futures_And_Options.pdf'
    
    # Prefer Section 62 for contract details
    if section62_path.exists():
        print(f"[INFO] Parsing Section 62: {section62_path}")
        text = extract_pdf_text(str(section62_path))
        
        # Parse header
        header = parse_bulletin_header(text)
        
        # Parse contracts from Section 62
        products = parse_section62_contracts(text)
        
        # If Section 02B also exists, use it for more accurate totals
        if section02b_path.exists():
            print(f"[INFO] Also parsing Section 02B for totals: {section02b_path}")
            text_02b = extract_pdf_text(str(section02b_path))
            totals = parse_product_totals(text_02b)
            
            # Merge totals into products
            for symbol, total_data in totals.items():
                if symbol in products:
                    products[symbol]['total_volume'] = total_data['total_volume']
                    products[symbol]['total_open_interest'] = total_data['total_open_interest']
                    products[symbol]['total_oi_change'] = total_data['total_oi_change']
                else:
                    products[symbol] = total_data
        
        data = {
            'bulletin_number': header.get('bulletin_number'),
            'date': header.get('date'),
            'parsed_date': header.get('parsed_date'),
            'products': list(products.values()),
            'last_updated': datetime.now().isoformat(),
        }
    elif section02b_path.exists():
        print(f"[INFO] Parsing Section 02B: {section02b_path}")
        text = extract_pdf_text(str(section02b_path))
        data = build_bulletin_data(text)
    else:
        print(f"[ERROR] No bulletin PDF found in data/")
        print(f"  Looked for: Section62_Metals_Futures_Products.pdf, Section02B_*.pdf")
        return
    
    print(f"[INFO] Bulletin #{data.get('bulletin_number')} - {data.get('date')}")
    print(f"[INFO] Found {len(data.get('products', []))} products")
    
    for product in data.get('products', []):
        contracts_count = len(product.get('contracts', []))
        front = product.get('contracts', [{}])[0] if product.get('contracts') else {}
        settle = front.get('settle', 'N/A')
        print(f"  {product['symbol']}: Vol={product['total_volume']:,}, OI={product['total_open_interest']:,}, OI Chg={product['total_oi_change']:+,}, Contracts={contracts_count}, Settle={settle}")
    
    # Save to JSON
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n[OK] Saved bulletin data to {output_file}")
    
    # Save to database
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print("\n[INFO] Syncing to database...")
        save_to_database(data, database_url)
    
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
