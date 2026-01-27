import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookVerificationError } from '@/errors';

export function verifyWebhookHmac(
  body: string,
  hmacHeader: string | null
): boolean {
  if (!hmacHeader) {
    return false;
  }

  const generatedHmac = createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(body, 'utf8')
    .digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(hmacHeader),
      Buffer.from(generatedHmac)
    );
  } catch {
    return false;
  }
}

export async function parseWebhookBody(
  request: Request
): Promise<{ body: string; payload: unknown }> {
  const body = await request.text();

  if (!body) {
    throw new WebhookVerificationError('Empty webhook body');
  }

  try {
    const payload = JSON.parse(body);
    return { body, payload };
  } catch {
    throw new WebhookVerificationError('Invalid JSON in webhook body');
  }
}

export function getWebhookHeaders(request: Request): {
  topic: string | null;
  hmac: string | null;
  shopDomain: string | null;
  webhookId: string | null;
} {
  return {
    topic: request.headers.get('x-shopify-topic'),
    hmac: request.headers.get('x-shopify-hmac-sha256'),
    shopDomain: request.headers.get('x-shopify-shop-domain'),
    webhookId: request.headers.get('x-shopify-webhook-id'),
  };
}

export async function verifyAndParseWebhook(
  request: Request
): Promise<{ payload: unknown; shopDomain: string }> {
  const { body, payload } = await parseWebhookBody(request);
  const { hmac, shopDomain } = getWebhookHeaders(request);

  if (!verifyWebhookHmac(body, hmac)) {
    throw new WebhookVerificationError('Invalid HMAC signature');
  }

  if (!shopDomain) {
    throw new WebhookVerificationError('Missing shop domain header');
  }

  return { payload, shopDomain };
}
