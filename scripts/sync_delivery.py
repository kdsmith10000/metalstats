"""
Sync delivery.json to database.
"""

import os
import json
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('POSTGRES_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL or POSTGRES_URL not found")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Load delivery.json
delivery_path = Path(__file__).parent.parent / 'public' / 'delivery.json'
with open(delivery_path, 'r') as f:
    data = json.load(f)

parsed_date = data.get('parsed_date')
print(f'Syncing delivery data for: {parsed_date}')

for delivery in data.get('deliveries', []):
    cur.execute('''
        INSERT INTO delivery_snapshots (
            report_date, metal, symbol, contract_month,
            settlement_price, daily_issued, daily_stopped, month_to_date
        ) VALUES (
            %s::date, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (metal, report_date)
        DO UPDATE SET
            symbol = EXCLUDED.symbol,
            contract_month = EXCLUDED.contract_month,
            settlement_price = EXCLUDED.settlement_price,
            daily_issued = EXCLUDED.daily_issued,
            daily_stopped = EXCLUDED.daily_stopped,
            month_to_date = EXCLUDED.month_to_date,
            created_at = CURRENT_TIMESTAMP
    ''', (
        parsed_date,
        delivery['metal'],
        delivery['symbol'],
        delivery.get('contract_month'),
        delivery.get('settlement'),
        delivery.get('daily_issued', 0),
        delivery.get('daily_stopped', 0),
        delivery.get('month_to_date', 0),
    ))
    mtd = delivery.get('month_to_date', 0)
    print(f"  {delivery['metal']} ({delivery['symbol']}): MTD={mtd:,} contracts")

conn.commit()
cur.close()
conn.close()
print('Done!')
