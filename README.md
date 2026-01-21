# COMEX Metals Dashboard

A modern, polished dashboard for tracking COMEX precious and base metals supply and demand data.

## Features

- **Real-time Supply Overview**: Track warehouse inventory levels for Silver, Aluminum, and Platinum/Palladium
- **Coverage Ratio Analysis**: Visual gauges showing supply coverage relative to monthly demand
- **Interactive Depository Tables**: Sortable vault breakdown with percentage bars
- **Demand Charts**: Monthly delivery data with year-over-year comparisons
- **Dark/Light Theme**: Toggle between themes with smooth transitions
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Theme**: next-themes
- **Icons**: Lucide React
- **Fonts**: Geist (Vercel's modern font)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Building for Production

```bash
npm run build
```

## Updating Data

1. Run the Python script to fetch latest CME data:
   ```bash
   python ../update_warehouse_stocks.py
   ```

2. Copy the updated JSON to the public folder:
   ```bash
   cp ../warehouse_stocks_data.json public/data.json
   ```

3. Rebuild and deploy

## Deploying to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: GitHub Integration

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will auto-detect Next.js and deploy

### Environment Variables

No environment variables are required for basic deployment.

## Project Structure

```
metals-dashboard/
├── app/
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Tailwind + custom CSS
├── components/
│   ├── Dashboard.tsx       # Main dashboard grid
│   ├── MetalCard.tsx       # Supply/demand card per metal
│   ├── DepositoryTable.tsx # Vault breakdown table
│   ├── RatioGauge.tsx      # Visual coverage ratio indicator
│   ├── DemandChart.tsx     # Monthly delivery bar chart
│   ├── ThemeToggle.tsx     # Dark/light switch
│   ├── ThemeProvider.tsx   # Theme context provider
│   └── StatusBadge.tsx     # ADEQUATE/STRESS badges
├── lib/
│   └── data.ts             # Type definitions + utilities
├── public/
│   └── data.json           # Static warehouse stocks data
└── package.json
```

## Data Source

Data is fetched from CME Group's official depository reports:
- Silver: https://www.cmegroup.com/delivery_reports/Silver_stocks.xls
- Aluminum: https://www.cmegroup.com/delivery_reports/Aluminum_Stocks.xls
- Platinum/Palladium: https://www.cmegroup.com/delivery_reports/PA-PL_Stck_Rprt.xls

## License

MIT
