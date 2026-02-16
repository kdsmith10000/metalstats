import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel
  output: 'standalone',
  
  // Optimize images
  images: {
    unoptimized: true,
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://pagead2.googlesyndication.com https://encouragementglutton.com https://translate.google.com https://translate.googleapis.com", // 'unsafe-eval' needed for Next.js, 'unsafe-inline' for inline scripts
              "style-src 'self' 'unsafe-inline' https://translate.googleapis.com", // 'unsafe-inline' needed for Tailwind CSS and Next.js
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https: https://fonts.gstatic.com",
              "connect-src 'self' https:",
              "frame-src https://translate.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
