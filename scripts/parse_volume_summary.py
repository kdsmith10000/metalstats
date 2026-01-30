"""
Parse CME Group Daily Bulletin Section 02B (Metal Futures Summary Volume & Open Interest).
Extracts overall volume, open interest, and year-over-year comparisons for all metals.
"""

import os
import re
import json
import subprocess
from datetime import datetime
from pathlib import Path


def load_env():
    """Load environment variables from .env file."""
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
    
    # Find bulletin number: "BULLETIN # 19@"
    bulletin_match = re.search(r'BULLETIN\s*#\s*(\d+)', text, re.IGNORECASE)
    if bulletin_match:
        result['bulletin_number'] = int(bulletin_match.group(1))
    
    # Find date: "Thu, Jan 29, 2026"
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


def parse_int(s: str) -> int:
    """Parse an integer string, handling commas and special cases."""
    if not s or s.strip() in ['', '----', 'UNCH']:
        return 0
    s = s.replace(',', '').strip()
    # Handle negative values with space: "- 6482"
    s = s.replace('- ', '-').replace('+ ', '+')
    try:
        return int(float(s))
    except ValueError:
        return 0


def parse_change(s: str) -> int:
    """Parse a change value like "+ 1645" or "- 6482"."""
    if not s or s.strip() in ['', '----', 'UNCH']:
        return 0
    s = s.strip()
    # Handle formats like "+      1571622" or "-       31113"
    s = re.sub(r'\s+', '', s)
    try:
        return int(float(s))
    except ValueError:
        return 0


def parse_metals_summary(text: str) -> list:
    """Parse the METALS FUTURES & OPTIONS section using position-based parsing."""
    products = []
    
    # Find the METALS FUTURES & OPTIONS section
    section_match = re.search(r'METALS FUTURES & OPTIONS', text)
    if not section_match:
        print("[WARNING] Could not find METALS FUTURES & OPTIONS section")
        return products
    
    section_start = section_match.end()
    
    # Find the end of the metals section
    section_end = text.find('VOLUME AND OPEN INTEREST "RECORDS"', section_start)
    if section_end == -1:
        section_end = len(text)
    
    section = text[section_start:section_end]
    
    # Product symbols to look for
    product_configs = {
        'MGC': 'MICRO GOLD FUTURES',
        'GC': 'COMEX GOLD FUTURES',
        'SIL': 'MICRO SILVER FUTURES',
        '1OZ': '1 OUNCE GOLD FUTURES',
        'HG': 'COMEX COPPER FUTURES',
        'SI': 'COMEX SILVER FUTURES',
        'MHG': 'COMEX MICRO COPPER FUTURES',
        'PL': 'NYMEX PLATINUM FUTURES',
        'QO': 'E-MINI GOLD FUTURES',
        'PA': 'NYMEX PALLADIUM FUTURES',
        'QI': 'E-MINI SILVER FUTURES',
        'ALI': 'COMEX PHYSICAL ALUMINUM FUTURES',
        'HGS': 'COMEX COPPER SWAP FUTURES',
        'QC': 'COMEX E-MINI COPPER FUTURES',
    }
    
    for line in section.split('\n'):
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        # Check if line starts with a known product symbol
        for symbol, name in product_configs.items():
            if line_stripped.startswith(symbol + ' '):
                # Parse based on pattern matching
                # Example lines:
                # MGC MICRO GOLD FUTURES                        1577286                               1577286            58501    -        18559        126712            30723
                # GC COMEX GOLD FUTURES                          640763                      11710     652473           458641    -         6482        247938           576557
                
                # Use a more robust regex to extract the key numbers
                # Pattern looks for: product info, then numbers with optional +/- signs
                match = re.search(
                    r'(\d[\d,]*)\s+'          # First number (globex vol)
                    r'(?:(\d[\d,]*)\s+)?'     # Optional second number (outcry/pnt)
                    r'(?:(\d[\d,]*)\s+)?'     # Optional third number  
                    r'(\d[\d,]*)\s+'          # Total volume
                    r'(\d[\d,]*)\s+'          # Open interest
                    r'([+-])\s*(\d[\d,]*)\s+' # OI change with sign
                    r'(\d[\d,]*)\s+'          # YoY volume
                    r'(\d[\d,]*)',            # YoY OI
                    line
                )
                
                if match:
                    groups = match.groups()
                    # Parse numbers, handling optional groups
                    nums = [parse_int(g) if g else 0 for g in groups if g and g not in ['+', '-']]
                    sign = 1 if '+' in groups else -1
                    
                    if len(nums) >= 5:
                        # Try to identify which is which based on expected ranges
                        # Globex vol and total vol should be similar
                        # OI is typically larger than vol for main contracts
                        
                        # Find the sign position to split properly
                        sign_idx = groups.index('+') if '+' in groups else groups.index('-') if '-' in groups else -1
                        
                        # Parse the numbers before and after sign
                        before_sign = [parse_int(g) for g in groups[:sign_idx] if g and g not in ['+', '-', None]]
                        after_sign = [parse_int(g) for g in groups[sign_idx+1:] if g and g not in ['+', '-', None]]
                        
                        if len(before_sign) >= 2 and len(after_sign) >= 3:
                            total_vol = before_sign[-2]  # Second to last before sign
                            oi = before_sign[-1]         # Last before sign
                            oi_chg = after_sign[0]       # First after sign
                            yoy_vol = after_sign[-2] if len(after_sign) >= 2 else 0
                            yoy_oi = after_sign[-1] if len(after_sign) >= 1 else 0
                            
                            product_data = {
                                'symbol': symbol,
                                'name': name,
                                'globex_volume': before_sign[0],
                                'total_volume': total_vol,
                                'open_interest': oi,
                                'oi_change': sign * oi_chg,
                                'yoy_volume': yoy_vol,
                                'yoy_open_interest': yoy_oi,
                            }
                            
                            products.append(product_data)
                            print(f"  {symbol}: Vol={product_data['total_volume']:,}, OI={product_data['open_interest']:,}, OI Chg={product_data['oi_change']:+,}, YoY Vol={product_data['yoy_volume']:,}")
                break
    
    return products


