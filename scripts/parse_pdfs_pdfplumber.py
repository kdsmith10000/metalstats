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


def _strip_page_headers(text: str) -> str:
    """Remove repeated page headers/footers from concatenated PDF text.
    
    This strips the '62 METAL FUTURES PRODUCTS 62', 'Side XX', bulletin header,
    disclaimer, and copyright lines that appear on every page, so product
    sections that span page boundaries can be parsed as contiguous blocks.
    """
    lines = text.split('\n')
    cleaned = []
    skip_patterns = [
        re.compile(r'^62\s+METAL\s+FUTURES\s+PRODUCTS\s+62'),
        re.compile(r'^Side\s+\d+\s+Side\s+\d+'),
        re.compile(r'^\d{4}\s+DAILY\s+INFORMATION\s+BULLETIN'),
        re.compile(r'^CME\s+Group,\s+Inc\.'),
        re.compile(r'^20\s+South\s+Wacker'),
        re.compile(r'^Customer\s+Service:'),
        re.compile(r'^PRELIMINARY$'),
        re.compile(r'^PG62\s+BULLETIN'),
        re.compile(r'^THE\s+CME\s+GROUP\s+DAILY\s+BULLETIN'),
        re.compile(r'^PRIVATELY\s+NEGOTIATED'),
        re.compile(r'^TRADING\)\s+MAY\s+BE\s+AFFECTED'),
        re.compile(r'^EXERCISES\s+OR\s+ASSIGNMENTS'),
        re.compile(r'^PRICE\s+INDICATOR\s+KEY'),
        re.compile(r'^R=\s+RECORD\s+VOLUME'),
        re.compile(r'^THE\s+RTH\s+SESSION'),
        re.compile(r'^DAY\'S\s+SETTLEMENT'),
        re.compile(r'^FUTURES\s+PRODUCTS$'),
        re.compile(r'^GLOBEX$'),
        re.compile(r'^GLOBEX\s+OPEN\s+HIGH/LOW'),
        re.compile(r'^&\s+PT\.\s+CHGE'),
        re.compile(r'^NYMEX\s+METAL\s+FUTURES\s+PRODUCTS$'),
        re.compile(r'^THE\s+INFORMATION\s+CONTAINED'),
        re.compile(r'^IS\s+ACCEPTED\s+BY\s+THE\s+USER'),
        re.compile(r'^©\s+Copyright\s+CME'),
        re.compile(r'^METALS\s+CONTRACTS\s+LAST\s+TRADE'),
        re.compile(r'^EXPIRATION:'),
        re.compile(r'^EX-PIT\s+&\s+OTHER'),
        re.compile(r'^DELIVERY-------'),
        re.compile(r'^CASH\s+OR\s+PHY'),
        re.compile(r'^SETTLED\s+TOTALS'),
        re.compile(r'^TO-DATE$'),
    ]
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if any(p.match(stripped) for p in skip_patterns):
            continue
        cleaned.append(line)
    return '\n'.join(cleaned)


def _parse_contract_line(line: str) -> dict | None:
    """Parse a single contract line using right-to-left token extraction.
    
    Handles all observed formats including:
      - Full line: APR26 5084.30 5102.70/5011.00 5031.00 - 48.40 104137 1521 283581 + 399
      - No open/HL: FEB26 ---- ---- 5003.80 - 47.10 281 ---- 3885 - 164
      - UNCH change: OCT26 5161.25 5161.25/5161.25 5139.50 - 49.75 1 ---- 9 UNCH
      - NEW change:  JAN28 5401.00 5401.00/5401.00 5368.50 NEW 1 ---- 1 + 1
      - B/A suffix:  JUL26 3069.00 3085.50B/3069.00 3065.75 - 44.25 18 ---- 88 + 11
    """
    tokens = line.split()
    if len(tokens) < 5:
        return None
    
    # First token must be a month code: 3 uppercase letters + 2 digits
    if not re.match(r'^[A-Z]{3}\d{2}$', tokens[0]):
        return None
    
    month = tokens[0]
    idx = len(tokens) - 1
    
    try:
        # --- Parse from right to left ---
        
        # 1. OI change (rightmost): UNCH, or sign + number
        oi_change = 0
        if tokens[idx] == 'UNCH':
            idx -= 1
        elif idx >= 1 and tokens[idx - 1] in ('+', '-'):
            sign = 1 if tokens[idx - 1] == '+' else -1
            oi_change = sign * int(tokens[idx])
            idx -= 2
        
        # 2. Open interest (integer)
        open_interest = int(tokens[idx])
        idx -= 1
        
        # 3. PNT volume (integer or ----)
        pnt_volume = 0 if tokens[idx] == '----' else int(tokens[idx])
        idx -= 1
        
        # 4. Globex volume (integer or ----)
        globex_volume = 0 if tokens[idx] == '----' else int(tokens[idx])
        idx -= 1
        
        # 5. Price change: UNCH, NEW, sign + number, or single signed token
        change = 0.0
        if tokens[idx] in ('UNCH', 'NEW'):
            idx -= 1
        elif idx >= 1 and tokens[idx - 1] in ('+', '-'):
            sign = 1.0 if tokens[idx - 1] == '+' else -1.0
            change = sign * float(tokens[idx])
            idx -= 2
        elif re.match(r'^[+-][\d.]+$', tokens[idx]):
            # Single signed token (e.g. -0.00429)
            change = float(tokens[idx])
            idx -= 1
        
        # 6. Settle price (always present, decimal)
        settle_str = tokens[idx].rstrip('BA')
        settle = float(settle_str)
        
        return {
            'month': month,
            'settle': settle,
            'change': change,
            'globex_volume': globex_volume,
            'pnt_volume': pnt_volume,
            'open_interest': open_interest,
            'oi_change': oi_change,
        }
    except (ValueError, IndexError):
        return None


