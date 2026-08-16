import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For the Dockerfile, which copies .next/standalone. Vercel produces its
  // own output and does not need it, so it is left off there.
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    unoptimized: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
  // Experimental features
  experimental: {
    // Enable if needed for large payloads
    // serverActions: {
    //   bodySizeLimit: "10mb",
    // },
  },
};

export default nextConfig;
