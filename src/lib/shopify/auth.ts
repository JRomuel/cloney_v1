import { createHmac, timingSafeEqual } from 'crypto';
import { ShopifyAuthError } from '@/errors';

export interface OAuthCallbackParams {
  shop: string;
  code: string;
  timestamp: string;
  state: string;
  hmac: string;
  host?: string;
}

export function getInstallUrl(shop: string, state: string): string {
  const scopes = process.env.SHOPIFY_SCOPES || '';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const apiKey = process.env.SHOPIFY_API_KEY;

  const installUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  installUrl.searchParams.set('client_id', apiKey!);
  installUrl.searchParams.set('scope', scopes);
  installUrl.searchParams.set('redirect_uri', redirectUri);
  installUrl.searchParams.set('state', state);

  return installUrl.toString();
}

export function verifyHmac(params: Record<string, string>): boolean {
  // Remove hmac and signature from params before verification
  const { hmac, signature, ...rest } = params as Record<string, string> & { signature?: string };

  if (!hmac) {
    return false;
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error('SHOPIFY_API_SECRET is not set');
    return false;
  }

  // Sort parameters alphabetically and create query string
  // Values must be used as-is (already decoded by URLSearchParams)
  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const generatedHmac = createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');

  // Use simple string comparison if lengths differ (timing-safe requires same length)
  if (hmac.length !== generatedHmac.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(generatedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

export function validateShopDomain(shop: string): boolean {
  // Shop must be a valid myshopify.com domain
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scopes: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ShopifyAuthError(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new ShopifyAuthError('No access token in response');
  }

  return {
    accessToken: data.access_token,
    scopes: data.scope || '',
  };
}

export function generateNonce(): string {
  return createHmac('sha256', Date.now().toString() + Math.random().toString())
    .update(process.env.SHOPIFY_API_SECRET!)
    .digest('hex')
    .substring(0, 16);
}

export function getEmbeddedAppUrl(shop: string, host?: string): string {
  if (host) {
    // Decode the host parameter to get the embedded app URL
    const decodedHost = Buffer.from(host, 'base64').toString('utf-8');
    return `https://${decodedHost}/apps/${process.env.SHOPIFY_API_KEY}`;
  }

  // Fallback: construct URL from shop domain
  return `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
}
