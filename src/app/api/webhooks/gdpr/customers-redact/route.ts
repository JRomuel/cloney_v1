import { NextRequest, NextResponse } from 'next/server';
import { verifyAndParseWebhook } from '@/lib/shopify/webhooks';
import { GDPRWebhookPayload } from '@/types';

/**
 * GDPR customers/redact webhook
 *
 * This webhook is triggered when a merchant requests that a customer's
 * data be deleted. We must delete all customer-specific data within
 * 30 days of receiving this request.
 *
 * For this app, we don't store any customer-specific data, so we
 * simply acknowledge the request.
 */
export async function POST(request: NextRequest) {
  try {
    const { payload, shopDomain } = await verifyAndParseWebhook(request);
    const gdprPayload = payload as GDPRWebhookPayload;

    console.log('GDPR customers/redact received:', {
      shopDomain,
      customerId: gdprPayload.customer?.id,
      customerEmail: gdprPayload.customer?.email,
      ordersRequested: gdprPayload.orders_requested,
    });

    // This app does not store customer-specific personal data.
    // If you add features that store customer data, implement
    // the data deletion logic here.
    //
    // Example:
    // await prisma.customerData.deleteMany({
    //   where: {
    //     shopDomain,
    //     customerId: gdprPayload.customer?.id.toString(),
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'No customer-specific data to redact',
    });
  } catch (error) {
    console.error('GDPR customers/redact webhook error:', error);

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  }
}
