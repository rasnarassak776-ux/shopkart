/** @type {import('next').NextConfig} */
const authApiUrl = (
  process.env.INTERNAL_AUTH_URL ||
  process.env.AUTH_API_URL ||
  (process.env.NEXT_PUBLIC_API_URL !== undefined && process.env.NEXT_PUBLIC_API_URL !== ''
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3010')
).replace(/\/+$/, '');

const catalogApiUrl = (
  process.env.INTERNAL_CATALOG_URL ||
  process.env.CATALOG_API_URL ||
  (process.env.NEXT_PUBLIC_CATALOG_API_URL !== undefined && process.env.NEXT_PUBLIC_CATALOG_API_URL !== ''
    ? process.env.NEXT_PUBLIC_CATALOG_API_URL
    : 'http://localhost:3020')
).replace(/\/+$/, '');

const cartApiUrl = (
  process.env.INTERNAL_CART_URL ||
  process.env.CART_API_URL ||
  (process.env.NEXT_PUBLIC_CART_API_URL !== undefined && process.env.NEXT_PUBLIC_CART_API_URL !== ''
    ? process.env.NEXT_PUBLIC_CART_API_URL
    : 'http://localhost:3030')
).replace(/\/+$/, '');

const orderApiUrl = (
  process.env.INTERNAL_ORDER_URL ||
  process.env.ORDER_API_URL ||
  (process.env.NEXT_PUBLIC_ORDER_API_URL !== undefined && process.env.NEXT_PUBLIC_ORDER_API_URL !== ''
    ? process.env.NEXT_PUBLIC_ORDER_API_URL
    : 'http://localhost:3040')
).replace(/\/+$/, '');

const notificationApiUrl = (
  process.env.INTERNAL_NOTIFICATION_URL ||
  process.env.NOTIFICATION_API_URL ||
  (process.env.NEXT_PUBLIC_NOTIFICATION_API_URL !== undefined && process.env.NEXT_PUBLIC_NOTIFICATION_API_URL !== ''
    ? process.env.NEXT_PUBLIC_NOTIFICATION_API_URL
    : 'http://localhost:3050')
).replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shopkart/common'],
  images: {
    // Temporary storefront presentation photography (see src/features/storefront/presentation-data.ts)
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  async rewrites() {
    return [
      // 1. Catalog Images (prioritized before generic catalog API)
      {
        source: '/api/v1/catalog/images/:path*',
        destination: `${catalogApiUrl}/api/v1/catalog/images/:path*`,
      },
      // 2. Catalog Service APIs (products, categories, admin)
      {
        source: '/api/v1/catalog/categories',
        destination: `${catalogApiUrl}/api/v1/catalog/categories`,
      },
      {
        source: '/api/v1/catalog/categories/:path*',
        destination: `${catalogApiUrl}/api/v1/catalog/categories/:path*`,
      },
      {
        source: '/api/v1/catalog/products',
        destination: `${catalogApiUrl}/api/v1/catalog/products`,
      },
      {
        source: '/api/v1/catalog/products/:path*',
        destination: `${catalogApiUrl}/api/v1/catalog/products/:path*`,
      },
      {
        source: '/api/v1/catalog/admin',
        destination: `${catalogApiUrl}/api/v1/catalog/admin`,
      },
      {
        source: '/api/v1/catalog/admin/:path*',
        destination: `${catalogApiUrl}/api/v1/catalog/admin/:path*`,
      },
      // 3. Cart Service APIs
      {
        source: '/api/v1/cart',
        destination: `${cartApiUrl}/api/v1/cart`,
      },
      {
        source: '/api/v1/cart/:path*',
        destination: `${cartApiUrl}/api/v1/cart/:path*`,
      },
      // 4. Order Service APIs (orders, checkout validation, payments)
      {
        source: '/api/v1/orders',
        destination: `${orderApiUrl}/api/v1/orders`,
      },
      {
        source: '/api/v1/orders/:path*',
        destination: `${orderApiUrl}/api/v1/orders/:path*`,
      },
      {
        source: '/api/v1/checkout/:path*',
        destination: `${orderApiUrl}/api/v1/checkout/:path*`,
      },
      {
        source: '/api/v1/payments/:path*',
        destination: `${orderApiUrl}/api/v1/payments/:path*`,
      },
      // 5. Notification Service APIs (Customer In-App only; excludes internal email/event dispatch)
      {
        source: '/api/v1/notifications',
        destination: `${notificationApiUrl}/api/v1/notifications`,
      },
      {
        source: '/api/v1/notifications/unread-count',
        destination: `${notificationApiUrl}/api/v1/notifications/unread-count`,
      },
      {
        source: '/api/v1/notifications/:id/read',
        destination: `${notificationApiUrl}/api/v1/notifications/:id/read`,
      },
      {
        source: '/api/v1/notifications/read-all',
        destination: `${notificationApiUrl}/api/v1/notifications/read-all`,
      },
      // 6. Auth Service APIs (auth, users, addresses, merchants, audit-logs)
      {
        source: '/api/v1/auth/:path*',
        destination: `${authApiUrl}/api/v1/auth/:path*`,
      },
      {
        source: '/api/v1/users/:path*',
        destination: `${authApiUrl}/api/v1/users/:path*`,
      },
      {
        source: '/api/v1/merchants',
        destination: `${authApiUrl}/api/v1/merchants`,
      },
      {
        source: '/api/v1/merchants/:path*',
        destination: `${authApiUrl}/api/v1/merchants/:path*`,
      },
      {
        source: '/api/v1/audit-logs',
        destination: `${authApiUrl}/api/v1/audit-logs`,
      },
      {
        source: '/api/v1/audit-logs/:path*',
        destination: `${authApiUrl}/api/v1/audit-logs/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/merchant',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/merchant/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
