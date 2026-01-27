/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@shopify/shopify-api', 'playwright'],
  },
  async headers() {
    return [
      {
        // Allow Shopify to embed the app in an iframe
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors https://*.myshopify.com https://admin.shopify.com;`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
