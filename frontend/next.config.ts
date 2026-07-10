import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - new Next.js 15 property
  allowedDevOrigins: ['dreamlike-quiet-domestic.ngrok-free.dev'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xhjrocmovpfrwqusrccy.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      }
    ],
  },
};

export default nextConfig;
