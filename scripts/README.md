# Data Update Scripts

## update_data.py

This script fetches the latest warehouse and depository stocks data from CME Group Excel files and updates the `public/data.json` file used by the Next.js dashboard. It also saves historical data to Neon database for percent change calculations.

## parse_bulletin.py / parse_bulletin_text.py

These scripts parse CME Group Daily Bulletin Section 62 (Metal Futures Products) PDFs to extract volume, open interest, and settlement prices for all metals. `parse_bulletin_text.py` uses direct text extraction (recommended), while `parse_bulletin.py` uses OCR.

## parse_volume_summary.py

This script parses CME Group Daily Bulletin Section 02B (Summary Volume and Open Interest) PDFs to extract:
- Overall metals market volume and open interest totals
- Year-over-year (52-week) comparisons
- Individual product breakdown with YoY data

### Usage

```bash
# Parse the default PDF in data/ folder
python scripts/parse_volume_summary.py

# Or specify a PDF file
python scripts/parse_volume_summary.py /path/to/Section02B.pdf
```

### Output

The script generates:
- `public/volume_summary.json` - YoY comparison data for the dashboard

### Usage

```bash
# Parse the default PDF in data/ folder
python scripts/parse_bulletin.py

# Or specify a PDF file
python scripts/parse_bulletin.py /path/to/bulletin.pdf
```

### Requirements

In addition to the base requirements:
- pytesseract
- Pillow
- poppler (system dependency for pdftoppm)

Install system dependencies:
```bash
# macOS
brew install poppler tesseract

# Ubuntu/Debian
apt-get install poppler-utils tesseract-ocr
```

### Output

The script generates:
- `public/bulletin.json` - Parsed bulletin data for the dashboard
- Database records in `bulletin_snapshots` table (if DATABASE_URL is set)

### Data Extracted

- Settlement prices for front-month contracts
- Daily price changes
- Total volume by product
- Open interest and OI changes
- Products: Gold (GC), Silver (SI/SIL), Copper (HG), Platinum (PL), Palladium (PA), Aluminum (ALI)

---

### Usage

```bash
python scripts/update_data.py
```

### Requirements

- Python 3.11+
- requests
- pandas
- openpyxl
- xlrd
- lxml
- html5lib
- psycopg2-binary
- python-dotenv

Install with:
```bash
pip install -r scripts/requirements.txt
```

### Database Setup

Before running the update script, initialize the database schema:

```bash
python scripts/init_db.py
```

This creates the following tables in your Neon database:
- `warehouse_snapshots` - Daily warehouse inventory data
- `bulletin_snapshots` - Daily bulletin volume/open interest data

### Environment Variables

Create a `scripts/.env` file with your Neon database connection:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Or use any of the other connection string formats provided by Neon.

### Automated Updates

The script runs automatically via GitHub Actions on a daily schedule (6:00 AM UTC). You can also trigger it manually from the GitHub Actions tab.

**Important:** Make sure to add `DATABASE_URL` as a GitHub Actions secret for the workflow to save data to the database.

### Manual Update

To update data manually:

1. Run the script:
   ```bash
   python scripts/update_data.py
   ```

2. Commit and push changes:
   ```bash
   git add public/data.json
   git commit -m "Update COMEX data"
   git push
   ```

### Historical Data Storage

The script saves daily snapshots to Neon database:
- Table: `warehouse_snapshots`
- Stores: date, metal, registered, eligible, total values
- Used for: Calculating daily percent changes displayed on the dashboard

The dashboard automatically fetches previous day's data from the database to show percent change indicators.
