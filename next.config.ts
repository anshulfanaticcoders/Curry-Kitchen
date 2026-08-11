import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Image optimization is failing in the current Windows/OneDrive runtime.
    // Serve the approved Unsplash images directly so every page still renders.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
