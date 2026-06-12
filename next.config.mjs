/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce attack surface and fingerprinting
  poweredByHeader: false,

  // Compression is on by default, kept explicit for clarity
  compress: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "50mb",
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: "/sitemap",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Long-lived cache for static assets (Next.js handles immutable hashes)
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Allow audio streaming from same origin
        source: "/api/audio/stream",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
  images: {
    // Cloudinary delivers its own CDN-optimised images; skip the Next.js
    // image-optimisation pipeline to avoid double-processing.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
        pathname: "/**",
      },
      // Legacy MEGA support for backward compatibility
      {
        protocol: "https",
        hostname: "mega.nz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.mega.nz",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mega.co.nz",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
