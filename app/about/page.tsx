import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'About Heavy Metal Stats',
  description: 'Learn about Heavy Metal Stats — a free, independent dashboard tracking COMEX warehouse inventory data for precious and base metals. Updated daily from CME Group reports.',
  alternates: {
    canonical: 'https://heavymetalstats.com/about',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'About Heavy Metal Stats | COMEX Metals Tracker',
    description: 'Learn about Heavy Metal Stats — a free, independent dashboard tracking COMEX warehouse inventory data for precious and base metals.',
    url: 'https://heavymetalstats.com/about',
  },
  other: {
    'google-adsense-account': 'ca-pub-1319414449875714',
  },
};

export default function About() {
  const sections = [
    {
      title: 'What is Heavy Metal Stats?',
      content: 'Heavy Metal Stats is a free, independent dashboard that tracks COMEX warehouse inventory data for precious and base metals. We aggregate publicly available data from CME Group and present it in a clean, accessible format — making it easy to monitor gold, silver, copper, platinum, palladium, and aluminum warehouse stocks at a glance.',
    },
    {
      title: 'Our Mission',
      content: 'Our mission is to make COMEX data accessible and understandable for everyone — from retail investors and researchers to metals enthusiasts and market watchers. The raw data published by CME Group can be difficult to navigate and interpret. Heavy Metal Stats transforms that data into clear visuals, meaningful ratios, and actionable insights, all completely free of charge.',
    },
    {
      title: 'What Data We Track',
      content: 'We track a comprehensive set of COMEX metrics updated daily, including: registered and eligible warehouse stocks for six metals (gold, silver, copper, platinum, palladium, aluminum), coverage ratios that measure months of deliverable supply, paper vs physical ratios showing futures contract leverage against real metal, month-to-date delivery notices (issues and stops), supply risk scores, and short-term price forecasts based on inventory trends.',
    },
    {
      title: 'Data Sources',
      content: 'All data on Heavy Metal Stats is sourced from publicly available CME Group reports, including daily depository statistics and DLV665-T delivery reports. Our automated pipeline fetches and processes updated data nightly at 9:30 PM EST. Data is delayed by one business day due to the CME release schedule. We do not fabricate, estimate, or editorialize the raw numbers — what you see comes directly from the exchange.',
    },
    {
      title: 'Who Built This',
      content: 'Heavy Metal Stats was built and is maintained by an independent developer passionate about metals market transparency. This project started from a simple desire: to have a single, clean place to check COMEX inventory data without digging through PDFs or paywalled services. It remains an independent, community-focused project with no affiliation to CME Group, any brokerage, or financial institution.',
    },
    {
      title: 'Disclaimer',
      content: 'Heavy Metal Stats is an informational tool only. Nothing on this site constitutes financial advice, investment recommendations, or buy/sell signals. Data may be delayed or contain errors. Always verify information independently and consult a qualified financial advisor before making investment decisions.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-8 lg:px-24">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-16"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-6">
            About Heavy Metal Stats
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Free COMEX warehouse inventory data for everyone.
          </p>
        </div>

        <div className="grid gap-6">
          {sections.map((section, index) => (
            <div 
              key={index}
              className="p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                {section.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer nav for internal linking / crawlability */}
        <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <nav className="flex flex-wrap justify-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/precious-metals" className="hover:text-slate-600 dark:hover:text-slate-300">Precious Metal Stats</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</Link>
            <Link href="/learn/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</Link>
            <Link href="/api-info" className="hover:text-slate-600 dark:hover:text-slate-300">API &amp; Data Sources</Link>
            <Link href="/contact" className="hover:text-slate-600 dark:hover:text-slate-300">Contact</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
