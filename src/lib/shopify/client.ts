import { shopifyApi, LATEST_API_VERSION, Session, Shopify } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { ShopifyApiError, RateLimitError } from '@/errors';
import { withRetry } from '@/lib/utils/retry';
import { ShopifyGraphQLResponse } from '@/types';

// Lazy initialize Shopify API to avoid build-time errors
let shopifyInstance: Shopify | null = null;

export function getShopifyApi(): Shopify {
  if (!shopifyInstance) {
    shopifyInstance = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecretKey: process.env.SHOPIFY_API_SECRET!,
      scopes: (process.env.SHOPIFY_SCOPES || '').split(','),
      hostName: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').hostname,
      hostScheme: 'https',
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: true,
    });
  }
  return shopifyInstance;
}

export interface GraphQLClientOptions {
  shop: string;
  accessToken: string;
}

export class ShopifyGraphQLClient {
  private shop: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(options: GraphQLClientOptions) {
    this.shop = options.shop;
    this.accessToken = options.accessToken;
    this.apiVersion = LATEST_API_VERSION;
    console.log(`[Shopify] GraphQL client initialized for ${options.shop} with API version ${this.apiVersion}`);
  }

  private get endpoint(): string {
    return `https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`;
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return withRetry(async () => {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        throw new RateLimitError('GraphQL rate limit exceeded', retryAfter);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new ShopifyApiError(
          `GraphQL request failed: ${response.status} ${errorText}`,
          response.status
        );
      }

      const result: ShopifyGraphQLResponse<T> = await response.json();

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join(', ');
        throw new ShopifyApiError(`GraphQL errors: ${errorMessages}`);
      }

      // Check throttle status and warn if low
      if (result.extensions?.cost?.throttleStatus) {
        const { currentlyAvailable, maximumAvailable } =
          result.extensions.cost.throttleStatus;
        if (currentlyAvailable < maximumAvailable * 0.1) {
          console.warn(
            `Shopify API throttle warning: ${currentlyAvailable}/${maximumAvailable} points available`
          );
        }
      }

      if (!result.data) {
        throw new ShopifyApiError('GraphQL response missing data');
      }

      return result.data;
    });
  }

  async mutate<T>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return this.query<T>(mutation, variables);
  }
}

export function createGraphQLClient(
  shop: string,
  accessToken: string
): ShopifyGraphQLClient {
  return new ShopifyGraphQLClient({ shop, accessToken });
}

// Helper to create a session object for @shopify/shopify-api functions
export function createSession(shop: string, accessToken: string): Session {
  return new Session({
    id: `${shop}_session`,
    shop,
    state: '',
    isOnline: false,
    accessToken,
  });
}
