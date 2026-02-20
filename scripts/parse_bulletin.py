"""
Parse CME Group Daily Bulletin Section 62 (Metal Futures Products) using pdftotext.
Extracts volume, open interest, and settlement prices for all metals.
"""

import os
import re
import json
import subprocess
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')


PRODUCT_CONFIGS = {
    'GC':  {'name': 'COMEX GOLD FUTURES',              'header': r'^GC FUT\s+COMEX GOLD FUTURES',                'total': r'TOTAL\s+GC\s+FUT'},
    '1OZ': {'name': '1 OUNCE GOLD FUTURES',            'header': r'^1OZ FUT\s+1 OUNCE GOLD FUTURES',            'total': r'TOTAL\s+1OZ\s+FUT'},
    'SI':  {'name': 'COMEX SILVER FUTURES',             'header': r'^SI FUT\s+COMEX SILVER FUTURES',             'total': r'TOTAL\s+SI\s+FUT'},
    'SIL': {'name': '5000 OZ SILVER FUTURES',           'header': r'^SIL FUT\s+MICRO SILVER FUTURES',            'total': r'TOTAL\s+SIL\s+FUT'},
    'HG':  {'name': 'COMEX COPPER FUTURES',             'header': r'^HG FUT\s+COMEX COPPER FUTURES',             'total': r'TOTAL\s+HG\s+FUT'},
    'PL':  {'name': 'NYMEX PLATINUM FUTURES',           'header': r'^PL FUT\s+NYMEX PLATINUM FUTURES',           'total': r'TOTAL\s+PL\s+FUT'},
    'PA':  {'name': 'NYMEX PALLADIUM FUTURES',          'header': r'^PA FUT\s+NYMEX PALLADIUM FUTURES',          'total': r'TOTAL\s+PA\s+FUT'},
    'ALI': {'name': 'COMEX PHYSICAL ALUMINUM FUTURES',  'header': r'^ALI FUT\s+COMEX PHYSICAL ALUMINUM FUTURES', 'total': r'TOTAL\s+ALI\s+FUT'},
}


