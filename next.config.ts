import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel
  output: 'standalone',
  
  // Optimize images
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
