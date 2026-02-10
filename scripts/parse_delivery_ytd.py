"""
Parse CME Group Metals Issues and Stops Year-To-Date Report.
Extracts firm-level delivery data broken down by month for each metal.
Output: public/delivery_ytd.json
"""

import json
import re
import os
import subprocess
from datetime import datetime
from pathlib import Path


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
        try:
            with open(pdf_path, 'rb') as f:
                content = f.read()
                return content.decode('utf-8', errors='ignore')
        except:
            raise RuntimeError("Install pdftotext (poppler) to parse PDFs")


# Months used in the report headers
MONTH_NAMES = ['DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
# The report labels months as: PREV DEC | JAN | FEB | ... | DEC
# "PREV DEC" is the previous year's December, then JAN-DEC of the current year.


def identify_product(product_line: str) -> tuple:
    """Identify metal and symbol from product line."""
    upper = product_line.upper()
    if 'MICRO GOLD' in upper:
        return 'Micro Gold', 'MGC'
    elif 'GOLD' in upper:
        return 'Gold', 'GC'
    elif 'MICRO SILVER' in upper:
        return 'Micro Silver', 'MSI'
    elif 'SILVER' in upper:
        return 'Silver', 'SI'
    elif 'COPPER' in upper:
        return 'Copper', 'HG'
    elif 'PLATINUM' in upper:
        return 'Platinum', 'PL'
    elif 'PALLADIUM' in upper:
        return 'Palladium', 'PA'
    elif 'ALUMINUM' in upper:
        return 'Aluminum', 'ALI'
    return None, None


def parse_ytd_report(text: str) -> dict:
    """Parse the YTD delivery report."""
    
    result = {
        'business_date': None,
        'run_date': None,
        'products': [],
    }
    
    # Extract business date
    date_match = re.search(r'BUSINESS DATE:\s*(\d{2}/\d{2}/\d{4})', text)
    if date_match:
        date_str = date_match.group(1)
        result['business_date'] = date_str
        parts = date_str.split('/')
        if len(parts) == 3:
            result['parsed_date'] = f"{parts[2]}-{parts[0]}-{parts[1]}"
    
    # Extract run date
    run_match = re.search(r'RUN DATE:\s*(\d{2}/\d{2}/\d{4})', text)
    if run_match:
        result['run_date'] = run_match.group(1)
    
    # Split into pages (each page starts with the report header)
    pages = re.split(r'DLV665-T\s+CME CLEARING', text)
    
    # Group pages by product
    product_pages = {}
    
    for page in pages[1:]:  # skip before first header
        # Find the PRODUCT line - skip "PRODUCT GROUP:" lines
        product_match = re.search(r'^PRODUCT\s+(?!GROUP:)(.+)$', page, re.MULTILINE)
        if product_match:
            product_name = product_match.group(1).strip()
            metal, symbol = identify_product(product_name)
            if metal:
                key = f"{metal}_{symbol}"
                if key not in product_pages:
                    product_pages[key] = {
                        'metal': metal,
                        'symbol': symbol,
                        'product_name': product_name,
                        'raw_pages': [],
                    }
                product_pages[key]['raw_pages'].append(page)
    
    # Parse each product's accumulated pages
    for key, product_info in product_pages.items():
        product_data = parse_product_pages(product_info)
        if product_data:
            result['products'].append(product_data)
    
    return result


def parse_product_pages(product_info: dict) -> dict:
    """Parse all pages for a single product to extract firm data and totals."""
    
    metal = product_info['metal']
    symbol = product_info['symbol']
    product_name = product_info['product_name']
    
    firms = []
    monthly_totals = {}
    
    # Combine all raw page text
    combined_text = '\n'.join(product_info['raw_pages'])
    
    # Extract TOTALS line
    # Pattern: TOTALS: | number | number | number | ...
    totals_match = re.search(r'TOTALS:\s*\|(.+)', combined_text)
    if totals_match:
        totals_str = totals_match.group(1)
        # Month columns: PREV_DEC, JAN, FEB, MAR, ... DEC
        month_labels = ['prev_dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        parts = totals_str.split('|')
        for i, part in enumerate(parts):
            if i < len(month_labels):
                val = part.strip().replace(',', '')
                if val and val.isdigit():
                    monthly_totals[month_labels[i]] = int(val)
    
    # Extract firm data from blocks between horizontal rule separators
    # Each block has two lines:
    # Line 1: 104                      | | I |       0 |      66 |       0|...
    # Line 2: MIZUHO SECURITIES US     |C| S |      95 |      60 |      46|...
    
    # Regex for the issued line (firm code + I values)
    issued_re = re.compile(r'^\s*(\d{3})\s+\|\s*\|\s*I\s*\|(.+)$', re.MULTILINE)
    # Regex for the stopped line (firm name + org + S values)
    stopped_re = re.compile(r'^(.+?)\s*\|([CH])\|\s*S\s*\|(.+)$', re.MULTILINE)
    
    for page in product_info['raw_pages']:
        # Split by underscore separators
        blocks = re.split(r'_{10,}', page)
        
        for block in blocks:
            block = block.strip()
            if not block or 'TOTALS:' in block or 'FIRM NBR' in block:
                continue
            
            issued_match = issued_re.search(block)
            stopped_match = stopped_re.search(block)
            
            if issued_match and stopped_match:
                firm_code = issued_match.group(1)
                issued_values = parse_month_values(issued_match.group(2))
                
                firm_name = stopped_match.group(1).strip()
                org_type = stopped_match.group(2)
                stopped_values = parse_month_values(stopped_match.group(3))
                
                firms.append({
                    'code': firm_code,
                    'name': firm_name,
                    'org': org_type,
                    'issued': issued_values,
                    'stopped': stopped_values,
                })
    
    # Aggregate firm data: combine same firm entries
    aggregated = aggregate_firms(firms)
    
    return {
        'metal': metal,
        'symbol': symbol,
        'product_name': product_name,
        'monthly_totals': monthly_totals,
        'firms': aggregated,
    }


def parse_month_values(values_str: str) -> dict:
    """Parse month values from a pipe-separated string."""
    month_labels = ['prev_dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    result = {}
    
    parts = values_str.split('|')
    for i, part in enumerate(parts):
        if i < len(month_labels):
            val = part.strip().replace(',', '')
            if val and val.isdigit():
                result[month_labels[i]] = int(val)
            elif val == '0':
                result[month_labels[i]] = 0
    
    return result


def aggregate_firms(firms: list) -> list:
    """Aggregate firm data by firm code + org type."""
    agg = {}
    
    for firm in firms:
        key = f"{firm['code']}_{firm['org']}"
        if key not in agg:
            agg[key] = {
                'code': firm['code'],
                'name': firm['name'],
                'org': firm['org'],
                'issued': {},
                'stopped': {},
            }
        
        # Merge month values (take non-zero values)
        for month, val in firm['issued'].items():
            existing = agg[key]['issued'].get(month, 0)
            if val > 0 or month not in agg[key]['issued']:
                agg[key]['issued'][month] = val
        
        for month, val in firm['stopped'].items():
            existing = agg[key]['stopped'].get(month, 0)
            if val > 0 or month not in agg[key]['stopped']:
                agg[key]['stopped'][month] = val
    
    # Convert to list and sort by total activity
    result = []
    for key, firm in agg.items():
        total_issued = sum(firm['issued'].values())
        total_stopped = sum(firm['stopped'].values())
        firm['total_issued'] = total_issued
        firm['total_stopped'] = total_stopped
        firm['total_activity'] = total_issued + total_stopped
        result.append(firm)
    
    # Sort by total activity descending
    result.sort(key=lambda x: x['total_activity'], reverse=True)
    
    return result


def main():
    print("=" * 70)
    print("  CME Group YTD Delivery Report Parser")
    print("=" * 70)
    print()
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    pdf_path = project_root / 'data' / 'MetalsIssuesAndStopsYTDReport.pdf'
    output_file = project_root / 'public' / 'delivery_ytd.json'
    
    if not pdf_path.exists():
        print(f"[ERROR] PDF not found: {pdf_path}")
        return
    
    print(f"[INFO] Parsing: {pdf_path}")
    
    text = extract_pdf_text(str(pdf_path))
    data = parse_ytd_report(text)
    
    print(f"[INFO] Business Date: {data.get('business_date')}")
    print(f"[INFO] Found {len(data.get('products', []))} products")
    
    for product in data.get('products', []):
        firms_count = len(product.get('firms', []))
        totals = product.get('monthly_totals', {})
        print(f"  {product['metal']} ({product['symbol']}): "
              f"{firms_count} firms, "
              f"Monthly totals: {totals}")
    
    output_data = {
        'business_date': data.get('business_date'),
        'parsed_date': data.get('parsed_date'),
        'products': data.get('products', []),
        'last_updated': datetime.now().isoformat(),
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n[OK] Saved YTD delivery data to {output_file}")
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
