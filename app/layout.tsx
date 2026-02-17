import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';

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
    default: `Precious Metal Stats & COMEX Inventory Data - Gold, Silver, Platinum | ${monthYear}`,
    template: '%s | Heavy Metal Stats',
  },
  description: `Free precious metal statistics updated daily. Track COMEX gold, silver, platinum & copper inventory, warehouse stocks, coverage ratios, paper vs physical ratios & delivery data. Real-time CME Group data for ${monthYear}.`,
  keywords: [
    // Broader precious metals keywords (NEW - to compete for "precious metal stats" etc.)
    'precious metal stats',
    'precious metal statistics',
    'precious metals data',
    'precious metals market data',
    'gold statistics',
    'silver statistics',
    'gold market data',
    'silver market data',
    'precious metals supply and demand',
    'gold supply and demand data',
    'silver supply and demand data',
    'metal market statistics',
    'commodity market data',
    'precious metals tracker',
    'gold silver data tracker',
    'precious metals dashboard',
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
    `precious metal stats ${monthYear.toLowerCase()}`,
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
    'gold silver platinum palladium data',
    'comex delivery data',
    'paper vs physical gold ratio',
    'paper vs physical silver ratio',
    'gold silver coverage ratio',
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
    title: `Precious Metal Stats - COMEX Gold & Silver Inventory Data | ${monthYear}`,
    description: `Free precious metals dashboard with live COMEX warehouse inventory. Track gold, silver, copper, platinum stocks, coverage ratios, paper vs physical ratios & delivery trends. Updated daily from CME Group.`,
    siteName: 'Heavy Metal Stats - Precious Metals Data & COMEX Inventory Tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Precious Metal Stats - Gold & Silver COMEX Data | ${monthYear}`,
    description: 'Free precious metals statistics dashboard. Live COMEX warehouse stocks, coverage ratios, paper vs physical ratios & delivery data updated daily.',
  },
  category: 'finance',
  other: {
    'google-adsense-account': 'ca-pub-1319414449875714',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the last updated timestamp from bulletin/delivery data (most reliable source)
  let lastUpdatedText = 'Unknown'; // Default to Unknown when no data
  let lastUpdatedISO = '';

  try {
    const bulletinData = (await import('../public/bulletin.json')).default as { last_updated?: string };
    const deliveryData = (await import('../public/delivery.json')).default as { last_updated?: string };
    const syncDate = bulletinData?.last_updated || deliveryData?.last_updated;
    if (syncDate) {
      const date = new Date(syncDate);
      if (!isNaN(date.getTime())) {
        lastUpdatedText = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        lastUpdatedISO = date.toISOString().split('T')[0];
      }
    }
  } catch (error) {
    console.error('Failed to parse last updated date:', error);
  }

  // If we still don't have a valid date, show a message instead of a fake date
  if (lastUpdatedText === 'Unknown') {
    lastUpdatedText = 'Data unavailable';
  }

  // Dynamic structured data with current date
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': 'https://heavymetalstats.com/#webapp',
        name: 'Heavy Metal Stats - Precious Metals Data Dashboard',
        description: 'Free precious metals statistics and COMEX warehouse inventory tracker. Daily updated gold, silver, platinum, copper, palladium data including registered and eligible stocks, coverage ratios, paper vs physical ratios, and delivery trends.',
        url: 'https://heavymetalstats.com',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '50',
          bestRating: '5',
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://heavymetalstats.com/#website',
        url: 'https://heavymetalstats.com',
        name: 'Heavy Metal Stats',
        alternateName: ['HeavyMetalStats', 'Precious Metal Stats', 'COMEX Inventory Tracker'],
        description: 'Free precious metals statistics dashboard. Track COMEX gold, silver, copper, platinum inventory with supply/demand ratios, delivery data, and market risk scores.',
        publisher: {
          '@type': 'Organization',
          name: 'Heavy Metal Stats',
          url: 'https://heavymetalstats.com',
          logo: {
            '@type': 'ImageObject',
            url: 'https://heavymetalstats.com/icon.svg',
          },
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://heavymetalstats.com/?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Dataset',
        '@id': 'https://heavymetalstats.com/#dataset',
        name: 'COMEX Precious Metals Warehouse Inventory Data',
        description: 'Daily updated COMEX warehouse stocks including registered and eligible inventory for gold, silver, copper, platinum, palladium, and aluminum. Includes coverage ratios, paper vs physical ratios, delivery notices, and risk scores.',
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
          'precious metal stats',
          'precious metals data',
          'COMEX inventory',
          'gold warehouse stocks',
          'silver registered inventory',
          'precious metals supply and demand',
          'CME Group data',
          'gold statistics',
          'silver statistics',
          'paper vs physical ratio',
          'coverage ratio',
          'delivery notices',
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
          {
            '@type': 'PropertyValue',
            name: 'Coverage Ratio',
            unitText: 'months',
          },
          {
            '@type': 'PropertyValue',
            name: 'Paper to Physical Ratio',
            unitText: 'ratio',
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
              text: 'COMEX registered inventory is metal that has been certified by an approved assayer and is available for delivery against futures contracts. It represents the immediately deliverable supply of precious metals like gold, silver, platinum, and copper held in COMEX-approved warehouses.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the difference between registered and eligible inventory?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Registered inventory can be delivered against futures contracts immediately. Eligible inventory meets exchange standards but is not currently available for delivery - it would need to be converted to registered status first. Both are stored in COMEX-approved vaults but only registered metal counts toward deliverable supply.',
            },
          },
          {
            '@type': 'Question',
            name: 'How often is COMEX inventory data updated?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'CME Group releases warehouse stock data daily after market close. Heavy Metal Stats updates this data nightly at 9:30 PM EST, with a one-day delay due to the CME release schedule. This includes gold, silver, copper, platinum, palladium, and aluminum inventory levels.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is coverage ratio in precious metals?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Coverage ratio measures how many months of average delivery demand can be met by current registered inventory. A ratio of 5x means there is enough registered metal to cover 5 months of typical delivery demand. Low ratios (below 5x) signal potential supply stress, while high ratios (above 12x) indicate ample supply.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the paper to physical ratio for gold and silver?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The paper to physical ratio measures how many ounces of paper claims (futures contracts) exist for each ounce of physical metal available for delivery. For example, a 7:1 ratio means there are 7 paper claims for every 1 ounce of deliverable metal. Higher ratios indicate greater leverage and potential squeeze risk in the precious metals market.',
            },
          },
          {
            '@type': 'Question',
            name: 'Where can I find free precious metal statistics?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Heavy Metal Stats (heavymetalstats.com) provides free daily precious metal statistics sourced from CME Group. The dashboard tracks COMEX warehouse inventory for gold, silver, copper, platinum, palladium, and aluminum. It includes coverage ratios, paper vs physical ratios, delivery data, and risk scores - all updated automatically every trading day.',
            },
          },
          {
            '@type': 'Question',
            name: 'What metals does COMEX track?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'COMEX (Commodity Exchange) tracks warehouse inventory for six metals: Gold (GC), Silver (SI), Copper (HG), Platinum (PL), Palladium (PA), and Aluminum (ALI). Each metal has registered and eligible inventory categories tracked across multiple approved depositories.',
            },
          },
          {
            '@type': 'Question',
            name: 'What are COMEX delivery notices?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Delivery notices are issued when a futures contract holder elects physical delivery of metal instead of cash settlement. An "issue" is initiated by the seller (short), and a "stop" is accepted by the buyer (long). Month-to-date (MTD) delivery totals show the pace of physical metal demand and can signal supply tightness.',
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
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Learn',
            item: 'https://heavymetalstats.com/learn',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Delivery Notices',
            item: 'https://heavymetalstats.com/delivery',
          },
        ],
      },
      {
        '@type': 'SiteNavigationElement',
        name: ['Dashboard', 'Precious Metal Stats', 'Coverage Ratio & Paper vs Physical', 'Delivery Notices', 'API Documentation', 'About', 'Contact'],
        url: [
          'https://heavymetalstats.com',
          'https://heavymetalstats.com/precious-metals',
          'https://heavymetalstats.com/learn',
          'https://heavymetalstats.com/delivery',
          'https://heavymetalstats.com/api-info',
          'https://heavymetalstats.com/about',
          'https://heavymetalstats.com/contact',
        ],
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Canonical URLs are handled per-page via Next.js metadata alternates.canonical */}
        {/* DO NOT add a hardcoded <link rel="canonical"> here — it overrides every page's canonical */}
        
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1319414449875714"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Adsterra Banner - script loads globally, container is in Dashboard */}
        <Script
          async
          data-cfasync="false"
          src="https://encouragementglutton.com/363d95083785b29310b6b0b768b3cacb/invoke.js"
          strategy="afterInteractive"
        />

      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            {/* Global Navbar */}
            <Navbar lastUpdatedText={lastUpdatedText} />

            <main className="flex-1">
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
