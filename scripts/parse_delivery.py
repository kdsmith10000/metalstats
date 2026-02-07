"""
Parse CME Group Metals Issues and Stops Report.
Extracts daily delivery notices for Gold, Silver, Copper, Platinum, Palladium.
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
        # Fallback: try reading as raw text (some PDFs)
        try:
            with open(pdf_path, 'rb') as f:
                content = f.read()
                # Try to decode as text
                return content.decode('utf-8', errors='ignore')
        except:
            raise RuntimeError("Install pdftotext (poppler) to parse PDFs")


def parse_delivery_report(text: str) -> dict:
    """Parse the delivery report text and extract data."""
    
    result = {
        'business_date': None,
        'run_date': None,
        'deliveries': [],
    }
    
    # Extract business date
    date_match = re.search(r'BUSINESS DATE:\s*(\d{2}/\d{2}/\d{4})', text)
    if date_match:
        date_str = date_match.group(1)
        result['business_date'] = date_str
        # Convert to ISO format
        parts = date_str.split('/')
        if len(parts) == 3:
            result['parsed_date'] = f"{parts[2]}-{parts[0]}-{parts[1]}"
    
    # Extract run date
    run_match = re.search(r'RUN DATE:\s*(\d{2}/\d{2}/\d{4})', text)
    if run_match:
        result['run_date'] = run_match.group(1)
    
    # Split by CONTRACT sections
    sections = re.split(r'CONTRACT:', text)
    
    for section in sections[1:]:  # Skip first split (header)
        delivery = parse_contract_section(section)
        if delivery:
            result['deliveries'].append(delivery)
    
    return result


def parse_contract_section(section: str) -> dict:
    """Parse a single contract section."""
    
    # Extract contract name
    name_match = re.search(r'^([^\n]+)', section.strip())
    if not name_match:
        return None
    
    contract_name = name_match.group(1).strip()
    
    # Determine metal type
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
    
    # Extract contract month
    month_match = re.search(r'(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})', contract_name, re.IGNORECASE)
    contract_month = None
    if month_match:
        month_map = {
            'JANUARY': 'JAN', 'FEBRUARY': 'FEB', 'MARCH': 'MAR', 'APRIL': 'APR',
            'MAY': 'MAY', 'JUNE': 'JUN', 'JULY': 'JUL', 'AUGUST': 'AUG',
            'SEPTEMBER': 'SEP', 'OCTOBER': 'OCT', 'NOVEMBER': 'NOV', 'DECEMBER': 'DEC'
        }
        month = month_map.get(month_match.group(1).upper(), month_match.group(1)[:3].upper())
        year = month_match.group(2)[2:]  # Last 2 digits
        contract_month = f"{month}{year}"
    
    # Extract settlement price
    settle_match = re.search(r'SETTLEMENT:\s*([\d,]+\.?\d*)', section)
    settlement = None
    if settle_match:
        settlement = float(settle_match.group(1).replace(',', ''))
    
    # Extract delivery date
    delivery_date_match = re.search(r'DELIVERY DATE:\s*(\d{2}/\d{2}/\d{4})', section)
    delivery_date = None
    if delivery_date_match:
        delivery_date = delivery_date_match.group(1)
    
    # Extract TOTAL line
    total_match = re.search(r'TOTAL:\s*([\d,]+)\s+([\d,]+)', section)
    daily_issued = 0
    daily_stopped = 0
    if total_match:
        daily_issued = int(total_match.group(1).replace(',', ''))
        daily_stopped = int(total_match.group(2).replace(',', ''))
    
    # Extract MONTH TO DATE
    mtd_match = re.search(r'MONTH TO DATE:\s*([\d,]+)', section)
    month_to_date = 0
    if mtd_match:
        month_to_date = int(mtd_match.group(1).replace(',', ''))
    
    # Extract firm details
    firms = []
    # Pattern: FIRM_CODE ORG FIRM_NAME [ISSUED] [STOPPED]
    firm_pattern = r'(\d+)\s+([CH])\s+([A-Z][A-Z\s&,.\']+?)\s+(\d+)?\s*(\d+)?(?=\n|$)'
    for match in re.finditer(firm_pattern, section):
        firm_code = match.group(1)
        org_type = match.group(2)
        firm_name = match.group(3).strip()
        issued = int(match.group(4)) if match.group(4) else 0
        stopped = int(match.group(5)) if match.group(5) else 0
        
        # Skip if no activity
        if issued > 0 or stopped > 0:
            firms.append({
                'code': firm_code,
                'org': org_type,
                'name': firm_name,
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


def save_to_database(data: dict, database_url: str):
    """Save delivery data to PostgreSQL database."""
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
        
        # Create tables if not exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS delivery_snapshots (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                metal VARCHAR(50) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                contract_month VARCHAR(10),
                settlement DECIMAL(20, 6),
                daily_issued INTEGER DEFAULT 0,
                daily_stopped INTEGER DEFAULT 0,
                month_to_date INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, symbol)
            )
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_delivery_date_symbol 
            ON delivery_snapshots(date, symbol)
        """)
        
        conn.commit()
        
        parsed_date = data.get('parsed_date')
        if not parsed_date:
            print("[WARNING] No parsed date. Skipping database save.")
            return
        
        saved_count = 0
        
        for delivery in data.get('deliveries', []):
            try:
                cur.execute("""
                    INSERT INTO delivery_snapshots (
                        date, metal, symbol, contract_month,
                        settlement, daily_issued, daily_stopped, month_to_date
                    ) VALUES (
                        %s::date, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (date, symbol) 
                    DO UPDATE SET
                        metal = EXCLUDED.metal,
                        contract_month = EXCLUDED.contract_month,
                        settlement = EXCLUDED.settlement,
                        daily_issued = EXCLUDED.daily_issued,
                        daily_stopped = EXCLUDED.daily_stopped,
                        month_to_date = EXCLUDED.month_to_date,
                        created_at = CURRENT_TIMESTAMP
                """, (
                    parsed_date,
                    delivery['metal'],
                    delivery['symbol'],
                    delivery['contract_month'],
                    delivery['settlement'],
                    delivery['daily_issued'],
                    delivery['daily_stopped'],
                    delivery['month_to_date'],
                ))
                saved_count += 1
            except Exception as e:
                print(f"  [WARNING] Error saving {delivery['metal']}: {e}")
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"[OK] Saved {saved_count} delivery records to database")
        
    except Exception as e:
        print(f"[ERROR] Database error: {e}")


