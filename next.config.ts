import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
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
