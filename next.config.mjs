/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // MLB Stats API headshots are loaded directly via <img> with lazy loading.
    remotePatterns: [
      { protocol: "https", hostname: "img.mlbstatic.com" },
      { protocol: "https", hostname: "midfield.mlbstatic.com" },
      { protocol: "https", hostname: "securea.mlb.com" },
    ],
  },
  async headers() {
    return [
      {
        // Ensure the service worker can control the whole origin and is never cached stale.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