def main():
    print("=" * 70)
    print("  CME Group Metals Issues & Stops Report Parser")
    print("=" * 70)
    print()
    
    # Load environment
    load_env()
    
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    # PDF files are in the data subfolder
    pdf_path = project_root / 'data' / 'MetalsIssuesAndStopsReport.pdf'
    output_file = project_root / 'public' / 'delivery.json'
    
    if not pdf_path.exists():
        print(f"[ERROR] PDF not found: {pdf_path}")
        return
    
    print(f"[INFO] Parsing: {pdf_path}")
    
    # Extract text from PDF
    text = extract_pdf_text(str(pdf_path))
    
    # Parse delivery data
    data = parse_delivery_report(text)
    
    print(f"[INFO] Business Date: {data.get('business_date')}")
    print(f"[INFO] Found {len(data.get('deliveries', []))} delivery contracts")
    
    for delivery in data.get('deliveries', []):
        print(f"  {delivery['metal']} ({delivery['symbol']}): "
              f"Daily={delivery['daily_issued']:,} contracts, "
              f"MTD={delivery['month_to_date']:,}, "
              f"Settle=${delivery['settlement']:,.2f}")
    
    # Save to JSON
    output_data = {
        'business_date': data.get('business_date'),
        'parsed_date': data.get('parsed_date'),
        'deliveries': data.get('deliveries', []),
        'last_updated': datetime.now().isoformat(),
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n[OK] Saved delivery data to {output_file}")
    
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
