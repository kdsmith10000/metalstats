import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel
  output: 'standalone',
  
  // Optimize images
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

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.monetag.com https://quge5.com https://5gvci.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.google https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://*.googleapis.com",
              "img-src 'self' data: https: http: blob:",
              "font-src 'self' data: https:",
              "connect-src 'self' https:",
              "frame-src https://*.google.com https://*.doubleclick.net",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com https://github.com https://discord.com https://appleid.apple.com https://www.reddit.com https://login.microsoftonline.com https://twitter.com https://api.twitter.com",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
