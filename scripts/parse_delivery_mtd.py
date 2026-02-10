"""
Parse CME Group Metals Issues and Stops Month-To-Date Report.
Extracts daily delivery progression for each metal contract.
Output: public/delivery_mtd.json
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


def identify_metal(contract_name: str) -> tuple:
    """Identify metal and symbol from contract name."""
    upper = contract_name.upper()
    if 'GOLD' in upper:
        return 'Gold', 'GC'
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


def parse_mtd_report(text: str) -> dict:
    """Parse the MTD delivery report and extract daily delivery progression."""
    
    result = {
        'business_date': None,
        'run_date': None,
        'contracts': [],
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
    
    # Split by CONTRACT: sections
    sections = re.split(r'CONTRACT:\s*', text)
    
    raw_contracts = []
    for section in sections[1:]:
        contract = parse_mtd_contract_section(section)
        if contract:
            raw_contracts.append(contract)
    
    # Merge contracts with the same metal+symbol (split across pages)
    merged = {}
    for contract in raw_contracts:
        key = f"{contract['metal']}_{contract['symbol']}"
        if key not in merged:
            merged[key] = contract
        else:
            # Merge daily_data, avoiding duplicates by date
            existing_dates = {d['date'] for d in merged[key]['daily_data']}
            for day in contract['daily_data']:
                if day['date'] not in existing_dates:
                    merged[key]['daily_data'].append(day)
            # Sort by date
            merged[key]['daily_data'].sort(key=lambda x: x['iso_date'])
            # Update total cumulative to the last entry
            if merged[key]['daily_data']:
                merged[key]['total_cumulative'] = merged[key]['daily_data'][-1]['cumulative']
    
    result['contracts'] = list(merged.values())
    
    return result


def parse_mtd_contract_section(section: str) -> dict:
    """Parse a single MTD contract section to extract daily delivery data."""
    
    # Get the contract name (first line)
    lines = section.strip().split('\n')
    if not lines:
        return None
    
    contract_name = lines[0].strip()
    metal, symbol = identify_metal(contract_name)
    if not metal:
        return None
    
    # Extract contract month
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
        month = month_map.get(month_match.group(1).upper(), month_match.group(1)[:3].upper())
        year = month_match.group(2)[2:]
        contract_month = f"{month}{year}"
    
    # Extract daily rows: date, daily_total, cumulative
    daily_data = []
    # Pattern: MM/DD/YYYY followed by numbers (with optional commas)
    row_pattern = r'(\d{2}/\d{2}/\d{4})\s+([\d,]+)\s+([\d,]+)'
    
    for match in re.finditer(row_pattern, section):
        date_str = match.group(1)
        daily_total = int(match.group(2).replace(',', ''))
        cumulative = int(match.group(3).replace(',', ''))
        
        # Convert date to ISO
        parts = date_str.split('/')
        iso_date = f"{parts[2]}-{parts[0]}-{parts[1]}" if len(parts) == 3 else date_str
        
        daily_data.append({
            'date': date_str,
            'iso_date': iso_date,
            'daily': daily_total,
            'cumulative': cumulative,
        })
    
    if not daily_data:
        return None
    
    return {
        'metal': metal,
        'symbol': symbol,
        'contract_name': contract_name,
        'contract_month': contract_month,
        'daily_data': daily_data,
        'total_cumulative': daily_data[-1]['cumulative'] if daily_data else 0,
    }


def main():
    print("=" * 70)
    print("  CME Group MTD Delivery Report Parser")
    print("=" * 70)
    print()
    
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    pdf_path = project_root / 'data' / 'MetalsIssuesAndStopsMTDReport.pdf'
    output_file = project_root / 'public' / 'delivery_mtd.json'
    
    if not pdf_path.exists():
        print(f"[ERROR] PDF not found: {pdf_path}")
        return
    
    print(f"[INFO] Parsing: {pdf_path}")
    
    text = extract_pdf_text(str(pdf_path))
    data = parse_mtd_report(text)
    
    print(f"[INFO] Business Date: {data.get('business_date')}")
    print(f"[INFO] Found {len(data.get('contracts', []))} contracts")
    
    for contract in data.get('contracts', []):
        days = len(contract['daily_data'])
        print(f"  {contract['metal']} ({contract['symbol']}): "
              f"{days} days, "
              f"Cumulative={contract['total_cumulative']:,}")
    
    output_data = {
        'business_date': data.get('business_date'),
        'parsed_date': data.get('parsed_date'),
        'contracts': data.get('contracts', []),
        'last_updated': datetime.now().isoformat(),
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n[OK] Saved MTD delivery data to {output_file}")
    print("\n" + "=" * 70)
    print("  Done!")
    print("=" * 70)


if __name__ == '__main__':
    main()
