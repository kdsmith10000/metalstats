# COMEX Metals Dashboard

A modern, real-time dashboard for tracking COMEX warehouse inventory levels and supply coverage ratios for precious and base metals.

## Features

- **Real-time Data**: Automatically fetches and displays warehouse stocks from CME Group
- **Supply Coverage Analysis**: Visual indicators for supply stress levels
- **Interactive Charts**: Monthly delivery trends comparison
- **Modern UI**: Clean, responsive design with dark mode support
- **Auto-updates**: Daily automated data updates via GitHub Actions

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Framer Motion** - Animations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/kdsmith10000/metalstats.git
cd metalstats

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Automated Data Updates

The dashboard automatically updates daily via GitHub Actions. The workflow:

1. Runs daily at 6:00 AM UTC
2. Fetches latest data from CME Group Excel files
3. Updates `public/data.json`
4. Commits and pushes changes
5. Triggers Vercel deployment (if configured)

### Manual Update

To manually trigger an update:

1. Go to GitHub Actions tab
2. Select "Update COMEX Data" workflow
3. Click "Run workflow"

Or run locally:

```bash
python scripts/update_data.py
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically on push

The dashboard will automatically redeploy when data is updated via GitHub Actions.

### Environment Variables

No environment variables required for basic functionality.

## Project Structure

```
metals-dashboard/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard
│   ├── DemandChart.tsx    # Delivery trends chart
│   └── ...
├── lib/                   # Utilities
│   └── data.ts           # Data types and helpers
├── scripts/               # Data update scripts
│   └── update_data.py    # Python script for fetching data
├── public/               # Static files
│   └── data.json         # Warehouse stocks data
└── .github/
    └── workflows/        # GitHub Actions
        └── update-comex-data.yml
```

## Data Sources

Data is fetched from CME Group delivery reports:
- Gold: https://www.cmegroup.com/delivery_reports/Gold_stocks.xls
- Silver: https://www.cmegroup.com/delivery_reports/Silver_stocks.xls
- Aluminum: https://www.cmegroup.com/delivery_reports/Aluminum_Stocks.xls
- Platinum/Palladium: https://www.cmegroup.com/delivery_reports/PA-PL_Stck_Rprt.xls
- And more...

## Security

See [SECURITY.md](./SECURITY.md) for security policies and reporting guidelines.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
