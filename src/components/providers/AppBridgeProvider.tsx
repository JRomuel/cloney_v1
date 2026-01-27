'use client';

import { useEffect, ReactNode } from 'react';

interface AppBridgeProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    shopify?: {
      toast: {
        show: (message: string, options?: { duration?: number; isError?: boolean }) => void;
      };
      loading: (isLoading: boolean) => void;
      idToken: () => Promise<string>;
    };
  }
}

export function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  useEffect(() => {
    // App Bridge is loaded via CDN in the layout
    // It auto-initializes when loaded in Shopify Admin context
  }, []);

  // Always render children - App Bridge will be available in embedded context
  return <>{children}</>;
}

// Helper hooks for App Bridge features
export function useAppBridge() {
  const showToast = (message: string, isError = false) => {
    if (window.shopify?.toast) {
      window.shopify.toast.show(message, { isError });
    }
  };

  const setLoading = (isLoading: boolean) => {
    if (window.shopify?.loading) {
      window.shopify.loading(isLoading);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (window.shopify?.idToken) {
      return window.shopify.idToken();
    }
    return null;
  };

  return {
    showToast,
    setLoading,
    getIdToken,
    isEmbedded: typeof window !== 'undefined' && !!window.shopify,
  };
}
