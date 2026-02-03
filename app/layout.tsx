import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import dataJson from '@/public/data.json';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Get current month/year for dynamic title
const currentDate = new Date();
const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const metadata: Metadata = {
  metadataBase: new URL('https://heavymetalstats.com'),
  title: {
    default: `COMEX Silver & Gold Registered Inventory - Live Data ${monthYear} | Daily Updates`,
    template: '%s | COMEX Metals Inventory Tracker',
  },
  description: `Track COMEX registered silver inventory today: real-time warehouse stocks updated daily. See current gold, silver, copper inventory levels, coverage ratios & delivery data. Free CME Group data for ${monthYear}.`,
  keywords: [
    // High-volume exact match keywords from Search Console
    'comex silver registered inventory',
    'comex silver registered inventory today',
    'comex silver inventory',
    'comex registered silver inventory',
    'comex gold registered inventory',
    'comex platinum inventory',
    'comex inventory',
    'comex inventory today',
    'comex vault inventory',
    'comex warehouse stocks',
    // Current month keywords
    `comex silver inventory ${monthYear.toLowerCase()}`,
    `comex gold inventory ${monthYear.toLowerCase()}`,
    `comex registered inventory ${monthYear.toLowerCase()}`,
    // Long-tail keywords
    'comex silver warehouse stocks registered eligible',
    'cme silver inventory',
    'cme comex silver warehouse stocks',
    'comex silver inventory levels',
    'comex silver inventory chart',
    'total comex silver inventory',
    'current comex silver registered inventory',
    'latest comex silver registered inventory',
    // Broader terms
    'precious metals inventory',
    'gold warehouse stocks',
    'silver warehouse stocks',
    'CME Group warehouse data',
    'registered vs eligible inventory',
    'COMEX delivery notices',
    'silver supply shortage',
    'gold supply analysis',
    'metals market data',
    'commodity inventory tracking',
  ],
  authors: [{ name: 'Heavy Metal Stats' }],
  creator: 'Heavy Metal Stats',
  publisher: 'Heavy Metal Stats',
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
    title: `COMEX Silver & Gold Inventory - Live Registered Stock Data ${monthYear}`,
    description: `Free real-time COMEX warehouse inventory tracker. Check silver, gold, copper registered & eligible stocks updated daily. Coverage ratios, delivery trends & CME data for ${monthYear}.`,
    siteName: 'Heavy Metal Stats - COMEX Inventory Tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: `COMEX Silver & Gold Inventory Today - ${monthYear} Data`,
    description: 'Free live COMEX warehouse stocks. Track registered silver, gold, copper inventory levels updated daily from CME Group.',
  },
  category: 'finance',
  verification: {
    google: 'your-google-verification-code',
  },
  other: {
    'google-adsense-account': 'ca-pub-1319414449875714',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the last updated timestamp from data.json metadata
  let lastUpdatedText = 'February 2, 2026'; // Updated fallback
  let lastUpdatedISO = '2026-02-02';
  
  try {
    const metadata = (dataJson as { _metadata?: { last_updated?: string } })._metadata;
    if (metadata?.last_updated) {
      lastUpdatedISO = metadata.last_updated;
      // Use the date string directly if it's already formatted, otherwise parse it
      if (metadata.last_updated.includes(',')) {
        lastUpdatedText = metadata.last_updated;
      } else {
        const date = new Date(metadata.last_updated + 'T12:00:00');
        lastUpdatedText = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
  } catch (error) {
    console.error('Failed to parse last updated date:', error);
  }

  // Dynamic structured data with current date
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': 'https://heavymetalstats.com/#webapp',
        name: 'COMEX Metals Inventory Tracker',
        description: 'Real-time COMEX precious metals warehouse inventory tracking including gold, silver, copper registered and eligible stocks.',
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
        name: 'Heavy Metal Stats - COMEX Inventory Tracker',
        description: 'Track real-time COMEX precious metals warehouse inventory levels with supply coverage ratios and demand trends.',
        publisher: {
          '@type': 'Organization',
          name: 'Heavy Metal Stats',
          url: 'https://heavymetalstats.com',
        },
      },
      {
        '@type': 'Dataset',
        '@id': 'https://heavymetalstats.com/#dataset',
        name: 'COMEX Precious Metals Warehouse Inventory Data',
        description: 'Daily updated COMEX warehouse stocks including registered and eligible inventory for gold, silver, copper, platinum, palladium, and aluminum.',
        url: 'https://heavymetalstats.com',
        license: 'https://heavymetalstats.com/terms',
        creator: {
          '@type': 'Organization',
          name: 'CME Group',
          url: 'https://www.cmegroup.com',
        },
        temporalCoverage: `2025-01-01/${lastUpdatedISO}`,
        dateModified: lastUpdatedISO,
        keywords: [
          'COMEX inventory',
          'gold warehouse stocks',
          'silver registered inventory',
          'precious metals supply',
          'CME Group data',
        ],
        variableMeasured: [
          {
            '@type': 'PropertyValue',
            name: 'Registered Gold Inventory',
            unitText: 'troy ounces',
          },
          {
            '@type': 'PropertyValue',
            name: 'Registered Silver Inventory',
            unitText: 'troy ounces',
          },
          {
            '@type': 'PropertyValue',
            name: 'Eligible Gold Inventory',
            unitText: 'troy ounces',
          },
          {
            '@type': 'PropertyValue',
            name: 'Eligible Silver Inventory',
            unitText: 'troy ounces',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://heavymetalstats.com/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is COMEX registered inventory?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'COMEX registered inventory is metal that has been certified by an approved assayer and is available for delivery against futures contracts. It represents the immediately deliverable supply.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the difference between registered and eligible inventory?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Registered inventory can be delivered against futures contracts immediately. Eligible inventory meets exchange standards but is not currently available for delivery - it would need to be converted to registered status first.',
            },
          },
          {
            '@type': 'Question',
            name: 'How often is COMEX inventory data updated?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'CME Group releases warehouse stock data daily after market close. Our site updates this data nightly at 9:30 PM EST, with a one-day delay due to the CME release schedule.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is coverage ratio?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Coverage ratio measures how many months of average demand can be met by current registered inventory. A ratio of 5x means there is enough registered metal to cover 5 months of typical delivery demand.',
            },
          },
        ],
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
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Canonical URL - consolidate www and non-www */}
        <link rel="canonical" href="https://heavymetalstats.com" />
        
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
            <div className="absolute top-3 right-3 sm:top-4 sm:right-6 z-50 flex items-center gap-2 sm:gap-4">
              {/* Last Updated - Compact on mobile, full on desktop */}
              <div className="flex flex-col items-end gap-0.5 text-[10px] sm:text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="hidden sm:inline">Last updated: {lastUpdatedText} • CME Group</span>
                  <span className="sm:hidden">{lastUpdatedText}</span>
                </div>
                <span className="hidden sm:block text-xs text-slate-400">Updated nightly at 9:30 PM EST</span>
                <span className="hidden sm:block text-xs text-slate-400">Data is delayed by one day due to CME release schedule</span>
              </div>
              <ThemeToggle />
            </div>

            <main>
              {children}
            </main>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData),
              }}
            />
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
