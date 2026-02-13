# COMEX Metals Dashboard

A real-time analytics platform for tracking COMEX precious and base metals — warehouse inventory, delivery flows, open interest, price forecasting, and physical market stress signals.

Live at [metalstats.vercel.app](https://metalstats.vercel.app)

## Features

- **Warehouse Inventory Tracking** — Real-time registered/eligible stocks for Gold, Silver, Copper, Platinum, and Palladium with supply coverage ratios and drawdown alerts
- **Daily Bulletin Dashboard** — Parsed CME bulletin data with volume, open interest, and settlement prices
- **Price Forecasting (v1.1.0)** — ARIMA-based directional forecasts with composite scoring from trend momentum, physical stress, and market activity signals. Uses spot prices via physical ETFs (GLD, SLV, PPLT, PALL)
- **Paper vs Physical Ratios** — Tracks open interest relative to deliverable supply to gauge squeeze risk
- **Risk Scoring** — Multi-factor risk scores per metal based on inventory, delivery pace, and coverage erosion
- **Live Spot Prices** — Real-time prices from Yahoo Finance via physical metal ETFs, refreshing every 60 seconds
- **Delivery Analysis** — Daily, month-to-date, and year-to-date delivery tracking with historical comparison
- **Newsletter** — Automated daily market summary emails via Resend
- **Dark Mode** — Full light/dark theme support

## Tech Stack

- **Next.js 16** — App Router with React 19
- **TypeScript** — End-to-end type safety
- **Tailwind CSS v4** — Styling
- **Recharts** — Interactive data visualization
- **Neon PostgreSQL** — Serverless Postgres for time-series data
- **Vercel** — Hosting, edge functions, and cron jobs
- **Python** — Data parsing, DB sync, and forecast engine (pandas, pmdarima, scipy)
- **Stripe** — Subscription billing
- **Resend** — Transactional email

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for data scripts and forecasting)
- A Neon PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/kdsmith10000/metalstats.git
cd metalstats

# Install Node dependencies
npm install

# Install Python dependencies (for forecast engine)
pip install -r requirements-forecast.txt

# Set up environment variables
cp .env.example .env   # Then fill in your DATABASE_URL, etc.

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string (pooled) |
| `DATABASE_URL_UNPOOLED` | Direct connection (for migrations) |

Additional variables for optional features: Stripe keys, Resend API key, Vercel Blob token.

## Forecast Engine

The forecast engine (`forecast.py`) generates directional price predictions for all five COMEX metals using:

1. **ARIMA Model** — Auto-tuned time-series model (via pmdarima) producing 5-day and 20-day price projections with confidence intervals
2. **Trend Momentum** (30% weight) — SMA crossovers, MACD, RSI, rate of change
3. **Physical Stress** (35% weight) — Inventory drawdowns, delivery acceleration, paper/physical ratio, coverage erosion
4. **Market Activity** (15% weight) — Open interest expansion/contraction, volume anomalies
5. **Composite Scoring** — Weighted blend producing BULLISH/NEUTRAL/BEARISH direction with confidence percentage

### Spot Prices (v1.1.0)

All prices use **spot market** levels derived from physical metal ETFs rather than COMEX futures, which can carry significant premiums (e.g. 10%+ for silver during tariff-driven contango):

| Metal | ETF Source | Conversion |
|-------|-----------|------------|
| Gold | GLD (SPDR Gold Trust) | Share price / 0.09155 oz |
| Silver | SLV (iShares Silver Trust) | Share price / 1.0 oz |
| Copper | HG=F (COMEX futures) | Direct (no spot ETF) |
| Platinum | PPLT (abrdn Platinum ETF) | Share price / 0.09385 oz |
| Palladium | PALL (abrdn Palladium ETF) | Share price / 0.09385 oz |

### Running the Forecast

```bash
# Full forecast with database access
python forecast.py

# Rebase existing forecast to current spot prices (no DB needed)
python rebase_forecast_to_spot.py
```

