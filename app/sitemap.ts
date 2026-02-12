import { MetadataRoute } from 'next';

const baseUrl = 'https://heavymetalstats.com';

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

  // Educational/informational pages (high SEO value - keyword-rich content)
  const infoPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/precious-metals`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/learn/delivery`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/api-info`,
      lastModified: new Date('2026-01-22'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Legal pages (rarely change)
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2026-01-22'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2026-01-22'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  return [...mainPages, ...infoPages, ...legalPages];
}
