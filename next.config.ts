import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },

  // Redirects for moved pages
  async redirects() {
    return [
      {
        source: '/learn/delivery',
        destination: '/delivery',
        permanent: true,
      },
    ];
  },

  async headers() {
    const securityHeaders = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.google https://*.googlesyndication.com https://*.googleadservices.com https://adservice.google.com https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline' https://*.googleapis.com",
          "img-src 'self' data: https: http: blob:",
          "font-src 'self' data: https:",
          "connect-src 'self' https:",
          "frame-src https://*.google.com https://*.doubleclick.net https://*.googlesyndication.com https://googleads.g.doubleclick.net",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self' https://accounts.google.com https://github.com https://discord.com",
        ].join('; ')
      }
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/opengraph-image:path(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/twitter-image:path(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
