/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "50mb",
  },
  typescript: {
    ignoreBuildErrors: true,
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
  images: {
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
