import type { Metadata } from 'next';
import { Providers } from './providers';
import '@shopify/polaris/build/esm/styles.css';

export const metadata: Metadata = {
  title: 'Cloney - AI Website Cloner for Shopify',
  description: 'Clone any website into a Shopify store using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={process.env.SHOPIFY_API_KEY} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
