/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shopkart/common'],
  images: {
    // Temporary storefront presentation photography (see src/features/storefront/presentation-data.ts)
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
};

export default nextConfig;
