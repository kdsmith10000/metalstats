import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, ChevronRight, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog — Metals Market Analysis, Squeeze Alerts & Geopolitical Insights',
  description: 'Expert analysis on precious and base metals markets. Supply and demand insights, COMEX inventory trends, geopolitical impacts, short squeeze scenarios, and war-driven price analysis for gold, silver, copper, platinum, and palladium.',
  keywords: [
    'metals market analysis',
    'gold market blog',
    'silver squeeze analysis',
    'COMEX inventory analysis',
    'precious metals blog',
    'metals market commentary',
    'gold geopolitical risk',
    'silver supply demand analysis',
    'copper market outlook',
    'metals short squeeze',
    'gold war premium',
    'precious metals geopolitics',
    'COMEX delivery squeeze',
    'paper to physical ratio analysis',
    'metals supply chain disruption',
    'Iran metals market impact',
    'gold safe haven analysis',
    'silver industrial demand',
    'defense spending metals',
    'metals market forecast',
  ],
  alternates: {
    canonical: 'https://heavymetalstats.com/blog',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    title: 'Blog — Metals Market Analysis & Squeeze Alerts | Heavy Metal Stats',
    description: 'Expert analysis on precious and base metals markets. COMEX data insights, geopolitical risk assessment, supply/demand trends, and squeeze scenario analysis for gold, silver, copper, and platinum.',
    url: 'https://heavymetalstats.com/blog',
    type: 'website',
    siteName: 'Heavy Metal Stats',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Metals Market Blog — Analysis & Squeeze Alerts | Heavy Metal Stats',
    description: 'Expert precious metals analysis. COMEX inventory trends, geopolitical risk, supply/demand insights, and squeeze scenarios for gold, silver, copper & platinum.',
  },
};

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  featured?: boolean;
}

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'iran-tensions-metals-squeeze',
    title: 'Iran War Tensions & the Metals Market: Could Supply Disruptions Trigger a Squeeze?',
    excerpt: 'Rising geopolitical tensions with Iran threaten critical supply chains for precious and base metals. We examine how a potential conflict could disrupt production, spike demand for safe-haven assets, and create the conditions for a historic squeeze in the metals market.',
    date: 'February 18, 2026',
    readTime: '12 min read',
    tags: ['Geopolitics', 'Supply & Demand', 'Gold', 'Silver', 'Copper'],
    featured: true,
  },
];

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': 'https://heavymetalstats.com/blog',
  name: 'Heavy Metal Stats Blog — Metals Market Analysis & Insights',
  description: 'Expert analysis on precious and base metals markets. Supply and demand insights, COMEX inventory trends, geopolitical impacts, and squeeze scenario analysis.',
  url: 'https://heavymetalstats.com/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Heavy Metal Stats',
    url: 'https://heavymetalstats.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://heavymetalstats.com/icon.svg',
    },
  },
  blogPost: [
    {
      '@type': 'BlogPosting',
      headline: 'Iran War Tensions & the Metals Market: Could Supply Disruptions Trigger a Squeeze?',
      description: 'Analysis of how escalating US-Iran tensions could disrupt metals supply chains and trigger a squeeze in gold, silver, and copper.',
      url: 'https://heavymetalstats.com/blog/iran-tensions-metals-squeeze',
      datePublished: '2026-02-18T12:00:00Z',
      author: { '@type': 'Organization', name: 'Heavy Metal Stats' },
      keywords: 'Iran, gold, silver, copper, COMEX, squeeze, geopolitics',
    },
  ],
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://heavymetalstats.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://heavymetalstats.com/blog' },
    ],
  },
};

export default function BlogIndex() {
  const featured = BLOG_POSTS.find((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/30">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-12 flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3 text-center">
          Blog
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 sm:mb-12 text-center max-w-2xl px-2">
          Market analysis, supply &amp; demand insights, and geopolitical commentary on the metals market.
        </p>

        {/* Featured Post */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="group w-full max-w-3xl mb-10"
          >
            <article className="py-8">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <TrendingUp className="w-3 h-3" />
                    Featured
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {featured.date}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {featured.readTime}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300 leading-tight tracking-tight">
                  {featured.title}
                </h2>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-[15px]">
                  {featured.excerpt}
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {featured.tags.map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 whitespace-nowrap"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 group-hover:gap-3 transition-all duration-300">
                  Read article
                  <ChevronRight className="w-4 h-4" />
                </span>
            </article>
          </Link>
        )}

        {/* Other Posts */}
        {rest.length > 0 && (
          <div className="w-full max-w-3xl grid gap-6">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                      className="shrink-0 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 whitespace-nowrap" style={{ paddingLeft: '1.44em', paddingRight: '1.44em', paddingTop: '0.35em', paddingBottom: '0.35em' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                </article>
              </Link>
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full px-6 text-center">
          <p className="text-sm text-slate-400">
            Data from CME Group. Informational only — not financial advice.
          </p>
          <nav className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300">Dashboard</Link>
            <Link href="/precious-metals" className="hover:text-slate-600 dark:hover:text-slate-300">Precious Metal Stats</Link>
            <Link href="/learn" className="hover:text-slate-600 dark:hover:text-slate-300">Learn</Link>
            <Link href="/delivery" className="hover:text-slate-600 dark:hover:text-slate-300">Delivery Notices</Link>
            <Link href="/blog" className="hover:text-slate-600 dark:hover:text-slate-300">Blog</Link>
            <Link href="/api-info" className="hover:text-slate-600 dark:hover:text-slate-300">API</Link>
            <Link href="/contact" className="hover:text-slate-600 dark:hover:text-slate-300">Contact</Link>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
