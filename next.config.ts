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
    ],
  },
  // Set outputFileTracingRoot to avoid workspace detection issues with parent directory
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