def _parse_total_line(line: str, code: str) -> dict | None:
    """Parse a TOTAL line for a product.
    
    Formats observed:
      TOTAL 1OZ FUT 78383 18635 + 132          → vol, OI, oi_change
      TOTAL GC FUT 122886 2275 407181 + 2735    → globex, pnt, OI, oi_change
      TOTAL ALA FUT 1455                        → OI only (no volume)
      TOTAL QI FUT 2382 1206 - 1                → vol, OI, oi_change
    """
    pattern = rf'TOTAL\s+{re.escape(code)}\s+FUT\s+(.*)'
    match = re.search(pattern, line)
    if not match:
        return None
    
    remainder = match.group(1).strip()
    tokens = remainder.split()
    
    if not tokens:
        return None
    
    # Parse OI change from the right
    oi_change = 0
    if len(tokens) >= 2 and tokens[-2] in ('+', '-'):
        sign = 1 if tokens[-2] == '+' else -1
        oi_change = sign * int(tokens[-1])
        tokens = tokens[:-2]
    elif tokens[-1] == 'UNCH':
        tokens = tokens[:-1]
    
    total_volume = 0
    total_oi = 0
    
    if len(tokens) == 1:
        # Just OI (no volume traded)
        total_oi = int(tokens[0])
    elif len(tokens) == 2:
        # vol, OI (no PNT breakdown)
        total_volume = int(tokens[0])
        total_oi = int(tokens[1])
    elif len(tokens) == 3:
        # globex_vol, pnt_vol, OI
        total_volume = int(tokens[0]) + int(tokens[1])
        total_oi = int(tokens[2])
    
    return {
        'total_volume': total_volume,
        'total_open_interest': total_oi,
        'total_oi_change': oi_change,
    }


def parse_bulletin_pdf(pdf_path: str) -> dict:
    """Parse Section 62 bulletin for open interest data using pdfplumber.
    
    Extracts text from all pages, strips page headers, then finds each
    product section between its header (SYMBOL FUT NAME) and TOTAL line.
    Contract lines are parsed with a robust right-to-left token approach.
    """
    print(f"[INFO] Parsing bulletin: {pdf_path}")
    
    result = {
        'bulletin_number': None,
        'date': None,
        'parsed_date': None,
        'products': [],
        'last_updated': datetime.now().isoformat(),
    }
    
    # 1. Extract full text from all pages
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text() or ""
            full_text += text + "\n"
    
    # 2. Parse header metadata
    bulletin_match = re.search(r'BULLETIN\s*#\s*(\d+)', full_text, re.IGNORECASE)
    if bulletin_match:
        result['bulletin_number'] = int(bulletin_match.group(1))
    
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
    
    # 3. Strip page headers/footers so multi-page products are contiguous
    cleaned_text = _strip_page_headers(full_text)
    
    # 4. Extract each target product
    products_config = [
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
        ('QI', 'E-MINI SILVER FUTURES'),
    ]
    
    for code, name in products_config:
        product = extract_product_data(cleaned_text, code, name)
        if product:
            result['products'].append(product)
            n = len(product['contracts'])
            front = product['contracts'][0] if product['contracts'] else None
            front_info = f", Front={front['month']} @ {front['settle']}" if front else ""
            print(f"  {code}: {n} contracts, Vol={product['total_volume']:,}, OI={product['total_open_interest']:,}, OI_Chg={product['total_oi_change']:+,}{front_info}")
    
    return result


