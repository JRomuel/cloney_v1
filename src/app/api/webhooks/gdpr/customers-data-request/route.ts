import { NextRequest, NextResponse } from 'next/server';
import { verifyAndParseWebhook } from '@/lib/shopify/webhooks';
import { GDPRWebhookPayload } from '@/types';

/**
 * GDPR customers/data_request webhook
 *
 * This webhook is triggered when a customer requests their data.
 * As per Shopify's requirements, we must respond within 30 days
 * with all the customer data we store.
 *
 * For this app, we don't store any customer-specific data beyond
 * what Shopify already has, so we return an empty response.
 */
export async function POST(request: NextRequest) {
  try {
    const { payload, shopDomain } = await verifyAndParseWebhook(request);
    const gdprPayload = payload as GDPRWebhookPayload;

    console.log('GDPR customers/data_request received:', {
      shopDomain,
      customerId: gdprPayload.customer?.id,
      customerEmail: gdprPayload.customer?.email,
      dataRequestId: gdprPayload.data_request?.id,
    });

    // This app does not store customer-specific personal data.
    // If you add features that store customer data, implement
    // the data export logic here.
    //
    // Example response structure (if you had data to return):
    // {
    //   customer: {
    //     id: gdprPayload.customer?.id,
    //     email: gdprPayload.customer?.email,
    //     data: { ... }
    //   }
    // }

    return NextResponse.json({
      success: true,
      message: 'No customer-specific data stored by this app',
    });
  } catch (error) {
    console.error('GDPR customers/data_request webhook error:', error);

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  }
}
