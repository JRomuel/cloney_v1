import { NextRequest, NextResponse } from 'next/server';
import {
  getInstallUrl,
  validateShopDomain,
  generateNonce,
} from '@/lib/shopify/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get('shop');

  // Validate shop parameter
  if (!shop) {
    return NextResponse.json(
      { error: 'Missing shop parameter' },
      { status: 400 }
    );
  }

  if (!validateShopDomain(shop)) {
    return NextResponse.json(
      { error: 'Invalid shop domain' },
      { status: 400 }
    );
  }

  // Generate a nonce for CSRF protection
  const state = generateNonce();

  // Store state in a cookie for verification during callback
  const installUrl = getInstallUrl(shop, state);

  // Return HTML that breaks out of iframe before redirecting to OAuth
  // This is necessary because Shopify's OAuth page cannot be displayed in an iframe
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redirecting...</title>
      </head>
      <body>
        <script>
          // Break out of iframe if embedded
          if (window.top !== window.self) {
            window.top.location.href = "${installUrl}";
          } else {
            window.location.href = "${installUrl}";
          }
        </script>
        <p>Redirecting to Shopify...</p>
      </body>
    </html>
  `;

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });

  // Set state cookie (httpOnly, secure, sameSite=lax for OAuth flow)
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
}
