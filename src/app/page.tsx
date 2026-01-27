import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';

export default async function Home({
  searchParams,
}: {
  searchParams: { shop?: string; host?: string };
}) {
  const { shop, host } = searchParams;

  // If shop parameter is present, check if already installed
  if (shop) {
    // Check if shop exists in database (already installed)
    const existingShop = await prisma.shop.findUnique({
      where: { domain: shop },
      select: { id: true, uninstalledAt: true },
    });

    // If shop exists and not uninstalled, redirect to dashboard
    if (existingShop && !existingShop.uninstalledAt) {
      const dashboardUrl = host
        ? `/dashboard?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`
        : `/dashboard?shop=${encodeURIComponent(shop)}`;
      redirect(dashboardUrl);
    }

    // Otherwise, redirect to OAuth flow
    redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
  }

  // If no shop parameter, show a landing page or redirect to Shopify
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Cloney</h1>
      <p style={{ color: '#666', marginBottom: '2rem', textAlign: 'center' }}>
        Clone any website into a Shopify store using AI
      </p>

      <div
        style={{
          padding: '2rem',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        <p style={{ marginBottom: '1rem' }}>
          To use this app, please install it from the Shopify App Store or your
          Shopify Admin.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#888' }}>
          Visit your Shopify Admin → Apps → and search for &quot;Cloney&quot;
        </p>
      </div>
    </main>
  );
}
