import { NextRequest, NextResponse } from 'next/server';
import { verifyAndParseWebhook } from '@/lib/shopify/webhooks';
import { GDPRWebhookPayload } from '@/types';
import prisma from '@/lib/db/prisma';

/**
 * GDPR shop/redact webhook
 *
 * This webhook is triggered 48 hours after a merchant uninstalls the app.
 * We must delete all shop data within 30 days of receiving this request.
 *
 * This is the final cleanup - all merchant data must be removed.
 */
export async function POST(request: NextRequest) {
  try {
    const { payload, shopDomain } = await verifyAndParseWebhook(request);
    const gdprPayload = payload as GDPRWebhookPayload;

    console.log('GDPR shop/redact received:', {
      shopDomain,
      shopId: gdprPayload.shop_id,
    });

    // Find the shop
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
    });

    if (shop) {
      // Delete all associated data
      // Prisma will cascade delete generations and products due to onDelete: Cascade

      await prisma.shop.delete({
        where: { domain: shopDomain },
      });

      console.log(`Shop data redacted for: ${shopDomain}`);
    } else {
      console.log(`Shop not found for redaction: ${shopDomain}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Shop data redacted',
    });
  } catch (error) {
    console.error('GDPR shop/redact webhook error:', error);

    // Return 200 to acknowledge receipt
    // Even on error, we don't want Shopify to keep retrying
    return NextResponse.json({ received: true });
  }
}
