# Data Update Scripts

## update_data.py

This script fetches the latest warehouse and depository stocks data from CME Group Excel files and updates the `public/data.json` file used by the Next.js dashboard.

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

Install with:
```bash
pip install requests pandas openpyxl xlrd lxml html5lib
```

### Automated Updates

The script runs automatically via GitHub Actions on a daily schedule (6:00 AM UTC). You can also trigger it manually from the GitHub Actions tab.

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