Output is written to `public/forecast.json` and forecast snapshots are stored in the database for accuracy tracking.

## Data Pipeline

```
CME Group Reports
    │
    ├── scripts/update_data.py          → public/data.json (warehouse stocks)
    ├── scripts/parse_bulletin.py       → public/bulletin.json (daily bulletin)
    ├── scripts/parse_delivery*.py      → public/delivery*.json (deliveries)
    └── scripts/sync-*-to-db.mjs       → Neon PostgreSQL
                                              │
                                              ├── /api/bulletin/*
                                              ├── /api/metals/*
                                              ├── /api/delivery/*
                                              ├── /api/forecast/*
                                              ├── /api/risk-score/*
                                              ├── /api/paper-physical/*
                                              └── /api/prices/* (Yahoo Finance)
```

## Automated Updates

Daily updates run via GitHub Actions (`.github/workflows/update-comex-data.yml`):

1. Runs at 6:00 AM UTC
2. Fetches latest CME Group delivery reports
3. Updates `public/data.json`
4. Commits and pushes changes
5. Triggers Vercel redeployment

A Vercel cron job sends the daily newsletter at 6:30 AM UTC.

### Manual Update

```bash
# Update warehouse stock data
python scripts/update_data.py

# Sync all data to database
node scripts/sync-all-to-db.mjs

# Generate new forecast
python forecast.py
```

## Project Structure

```
metalstats/
├── app/
│   ├── api/                    # API routes
│   │   ├── prices/             #   Live spot prices (Yahoo Finance ETFs)
│   │   ├── forecast/           #   Forecast data, accuracy, tracking
│   │   ├── bulletin/           #   Daily bulletin data
│   │   ├── metals/             #   Metal inventory and history
│   │   ├── delivery/           #   Delivery history
│   │   ├── risk-score/         #   Risk score calculations
│   │   ├── paper-physical/     #   Paper/physical ratios
│   │   ├── newsletter/         #   Newsletter subscribe/send
│   │   └── stripe/             #   Subscription billing
│   ├── precious-metals/        # Main dashboard page
│   ├── learn/                  # Educational content
│   └── layout.tsx, page.tsx    # Root layout and landing
├── components/
│   ├── Dashboard.tsx           # Warehouse inventory dashboard
│   ├── BulletinDashboard.tsx   # Daily bulletin view
│   ├── ForecastDashboard.tsx   # Price forecasting dashboard
│   ├── DeliverySection.tsx     # Delivery analysis
│   ├── VolumeOIChart.tsx       # Volume and open interest
│   ├── PaperPhysicalCard.tsx   # Paper/physical ratio cards
│   └── ...                     # MetalCard, RatioGauge, etc.
├── lib/
│   ├── db.ts                   # Neon PostgreSQL client and types
│   ├── data.ts                 # Data types and helpers
│   ├── riskScore.ts            # Risk score calculation
│   └── newsletter-engine.ts    # Newsletter HTML generation
├── public/                     # Static JSON data files
│   ├── forecast.json           #   Current forecast output
│   ├── data.json               #   Warehouse stock data
│   ├── bulletin.json           #   Daily bulletin
│   └── delivery*.json          #   Delivery data
├── scripts/                    # Python/Node data pipeline
├── forecast.py                 # ARIMA forecast engine
├── rebase_forecast_to_spot.py  # Spot price rebasing utility
├── push_to_db.py               # Database sync script
└── requirements-forecast.txt   # Python dependencies
```

## Data Sources

- **CME Group** — Warehouse stocks, delivery reports, bulletins ([cmegroup.com/delivery_reports](https://www.cmegroup.com/delivery_reports))
- **Yahoo Finance** — Live spot prices via physical metal ETF chart API (GLD, SLV, PPLT, PALL, HG=F)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables (`DATABASE_URL`, etc.)
4. Deploy — auto-redeploys on push

## Security

See [SECURITY.md](./SECURITY.md) for security policies and reporting guidelines.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
