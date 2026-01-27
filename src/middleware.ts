import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow Shopify to embed the app in an iframe
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com;"
  );

  // Remove X-Frame-Options if set (conflicts with CSP frame-ancestors)
  response.headers.delete('X-Frame-Options');

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes that handle their own headers
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
