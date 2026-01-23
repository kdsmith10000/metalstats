"""
Parse CME Group Daily Bulletin Section 62 (Metal Futures Products) using OCR.
Extracts volume, open interest, and settlement prices for all metals.
"""

import os
import re
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# Try to import optional dependencies
try:
    import pytesseract
    from PIL import Image, ImageEnhance
    HAS_OCR = True
except ImportError:
    HAS_OCR = False
    print("[WARNING] pytesseract/PIL not installed. Install with: pip install pytesseract pillow")


def convert_pdf_to_images(pdf_path: str, output_dir: str, dpi: int = 200) -> list[str]:
    """Convert PDF pages to PNG images using pdftoppm."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Use pdftoppm (from poppler) to convert PDF to images
    cmd = ['pdftoppm', '-png', '-r', str(dpi), pdf_path, os.path.join(output_dir, 'page')]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except FileNotFoundError:
        raise RuntimeError("pdftoppm not found. Install poppler: brew install poppler")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"PDF conversion failed: {e.stderr.decode()}")
    
    # Find all generated page images
    images = sorted([
        os.path.join(output_dir, f) 
        for f in os.listdir(output_dir) 
        if f.startswith('page') and f.endswith('.png')
    ])
    
    return images


def ocr_image(image_path: str) -> str:
    """Extract text from an image using OCR with preprocessing."""
    if not HAS_OCR:
        raise RuntimeError("OCR libraries not installed")
    
    img = Image.open(image_path)
    
    # Convert to grayscale and enhance contrast
    img_gray = img.convert('L')
    enhancer = ImageEnhance.Contrast(img_gray)
    img_enhanced = enhancer.enhance(2.0)
    
    # OCR with page segmentation mode 3 (fully automatic)
    text = pytesseract.image_to_string(img_enhanced, config='--psm 3')
    
    return text


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
    
    # Find date: "Wed, Jan 21, 2026" or similar
    date_patterns = [
        r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})',
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text, re.IGNORECASE)
        if date_match:
            result['date'] = date_match.group(0)
            # Parse to ISO format
            try:
                groups = date_match.groups()
                if len(groups) == 4:  # Day, Month, Date, Year
                    month_map = {
                        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                    }
                    month = month_map.get(groups[1].lower()[:3], 1)
                    day = int(groups[2])
                    year = int(groups[3])
                    result['parsed_date'] = f"{year:04d}-{month:02d}-{day:02d}"
                elif len(groups) == 3:  # Month, Date, Year
                    month_map = {
                        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
                    }
                    month = month_map.get(groups[0].lower(), 1)
                    day = int(groups[1])
                    year = int(groups[2])
                    result['parsed_date'] = f"{year:04d}-{month:02d}-{day:02d}"
            except (ValueError, IndexError):
                pass
            break
    
    return result


def parse_futures_product(text: str, product_patterns: dict) -> Optional[dict]:
    """Parse a single futures product section."""
    for symbol, patterns in product_patterns.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return extract_product_data(text, symbol, patterns[0])
    return None


def extract_product_data(text: str, symbol: str, name_pattern: str) -> dict:
    """Extract contracts data for a specific product."""
    product = {
        'symbol': symbol,
        'name': '',
        'contracts': [],
        'total_volume': 0,
        'total_open_interest': 0,
        'total_oi_change': 0,
    }
    
    # Find the product name
    name_match = re.search(name_pattern, text, re.IGNORECASE)
    if name_match:
        product['name'] = name_match.group(0).strip()
    
    # Pattern to match contract lines
    # Format: MONTH OPEN HIGH/LOW SETTLE CHANGE VOLUME PNT_VOL OI OI_CHANGE
    # Example: FEB26 4768.75 4890.75/4756.75 4837.50 + 71.75 131092 16336 + 773
    contract_pattern = r'([A-Z]{3})(\d{2})\s+(\d+\.?\d*|----)\s+(\d+\.?\d*[BA]?/?\d*\.?\d*[BA]?|----)\s+(\d+\.?\d*)\s*([+-]?\s*\d+\.?\d*|UNCH|NEW)\s+(\d+|----)\s+(\d+|----)\s*([+-]?\s*\d+|UNCH)?'
    
    contracts = []
    for match in re.finditer(contract_pattern, text):
        try:
            month = match.group(1) + match.group(2)  # e.g., "FEB26"
            
            # Parse open price
            open_str = match.group(3)
            open_price = None if open_str == '----' else float(open_str.replace('B', '').replace('A', ''))
            
            # Parse high/low
            high_low = match.group(4)
            high, low = None, None
            if high_low != '----' and '/' in high_low:
                parts = high_low.split('/')
                high = float(parts[0].replace('B', '').replace('A', '').strip())
                low = float(parts[1].replace('B', '').replace('A', '').strip())
            
            # Parse settle price
            settle = float(match.group(5))
            
            # Parse change
            change_str = match.group(6).replace(' ', '')
            if change_str in ['UNCH', 'NEW']:
                change = 0.0
            else:
                change = float(change_str)
            
            # Parse volumes
            globex_vol = 0 if match.group(7) == '----' else int(match.group(7))
            pnt_vol = 0 if match.group(8) == '----' else int(match.group(8))
            
            # Parse OI change
            oi_change_str = match.group(9) if match.group(9) else '0'
            oi_change_str = oi_change_str.replace(' ', '')
            if oi_change_str in ['UNCH', '']:
                oi_change = 0
            else:
                oi_change = int(oi_change_str)
            
            contracts.append({
                'month': month,
                'open': open_price,
                'high': high,
                'low': low,
                'settle': settle,
                'change': change,
                'globex_volume': globex_vol,
                'pnt_volume': pnt_vol,
                'open_interest': 0,  # Will be updated from TOTAL line
                'oi_change': oi_change,
            })
        except (ValueError, IndexError) as e:
            continue
    
    product['contracts'] = contracts
    
    # Find TOTAL line for this product
    total_pattern = r'TOTAL\s+' + re.escape(symbol) + r'\s+(?:FUT)?\s*(\d+)\s+(\d+)\s*([+-]?\s*\d+)?'
    total_match = re.search(total_pattern, text, re.IGNORECASE)
    if total_match:
        product['total_volume'] = int(total_match.group(1))
        product['total_open_interest'] = int(total_match.group(2))
        if total_match.group(3):
            change_str = total_match.group(3).replace(' ', '')
            product['total_oi_change'] = int(change_str) if change_str not in ['UNCH', ''] else 0
    
    return product


def parse_all_products(full_text: str) -> list[dict]:
    """Parse all futures products from the bulletin text."""
    products = []
    
    # Define product patterns (symbol -> search patterns)
    product_configs = {
        'GC': {
            'name': 'COMEX GOLD FUTURES',
            'patterns': [r'COMEX\s+GOLD\s+FUTURES', r'GC\s+FUT'],
            'total_pattern': r'TOTAL\s+GC\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        '1OZ': {
            'name': '1 OUNCE GOLD FUTURES',
            'patterns': [r'1\s*OUNCE\s+GOLD\s+FUTURES', r'1oz\s+FUT'],
            'total_pattern': r'TOTAL\s+(?:1oz|1OZ)\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        'SI': {
            'name': 'COMEX SILVER FUTURES',
            'patterns': [r'COMEX\s+SILVER\s+FUTURES', r'SI\s+FUT'],
            'total_pattern': r'TOTAL\s+SI\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        'SIL': {
            'name': '5000 OZ SILVER FUTURES',
            'patterns': [r'5000\s*OZ\s+SILVER\s+FUTURES', r'SIL\s+FUT'],
            'total_pattern': r'TOTAL\s+SIL\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        'HG': {
            'name': 'COMEX COPPER FUTURES',
            'patterns': [r'COMEX\s+COPPER\s+FUTURES', r'HG\s+FUT'],
            'total_pattern': r'TOTAL\s+HG\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        'PL': {
            'name': 'NYMEX PLATINUM FUTURES',
            'patterns': [r'NYMEX\s+PLATINUM\s+FUTURES', r'PL\s+FUT'],
            'total_pattern': r'TOTAL\s+PL\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        'PA': {
            'name': 'NYMEX PALLADIUM FUTURES',
            'patterns': [r'NYMEX\s+PALLADIUM\s+FUTURES', r'PA\s+FUT'],
            'total_pattern': r'TOTAL\s+PA\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
        'ALI': {
            'name': 'COMEX PHYSICAL ALUMINUM FUTURES',
            'patterns': [r'COMEX\s+PHYSICAL\s+ALUMINUM\s+FUTURES', r'ALI\s+FUT'],
            'total_pattern': r'TOTAL\s+ALI\s+FUT\s+(\d+)\s+(\d+)\s*([+-]?\s*\d+)?',
        },
    }
    
    for symbol, config in product_configs.items():
        # Check if this product exists in the text
        found = False
        for pattern in config['patterns']:
            if re.search(pattern, full_text, re.IGNORECASE):
                found = True
                break
        
        if not found:
            continue
        
        product = {
            'symbol': symbol,
            'name': config['name'],
            'contracts': [],
            'total_volume': 0,
            'total_open_interest': 0,
            'total_oi_change': 0,
        }
        
        # Find total line
        total_match = re.search(config['total_pattern'], full_text, re.IGNORECASE)
        if total_match:
            product['total_volume'] = int(total_match.group(1))
            product['total_open_interest'] = int(total_match.group(2))
            if total_match.group(3):
                change_str = total_match.group(3).replace(' ', '')
                product['total_oi_change'] = int(change_str) if change_str not in ['UNCH', ''] else 0
        
        # Extract individual contract data
        # This is complex due to OCR noise, so we'll use a simplified approach
        contracts = extract_contracts_for_product(full_text, symbol, config)
        product['contracts'] = contracts
        
        if product['total_volume'] > 0 or product['total_open_interest'] > 0:
            products.append(product)
    
    return products


def extract_contracts_for_product(text: str, symbol: str, config: dict) -> list[dict]:
    """Extract individual contract data for a product."""
    contracts = []
    
    # Find the section for this product
    # Pattern: product name followed by contract lines until TOTAL
    for pattern in config['patterns']:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start_idx = match.start()
            # Find TOTAL line for this product
            total_match = re.search(config['total_pattern'], text[start_idx:], re.IGNORECASE)
            if total_match:
                end_idx = start_idx + total_match.end()
                section = text[start_idx:end_idx]
                
                # Extract contracts from this section
                # Contract line format varies, try multiple patterns
                contract_patterns = [
                    # Standard format: MONTH OPEN HIGH/LOW SETTLE CHANGE GLOBEX_VOL PNT_VOL OI OI_CHG
                    # Example: FEB26 4767.50 4891.10 /4757.10 4837.50 + 71.70 393564 6954 224850 - 17878
                    r'([A-Z]{3})(\d{2})\s+([\d.]+|----)\s+([\d.BA\s/]+|----)\s+([\d.]+)\s*([+-]?\s*[\d.]+|UNCH|NEW)\s+(\d+|----)\s+(\d+|----)\s+(\d+|----)\s*([+-]?\s*\d+|UNCH)?',
                    # Simplified format (missing Open/High/Low): MONTH SETTLE CHANGE VOL1 VOL2 OI_CHG
                    # Example: JUN28 5260.00 + 72.80 10 44 UNCH
                    r'([A-Z]{3})(\d{2})\s+([\d.]+)\s*([+-]?\s*[\d.]+|UNCH|NEW)\s+(\d+|----)\s+(\d+|----)\s*([+-]?\s*\d+|UNCH)?',
                ]
                
                for cp in contract_patterns:
                    for cm in re.finditer(cp, section):
                        try:
                            month = cm.group(1) + cm.group(2)
                            
                            # Different parsing based on pattern
                            groups = cm.groups()
                            if len(groups) >= 10: # Standard format
                                settle = float(groups[4])
                                change_str = groups[5].replace(' ', '')
                                change = 0.0 if change_str in ['UNCH', 'NEW'] else float(change_str)
                                globex_vol = 0 if groups[6] == '----' else int(groups[6])
                                pnt_vol = 0 if groups[7] == '----' else int(groups[7])
                                oi_change = 0
                                if groups[9]:
                                    oi_str = groups[9].replace(' ', '')
                                    if oi_str not in ['UNCH', '']:
                                        oi_change = int(oi_str)
                            else: # Simplified format
                                settle = float(groups[2])
                                change_str = groups[3].replace(' ', '')
                                change = 0.0 if change_str in ['UNCH', 'NEW'] else float(change_str)
                                globex_vol = 0 if groups[4] == '----' else int(groups[4])
                                pnt_vol = 0 if groups[5] == '----' else int(groups[5])
                                oi_change = 0
                                if groups[6]:
                                    oi_str = groups[6].replace(' ', '')
                                    if oi_str not in ['UNCH', '']:
                                        oi_change = int(oi_str)
                            
                            # Avoid duplicates
                            if not any(c['month'] == month for c in contracts):
                                contracts.append({
                                    'month': month,
                                    'settle': settle,
                                    'change': change,
                                    'globex_volume': globex_vol,
                                    'pnt_volume': pnt_vol,
                                    'oi_change': oi_change,
                                })
                        except (ValueError, IndexError):
                            continue
                
                # Sort contracts by volume to ensure the most active one is first (front month)
                contracts.sort(key=lambda x: x['globex_volume'] + x['pnt_volume'], reverse=True)
            break
    
    return contracts


def parse_bulletin_pdf(pdf_path: str, output_dir: str = '/tmp/bulletin_pages') -> dict:
    """Parse a CME bulletin PDF and return structured data."""
    print(f"[INFO] Parsing bulletin: {pdf_path}")
    
    # Convert PDF to images
    print("[INFO] Converting PDF to images...")
    images = convert_pdf_to_images(pdf_path, output_dir)
    print(f"[INFO] Converted {len(images)} pages")
    
    # OCR all pages
    print("[INFO] Running OCR on pages...")
    full_text = ""
    for i, img_path in enumerate(images):
        print(f"  Processing page {i + 1}/{len(images)}...")
        text = ocr_image(img_path)
        full_text += f"\n\n=== PAGE {i + 1} ===\n\n{text}"
    
    # Parse header
    header = parse_bulletin_header(full_text)
    print(f"[INFO] Bulletin #{header.get('bulletin_number')} - {header.get('date')}")
    
    # Parse products
    print("[INFO] Extracting futures data...")
    products = parse_all_products(full_text)
    print(f"[INFO] Found {len(products)} products")
    
    for product in products:
        print(f"  {product['symbol']}: Vol={product['total_volume']:,}, OI={product['total_open_interest']:,}")
    
    # Build result
    result = {
        'bulletin_number': header.get('bulletin_number'),
        'date': header.get('date'),
        'parsed_date': header.get('parsed_date'),
        'products': products,
        'last_updated': datetime.now().isoformat(),
        'raw_text': full_text,  # Keep for debugging
    }
    
    return result


def save_bulletin_data(data: dict, output_path: str):
    """Save parsed bulletin data to JSON file."""
    # Remove raw text for production output
    output_data = {k: v for k, v in data.items() if k != 'raw_text'}
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"[OK] Saved bulletin data to {output_path}")


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
                    product['contracts'][0]['month'] if product['contracts'] else None,
                    product['contracts'][0]['settle'] if product['contracts'] else None,
                    product['contracts'][0]['change'] if product['contracts'] else None,
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


if __name__ == '__main__':
    import sys
    
    print("=" * 70)
    print("  CME Group Daily Bulletin Parser (Section 62 - Metal Futures)")
    print("=" * 70)
    print()
    
    # Get PDF path from command line or use default
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        # Default to the sample PDF in data folder
        pdf_path = str(project_root / 'data' / 'Section62_Metals_Futures_Products.pdf')
    
    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        sys.exit(1)
    
    # Parse the bulletin
    data = parse_bulletin_pdf(pdf_path)
    
    # Save to JSON
    output_file = project_root / 'public' / 'bulletin.json'
    save_bulletin_data(data, str(output_file))
    
    # Save to database
    database_url = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')
    save_to_database(data, database_url)
    
    print()
    print("=" * 70)
    print("  Done!")
    print("=" * 70)