def extract_product_data(text: str, code: str, name: str) -> dict | None:
    """Extract product data including all individual contracts.
    
    Finds the section between 'CODE FUT PRODUCT_NAME' and 'TOTAL CODE FUT',
    then parses every contract line and the total line.
    """
    product = {
        'symbol': code,
        'name': name,
        'contracts': [],
        'total_volume': 0,
        'total_open_interest': 0,
        'total_oi_change': 0,
    }
    
    # Find product section start: "CODE FUT PRODUCT_NAME"
    header_pattern = rf'{re.escape(code)}\s+FUT\s+{re.escape(name)}'
    header_match = re.search(header_pattern, text)
    if not header_match:
        # Try a more flexible match (name might differ slightly)
        header_pattern_flex = rf'{re.escape(code)}\s+FUT\s+'
        header_match = re.search(header_pattern_flex, text)
    
    if not header_match:
        return None
    
    start_idx = header_match.end()
    
    # Find TOTAL line for this product
    total_pattern = rf'TOTAL\s+{re.escape(code)}\s+FUT\s+'
    total_match = re.search(total_pattern, text[start_idx:])
    
    if not total_match:
        return None
    
    # Extract the section between header and TOTAL
    section_text = text[start_idx:start_idx + total_match.start()]
    total_line_start = start_idx + total_match.start()
    
    # Find end of TOTAL line
    total_line_end = text.find('\n', total_line_start)
    if total_line_end == -1:
        total_line_end = len(text)
    total_line = text[total_line_start:total_line_end].strip()
    
    # Parse individual contract lines
    for line in section_text.split('\n'):
        line = line.strip()
        if not line:
            continue
        contract = _parse_contract_line(line)
        if contract:
            # Avoid duplicates (same month)
            if not any(c['month'] == contract['month'] for c in product['contracts']):
                product['contracts'].append(contract)
    
    # Parse TOTAL line
    totals = _parse_total_line(total_line, code)
    if totals:
        product['total_volume'] = totals['total_volume']
        product['total_open_interest'] = totals['total_open_interest']
        product['total_oi_change'] = totals['total_oi_change']
    
    if product['total_volume'] > 0 or product['total_open_interest'] > 0 or product['contracts']:
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


def sync_to_database(bulletin_data: dict, delivery_data: dict, volume_data: dict, database_url: str):
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
        
        # Create open_interest_snapshots table (used for previous day comparison in Market Activity)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS open_interest_snapshots (
                id SERIAL PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                report_date DATE NOT NULL,
                open_interest BIGINT NOT NULL DEFAULT 0,
                oi_change INTEGER NOT NULL DEFAULT 0,
                total_volume BIGINT NOT NULL DEFAULT 0,
                settlement_price DECIMAL(15, 6),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(symbol, report_date)
            )
        """)
        
        # Create index for faster queries on open_interest_snapshots
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_oi_snapshots_symbol_date 
            ON open_interest_snapshots(symbol, report_date DESC)
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
            print(f"[OK] Synced {saved} bulletin products to bulletin_snapshots")
        
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
            print(f"[OK] Synced {saved} delivery records to delivery_snapshots")
        
        # Sync volume summary to open_interest_snapshots (critical for Market Activity comparison)
        if volume_data and volume_data.get('parsed_date'):
            parsed_date = volume_data['parsed_date']
            saved = 0
            for product in volume_data.get('products', []):
                cur.execute("""
                    INSERT INTO open_interest_snapshots (
                        symbol, report_date, open_interest, oi_change, total_volume
                    ) VALUES (%s, %s::date, %s, %s, %s)
                    ON CONFLICT (symbol, report_date) DO UPDATE SET
                        open_interest = EXCLUDED.open_interest,
                        oi_change = EXCLUDED.oi_change,
                        total_volume = EXCLUDED.total_volume,
                        created_at = CURRENT_TIMESTAMP
                """, (
                    product['symbol'], parsed_date,
                    product['open_interest'], product['oi_change'],
                    product['total_volume'],
                ))
                saved += 1
            print(f"[OK] Synced {saved} products to open_interest_snapshots")
        
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
        sync_to_database(bulletin_data, delivery_data, volume_data, database_url)
    
    print()
    print("=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
