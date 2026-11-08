/** @type {import('next').NextConfig} */
const catalogApiUrl = (process.env.NEXT_PUBLIC_CATALOG_API_URL || 'http://localhost:3020').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shopkart/common'],
  images: {
    // Temporary storefront presentation photography (see src/features/storefront/presentation-data.ts)
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/catalog/images/:path*',
        destination: `${catalogApiUrl}/api/v1/catalog/images/:path*`,
      },
    ];
  },
};

export default nextConfig;
