import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import { getLatestSnapshots, isDatabaseAvailable } from '@/lib/db';

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
  metadataBase: new URL('https://heavymetalstats.com'),
  title: {
    default: 'COMEX Metals Inventory Tracker | Real-Time Gold & Silver Supply Analysis',
    template: '%s | COMEX Metals Tracker',
  },
  description: 'Track real-time COMEX precious metals warehouse inventory levels. Monitor gold, silver, copper, and aluminum stocks with live supply coverage ratios, demand trends, and delivery data from CME Group.',
  keywords: [
    'COMEX',
    'COMEX inventory',
    'COMEX warehouse stocks',
    'precious metals',
    'gold inventory',
    'silver inventory',
    'gold warehouse',
    'silver warehouse',
    'warehouse stocks',
    'supply and demand',
    'metals tracker',
    'CME Group',
    'CME Group data',
    'registered inventory',
    'eligible inventory',
    'metals analysis',
    'commodities tracking',
    'silver squeeze',
    'gold tracking',
    'platinum inventory',
    'palladium inventory',
    'copper inventory',
    'aluminum inventory',
    'gold delivery',
    'silver delivery',
    'COMEX delivery notices',
    'precious metals supply',
    'gold supply shortage',
    'silver supply shortage',
    'metals dashboard',
    'commodity prices',
    'gold market',
    'silver market',
  ],
  authors: [{ name: 'Metal Stats' }],
  creator: 'Metal Stats',
  publisher: 'Metal Stats',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://heavymetalstats.com',
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
    url: 'https://heavymetalstats.com',
    title: 'COMEX Metals Inventory Tracker | Real-Time Gold & Silver Supply Analysis',
    description: 'Track real-time COMEX precious metals warehouse inventory levels. Monitor gold, silver, copper, and aluminum stocks with live supply coverage ratios and demand trends.',
    siteName: 'Metal Stats - COMEX Metals Dashboard',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'COMEX Metals Inventory Tracker Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COMEX Metals Inventory Tracker | Real-Time Supply Analysis',
    description: 'Track real-time COMEX precious metals warehouse inventory. Monitor gold, silver, copper & aluminum stocks with live supply coverage ratios.',
    images: ['/og-image.png'],
  },
  category: 'finance',
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification code
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the latest report date from the database
  let lastUpdatedText = 'January 22, 2026'; // Default fallback
  
  if (isDatabaseAvailable()) {
    try {
      const snapshots = await getLatestSnapshots();
      if (snapshots.length > 0) {
        const reportDate = snapshots[0].report_date;
        if (reportDate) {
          const date = new Date(reportDate);
          lastUpdatedText = date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch last updated date:', error);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1319414449875714"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen">
            {/* Theme Toggle & Last Updated - Static position */}
            <div className="absolute top-4 right-4 sm:right-6 z-50 flex items-center gap-4">
              {/* Last Updated - Hidden on mobile, shown on sm: and larger */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>Last updated: {lastUpdatedText} • CME Group</span>
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
                  '@graph': [
                    {
                      '@type': 'WebApplication',
                      '@id': 'https://heavymetalstats.com/#webapp',
                      name: 'COMEX Metals Inventory Tracker',
                      description: 'Real-time supply and demand tracking for COMEX precious metals warehouse inventory including gold, silver, copper, and aluminum.',
                      url: 'https://heavymetalstats.com',
                      applicationCategory: 'FinanceApplication',
                      operatingSystem: 'All',
                      browserRequirements: 'Requires JavaScript',
                      offers: {
                        '@type': 'Offer',
                        price: '0',
                        priceCurrency: 'USD',
                      },
                    },
                    {
                      '@type': 'WebSite',
                      '@id': 'https://heavymetalstats.com/#website',
                      url: 'https://heavymetalstats.com',
                      name: 'Metal Stats - COMEX Metals Dashboard',
                      description: 'Track real-time COMEX precious metals warehouse inventory levels with supply coverage ratios and demand trends.',
                      publisher: {
                        '@type': 'Organization',
                        name: 'Metal Stats',
                      },
                    },
                    {
                      '@type': 'FinancialProduct',
                      '@id': 'https://heavymetalstats.com/#service',
                      name: 'COMEX Metals Data Tracker',
                      description: 'Free real-time tracking of COMEX warehouse inventory for gold, silver, copper, and aluminum with CME Group data.',
                      provider: {
                        '@type': 'Organization',
                        name: 'Metal Stats',
                      },
                      category: 'Financial Data Service',
                    },
                    {
                      '@type': 'BreadcrumbList',
                      '@id': 'https://heavymetalstats.com/#breadcrumb',
                      itemListElement: [
                        {
                          '@type': 'ListItem',
                          position: 1,
                          name: 'Home',
                          item: 'https://heavymetalstats.com',
                        },
                      ],
                    },
                  ],
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