def pdf_to_text(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext with layout preservation."""
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', pdf_path, '-'],
            capture_output=True, text=True, check=True
        )
        return result.stdout
    except FileNotFoundError:
        raise RuntimeError("pdftotext not found. Install poppler: brew install poppler")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"pdftotext failed: {e.stderr}")


def parse_bulletin_header(text: str) -> dict:
    """Extract bulletin number and date from the header."""
    result = {'bulletin_number': None, 'date': None, 'parsed_date': None}

    m = re.search(r'BULLETIN\s*#\s*(\d+)', text, re.IGNORECASE)
    if m:
        result['bulletin_number'] = int(m.group(1))

    m = re.search(
        r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})',
        text, re.IGNORECASE
    )
    if m:
        result['date'] = m.group(0)
        month_map = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,
                     'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
        month = month_map.get(m.group(2).lower()[:3], 1)
        result['parsed_date'] = f"{int(m.group(4)):04d}-{month:02d}-{int(m.group(3)):02d}"

    return result


def extract_product_section(full_text: str, header_re: str, total_re: str) -> str | None:
    """Slice the text between a product header and its TOTAL line."""
    hm = re.search(header_re, full_text, re.MULTILINE)
    if not hm:
        return None
    start = hm.start()
    tm = re.search(total_re, full_text[start:], re.IGNORECASE)
    if not tm:
        return full_text[start:]
    return full_text[start:start + tm.end() + 200]


def parse_contracts(section: str) -> list[dict]:
    """Parse individual contract rows from a product section."""
    contracts = []
    # Match lines like:
    #   FEB26   5014.70   5014.70 /4984.20A   4975.90 -  10.60   37   ----   4403  -  375
    #   SEP26   ----      ----                 5088.00 - 11.60   ----  ----     59      UNCH
    line_re = re.compile(
        r'^\s*([A-Z]{3}\d{2})\s+'       # month
        r'(?:[\d.]+|----)\s+'            # open (skip)
        r'(?:.*?)\s+'                    # high/low (skip, greedy to settle)
        r'([\d.]+)\s+'                   # settle
        r'([+-])\s*([\d.]+|UNCH|NEW)\s+' # change sign + value
        r'([\d]+|----)\s+'               # globex volume
        r'([\d]+|----)\s+'               # pnt volume
        r'([\d]+|----)'                  # open interest
        r'(?:\s+([+-])\s*([\d]+|UNCH))?', # oi change (optional)
        re.MULTILINE
    )

    # Simpler pattern for lines where open/high/low are all ----
    simple_re = re.compile(
        r'^\s*([A-Z]{3}\d{2})\s+'
        r'----\s+----\s+'
        r'([\d.]+)\s+'
        r'([+-])\s*([\d.]+|UNCH|NEW)\s+'
        r'([\d]+|----)\s+'
        r'([\d]+|----)\s+'
        r'([\d]+|----)'
        r'(?:\s+([+-])\s*([\d]+|UNCH))?',
        re.MULTILINE
    )

    # Full pattern for lines with open/high/low data
    full_re = re.compile(
        r'^\s*([A-Z]{3}\d{2})\s+'
        r'[\d.]+\s+'                        # open
        r'[\d.]+[BA]?\s*/\s*[\d.]+[BA]?\s+' # high/low
        r'([\d.]+)\s+'                       # settle
        r'([+-])\s*([\d.]+|UNCH|NEW)\s+'     # change
        r'([\d]+|----)\s+'                   # globex vol
        r'([\d]+|----)\s+'                   # pnt vol
        r'([\d]+|----)'                      # OI
        r'(?:\s+([+-])\s*([\d]+|UNCH))?',    # oi change
        re.MULTILINE
    )

    seen = set()
    for regex in [full_re, simple_re]:
        for m in regex.finditer(section):
            month = m.group(1)
            if month in seen:
                continue
            seen.add(month)
            try:
                settle = float(m.group(2))
                sign = m.group(3)
                chg_val = m.group(4)
                if chg_val in ('UNCH', 'NEW'):
                    change = 0.0
                else:
                    change = float(chg_val) * (1 if sign == '+' else -1)

                gvol = 0 if m.group(5) == '----' else int(m.group(5))
                pvol = 0 if m.group(6) == '----' else int(m.group(6))
                oi   = 0 if m.group(7) == '----' else int(m.group(7))

                oi_chg = 0
                if m.lastindex and m.lastindex >= 9 and m.group(9) and m.group(9) not in ('UNCH', ''):
                    oi_sign = m.group(8)
                    oi_chg = int(m.group(9)) * (1 if oi_sign == '+' else -1)

                contracts.append({
                    'month': month,
                    'settle': settle,
                    'change': change,
                    'globex_volume': gvol,
                    'pnt_volume': pvol,
                    'open_interest': oi,
                    'oi_change': oi_chg,
                })
            except (ValueError, IndexError):
                continue

    # Sort by contract date
    month_map = {'JAN':1,'FEB':2,'MAR':3,'APR':4,'MAY':5,'JUN':6,
                 'JUL':7,'AUG':8,'SEP':9,'OCT':10,'NOV':11,'DEC':12}
    def sort_key(c):
        mon = c['month'][:3]
        yr = int(c['month'][3:]) + 2000
        return yr * 100 + month_map.get(mon, 0)
    contracts.sort(key=sort_key)

    return contracts


def parse_total_line(section: str, total_re: str) -> tuple[int, int, int]:
    """Extract total volume, OI, and OI change from the TOTAL line."""
    m = re.search(
        total_re + r'\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)(?:\s+([+-])\s*([\d,]+))?',
        section, re.IGNORECASE
    )
    if not m:
        m = re.search(
            total_re + r'\s+([\d]+)\s+(?:[\d]+\s+)?([\d]+)\s+([+-])\s*([\d]+)',
            section, re.IGNORECASE
        )
        if m:
            return int(m.group(1)), int(m.group(2)), int(m.group(4)) * (1 if m.group(3) == '+' else -1)
        # Try simpler: TOTAL XX FUT  vol  oi
        m2 = re.search(total_re + r'\s+([\d]+)\s+([\d]+)', section, re.IGNORECASE)
        if m2:
            return int(m2.group(1)), int(m2.group(2)), 0
        return 0, 0, 0

    vol = int(m.group(1).replace(',', ''))
    # Group 2 could be pnt_volume, group 3 the OI
    g2 = int(m.group(2).replace(',', ''))
    g3 = int(m.group(3).replace(',', ''))

    if m.lastindex and m.lastindex >= 5 and m.group(5):
        oi_chg = int(m.group(5).replace(',','')) * (1 if m.group(4) == '+' else -1)
        return vol, g3, oi_chg
    return vol, g2, g3


def parse_all_products(full_text: str) -> list[dict]:
    """Parse every configured product from the full PDF text."""
    products = []

    for symbol, cfg in PRODUCT_CONFIGS.items():
        section = extract_product_section(full_text, cfg['header'], cfg['total'])
        if not section:
            continue

        contracts = parse_contracts(section)

        # Parse the TOTAL line for accurate totals
        total_m = re.search(
            cfg['total'] + r'(.+)', section, re.IGNORECASE
        )
        total_vol, total_oi, total_oi_chg = 0, 0, 0
        if total_m:
            nums = re.findall(r'[+-]?\s*\d+', total_m.group(1))
            nums = [int(n.replace(' ', '')) for n in nums]
            if len(nums) >= 2:
                total_vol = nums[0]
                if len(nums) >= 4:
                    total_oi = nums[2]
                    total_oi_chg = nums[3] if len(nums) >= 4 else 0
                elif len(nums) == 3:
                    total_oi = nums[1]
                    total_oi_chg = nums[2]
                else:
                    total_oi = nums[1]

        product = {
            'symbol': symbol,
            'name': cfg['name'],
            'contracts': contracts,
            'total_volume': abs(total_vol),
            'total_open_interest': abs(total_oi),
            'total_oi_change': total_oi_chg,
        }

        if product['total_volume'] > 0 or product['total_open_interest'] > 0 or contracts:
            products.append(product)
            print(f"  {symbol}: {len(contracts)} contracts, Vol={product['total_volume']:,}, OI={product['total_open_interest']:,}, OI Chg={product['total_oi_change']:+,}")

    return products


def save_bulletin_data(data: dict, output_path: str):
    """Save parsed bulletin data to JSON."""
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"[OK] Saved bulletin data to {output_path}")


def save_to_database(data: dict, database_url: str):
    """Save bulletin data to PostgreSQL."""
    try:
        import psycopg2
    except ImportError:
        print("[WARNING] psycopg2 not installed, skipping DB save.")
        return

    if not database_url:
        print("[INFO] DATABASE_URL not set, skipping DB save.")
        return

    try:
        conn = psycopg2.connect(database_url, connect_timeout=10)
        cur = conn.cursor()
        parsed_date = data.get('parsed_date')
        if not parsed_date:
            return

        saved = 0
        for product in data.get('products', []):
            try:
                front = product['contracts'][0] if product['contracts'] else None
                cur.execute("""
                    INSERT INTO bulletin_snapshots (
                        date, symbol, product_name,
                        total_volume, total_open_interest, total_oi_change,
                        front_month, front_month_settle, front_month_change
                    ) VALUES (%s::date, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (date, symbol) DO UPDATE SET
                        product_name = EXCLUDED.product_name,
                        total_volume = EXCLUDED.total_volume,
                        total_open_interest = EXCLUDED.total_open_interest,
                        total_oi_change = EXCLUDED.total_oi_change,
                        front_month = EXCLUDED.front_month,
                        front_month_settle = EXCLUDED.front_month_settle,
                        front_month_change = EXCLUDED.front_month_change,
                        created_at = CURRENT_TIMESTAMP
                """, (
                    parsed_date, product['symbol'], product['name'],
                    product['total_volume'], product['total_open_interest'], product['total_oi_change'],
                    front['month'] if front else None,
                    front['settle'] if front else None,
                    front['change'] if front else None,
                ))
                saved += 1
            except Exception as e:
                print(f"  [WARNING] Error saving {product['symbol']}: {e}")

        conn.commit()
        cur.close()
        conn.close()
        print(f"[OK] Saved {saved} products to database")
    except Exception as e:
        print(f"[ERROR] Database error: {e}")


if __name__ == '__main__':
    import sys

    print("=" * 70)
    print("  CME Daily Bulletin Parser (Section 62 — Metal Futures)")
    print("=" * 70)

    project_root = Path(__file__).parent.parent
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else str(project_root / 'data' / 'Section62_Metals_Futures_Products.pdf')

    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        sys.exit(1)

    print(f"[INFO] Parsing: {pdf_path}")
    full_text = pdf_to_text(pdf_path)
    print(f"[INFO] Extracted {len(full_text):,} chars of text")

    header = parse_bulletin_header(full_text)
    print(f"[INFO] Bulletin #{header.get('bulletin_number')} — {header.get('date')}")

    print("[INFO] Extracting futures data...")
    products = parse_all_products(full_text)
    print(f"[INFO] Found {len(products)} products")

    result = {
        'bulletin_number': header.get('bulletin_number'),
        'date': header.get('date'),
        'parsed_date': header.get('parsed_date'),
        'products': products,
        'last_updated': datetime.now().isoformat(),
    }

    output_file = project_root / 'public' / 'bulletin.json'
    save_bulletin_data(result, str(output_file))

    database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
    save_to_database(result, database_url)

    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)
