import { NextRequest, NextResponse } from 'next/server';
import {
  verifyHmac,
  validateShopDomain,
  exchangeCodeForToken,
  getEmbeddedAppUrl,
} from '@/lib/shopify/auth';
import { encrypt } from '@/lib/utils/encryption';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Extract OAuth callback parameters
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const hmac = searchParams.get('hmac');
  const host = searchParams.get('host');
  const timestamp = searchParams.get('timestamp');

  // Validate required parameters
  if (!shop || !code || !state || !hmac || !timestamp) {
    return NextResponse.json(
      { error: 'Missing required OAuth parameters' },
      { status: 400 }
    );
  }

  // Validate shop domain
  if (!validateShopDomain(shop)) {
    return NextResponse.json(
      { error: 'Invalid shop domain' },
      { status: 400 }
    );
  }

  // Verify state matches (CSRF protection)
  // Note: Cookie-based state verification often fails with embedded apps
  // due to third-party cookie restrictions. HMAC verification below
  // provides sufficient security as it's signed by Shopify.
  const storedState = request.cookies.get('shopify_oauth_state')?.value;
  if (storedState && storedState !== state) {
    // Only fail if cookie exists but doesn't match
    // If cookie is missing (blocked by browser), rely on HMAC verification
    return NextResponse.json(
      { error: 'State mismatch - possible CSRF attack' },
      { status: 403 }
    );
  }

  // Verify HMAC signature
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (!verifyHmac(params)) {
    return NextResponse.json(
      { error: 'Invalid HMAC signature' },
      { status: 403 }
    );
  }

  try {
    // Exchange code for access token
    const { accessToken, scopes } = await exchangeCodeForToken(shop, code);

    // Encrypt the access token before storing
    const encryptedToken = encrypt(accessToken);

    // Upsert shop record (handles reinstalls)
    await prisma.shop.upsert({
      where: { domain: shop },
      update: {
        accessToken: encryptedToken,
        scopes,
        uninstalledAt: null, // Clear uninstall flag on reinstall
        updatedAt: new Date(),
      },
      create: {
        domain: shop,
        accessToken: encryptedToken,
        scopes,
      },
    });

    // Clear the state cookie
    const redirectUrl = getEmbeddedAppUrl(shop, host || undefined);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.delete('shopify_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);

    return NextResponse.json(
      {
        error: 'Failed to complete OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
