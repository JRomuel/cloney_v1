import { NextRequest, NextResponse } from 'next/server';
import { verifyAndParseWebhook } from '@/lib/shopify/webhooks';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const { shopDomain } = await verifyAndParseWebhook(request);

    // Mark shop as uninstalled (soft delete)
    await prisma.shop.update({
      where: { domain: shopDomain },
      data: {
        uninstalledAt: new Date(),
        accessToken: '', // Clear the token for security
      },
    });

    console.log(`App uninstalled from shop: ${shopDomain}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('App uninstalled webhook error:', error);

    // Return 200 even on error to prevent Shopify from retrying
    // Log the error for debugging but don't expose details
    return NextResponse.json({ received: true });
  }
}
