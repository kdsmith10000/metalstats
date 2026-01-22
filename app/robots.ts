import { MetadataRoute } from 'next';

const baseUrl = 'https://metalstats.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Default rules for all crawlers
        userAgent: '*',
        allow: '/',
        disallow: [
          '/private/',
          '/api/',
          '/_next/',      // Next.js internal files
          '/static/',     // Static assets (if any)
        ],
      },
      {
        // Google's main crawler - full access
        userAgent: 'Googlebot',
        allow: '/',
      },
      {
        // Google's image crawler
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
      {
        // Bing crawler
        userAgent: 'Bingbot',
        allow: '/',
      },
      {
        // DuckDuckGo crawler
        userAgent: 'DuckDuckBot',
        allow: '/',
      },
      {
        // Block AI training crawlers (optional - remove if you want AI indexing)
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
