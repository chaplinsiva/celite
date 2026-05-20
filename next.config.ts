import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "wkbjgnyxqluquhqfhwic.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "preview.celite.in",
      },
    ],
  },
  // Set outputFileTracingRoot to avoid workspace detection issues with parent directory
  outputFileTracingRoot: __dirname,
  // Increase body size limit for large file uploads (source files, videos, etc.)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
