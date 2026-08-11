import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker/Coolify deployment.
  output: "standalone",
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Image optimization fails in the local Windows/OneDrive dev runtime, so
    // keep it off in dev only — production serves optimized images.
    unoptimized: process.env.NODE_ENV !== "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
