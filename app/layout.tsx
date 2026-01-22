import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'COMEX Metals Inventory Tracker | Real-Time Supply & Demand Analysis',
  description: 'Monitor real-time COMEX precious metals warehouse inventory levels. Track gold, silver, copper, and aluminum stocks with supply coverage ratios and demand trends.',
  keywords: [
    'COMEX', 
    'precious metals', 
    'gold inventory', 
    'silver inventory', 
    'warehouse stocks', 
    'supply and demand', 
    'metals tracker', 
    'CME Group', 
    'registered inventory', 
    'eligible inventory', 
    'metals analysis', 
    'commodities tracking',
    'silver squeeze',
    'gold tracking',
    'platinum inventory',
    'palladium inventory'
  ],
  authors: [{ name: 'COMEX Metals Dashboard' }],
  creator: 'COMEX Metals Dashboard',
  publisher: 'COMEX Metals Dashboard',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://comex-metals.vercel.app', // Placeholder URL
    title: 'COMEX Metals Inventory Tracker | Real-Time Supply & Demand Analysis',
    description: 'Monitor real-time COMEX precious metals warehouse inventory levels. Track gold, silver, copper, and aluminum stocks with supply coverage ratios.',
    siteName: 'COMEX Metals Dashboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COMEX Metals Inventory Tracker | Real-Time Supply & Demand Analysis',
    description: 'Monitor real-time COMEX precious metals warehouse inventory levels. Track gold, silver, and other metals.',
    creator: '@ComexTracker', // Placeholder
  },
  category: 'finance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen">
            {/* Theme Toggle & Last Updated - Static position */}
            <div className="absolute top-4 right-6 z-50 flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>Last updated: January 21, 2026 • CME Group</span>
              </div>
              <ThemeToggle />
            </div>

            <main>
              {children}
            </main>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebApplication',
                  name: 'COMEX Metals Inventory Tracker',
                  description: 'Real-time supply and demand tracking for COMEX precious metals warehouse inventory.',
                  applicationCategory: 'FinanceApplication',
                  operatingSystem: 'All',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                }),
              }}
            />
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
