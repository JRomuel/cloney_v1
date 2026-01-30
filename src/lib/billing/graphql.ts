// GraphQL mutations and queries for Shopify App Subscriptions

export const APP_SUBSCRIPTION_CREATE = `
mutation appSubscriptionCreate(
  $name: String!
  $returnUrl: URL!
  $lineItems: [AppSubscriptionLineItemInput!]!
  $test: Boolean
) {
  appSubscriptionCreate(
    name: $name
    returnUrl: $returnUrl
    lineItems: $lineItems
    test: $test
  ) {
    appSubscription {
      id
      status
    }
    confirmationUrl
    userErrors {
      field
      message
    }
  }
}`;

export const CURRENT_APP_INSTALLATION = `
query currentAppInstallation {
  currentAppInstallation {
    activeSubscriptions {
      id
      name
      status
      currentPeriodEnd
      lineItems {
        plan {
          pricingDetails {
            ... on AppRecurringPricing {
              price {
                amount
                currencyCode
              }
              interval
            }
          }
        }
      }
    }
  }
}`;

export const APP_SUBSCRIPTION_CANCEL = `
mutation appSubscriptionCancel($id: ID!) {
  appSubscriptionCancel(id: $id) {
    appSubscription {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}`;

// Types for GraphQL responses
export interface AppSubscriptionCreateResponse {
  appSubscriptionCreate: {
    appSubscription: {
      id: string;
      status: string;
    } | null;
    confirmationUrl: string | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export interface CurrentAppInstallationResponse {
  currentAppInstallation: {
    activeSubscriptions: Array<{
      id: string;
      name: string;
      status: string;
      currentPeriodEnd?: string;
      lineItems?: Array<{
        plan: {
          pricingDetails: {
            price: {
              amount: string;
              currencyCode: string;
            };
            interval: string;
          };
        };
      }>;
    }>;
  };
}

export interface AppSubscriptionCancelResponse {
  appSubscriptionCancel: {
    appSubscription: {
      id: string;
      status: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}