def parse_metals_totals(text: str) -> dict:
    """Parse overall metals totals."""
    totals = {
        'futures_options': {
            'volume': 0,
            'open_interest': 0,
            'oi_change': 0,
            'yoy_volume': 0,
            'yoy_open_interest': 0,
        },
        'futures_only': {
            'volume': 0,
            'open_interest': 0,
            'oi_change': 0,
            'yoy_volume': 0,
            'yoy_open_interest': 0,
        },
        'options_only': {
            'volume': 0,
            'open_interest': 0,
            'oi_change': 0,
            'yoy_volume': 0,
            'yoy_open_interest': 0,
        },
    }
    
    # Pattern for METALS totals
    # METALS                                   4117194                      66985    4184179          2491050    +        26475        632570          1581375
    
    patterns = [
        (r'FUTURES & OPTIONS -\s*\n\s*METALS\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*([+-])\s*([\d,]+)\s+([\d,]+)\s+([\d,]+)', 'futures_options'),
        (r'FUTURES ONLY -\s*\n\s*METALS\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*([+-])\s*([\d,]+)\s+([\d,]+)\s+([\d,]+)', 'futures_only'),
        (r'OPTIONS ONLY -\s*\n\s*METALS\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*([+-])\s*([\d,]+)\s+([\d,]+)\s+([\d,]+)', 'options_only'),
    ]
    
    for pattern, key in patterns:
        match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
        if match:
            groups = match.groups()
            if key == 'futures_options':
                totals[key] = {
                    'globex_volume': parse_int(groups[0]),
                    'pnt_volume': parse_int(groups[1]),
                    'volume': parse_int(groups[2]),
                    'open_interest': parse_int(groups[3]),
                    'oi_change': (1 if groups[4] == '+' else -1) * parse_int(groups[5]),
                    'yoy_volume': parse_int(groups[6]),
                    'yoy_open_interest': parse_int(groups[7]),
                }
            elif key == 'futures_only':
                totals[key] = {
                    'globex_volume': parse_int(groups[0]),
                    'pnt_volume': parse_int(groups[1]),
                    'volume': parse_int(groups[2]),
                    'open_interest': 0,  # Not in simpler format
                    'oi_change': (1 if groups[3] == '+' else -1) * parse_int(groups[4]),
                    'yoy_volume': parse_int(groups[5]),
                    'yoy_open_interest': parse_int(groups[6]),
                }
    
    return totals


def parse_volume_summary(pdf_path: str) -> dict:
    """Parse the Section 02B PDF and return structured data."""
    print(f"[INFO] Parsing volume summary: {pdf_path}")
    
    # Extract text from PDF
    print("[INFO] Extracting text from PDF...")
    text = extract_pdf_text(pdf_path)
    
    # Parse header
    header = parse_header(text)
    print(f"[INFO] Bulletin #{header.get('bulletin_number')} - {header.get('date')}")
    
    # Parse metals summary
    print("[INFO] Extracting metals products...")
    products = parse_metals_summary(text)
    print(f"[INFO] Found {len(products)} products")
    
    # Parse totals
    totals = parse_metals_totals(text)
    
    return {
        'bulletin_number': header.get('bulletin_number'),
        'date': header.get('date'),
        'parsed_date': header.get('parsed_date'),
        'products': products,
        'totals': totals,
        'last_updated': datetime.now().isoformat(),
    }


def main():
    import sys
    
    print("=" * 70)
    print("  CME Section 02B Volume & Open Interest Summary Parser")
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
        pdf_path = str(project_root / 'data' / 'Section02B_Summary_Volume_And_Open_Interest_Metals_Futures_And_Options.pdf')
    
    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        sys.exit(1)
    
    # Parse the summary
    data = parse_volume_summary(pdf_path)
    
    # Save to JSON
    output_file = project_root / 'public' / 'volume_summary.json'
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"[OK] Saved volume summary to {output_file}")
    
    print()
    print("=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
