import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    deviceSizes: [384, 512, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 360, 384, 400],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...SECURITY_HEADERS],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/groomer/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/book",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/book-cats",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/api/availability",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/find-local-groomer",
        destination: "/book",
        permanent: true,
      },
      {
        source: "/blog/mobile-dog-grooming-near-me",
        destination:
          "/blog/mobile-dog-grooming-near-me-how-to-choose-a-groomer-that-comes-to-you",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
