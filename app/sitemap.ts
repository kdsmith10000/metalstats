import { MetadataRoute } from 'next';

const baseUrl = 'https://heavymetalstats.com';

// Static page last modified dates (update these when you modify pages)
const STATIC_PAGES_LAST_MODIFIED = '2026-01-22';

export default function sitemap(): MetadataRoute.Sitemap {
  // Main pages with dynamic data (updates daily via GitHub Actions)
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(), // Updates daily with new COMEX data
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // Informational pages (semi-static)
  const infoPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/api-info`,
      lastModified: new Date(STATIC_PAGES_LAST_MODIFIED),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // Legal pages (rarely change)
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(STATIC_PAGES_LAST_MODIFIED),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(STATIC_PAGES_LAST_MODIFIED),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];

  return [...mainPages, ...infoPages, ...legalPages];
}
