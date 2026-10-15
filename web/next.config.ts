import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "*.edut.pro",
        "edut.pro",
        "group-aiiu-niger.edut.pro",
        "*.vercel.app",
        "edut-web.vercel.app",
        "vercel.app",
        "localhost:3000",
        "localhost:3001",
        "localhost:3002",
      ],
    },
  },
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
