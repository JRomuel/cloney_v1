import { ShopifyGraphQLClient } from './client';

/**
 * Shopify Files API utilities for uploading external images
 *
 * Shopify's image_picker settings require Shopify-hosted images.
 * This module handles uploading external URLs to Shopify's Files API.
 */

// GraphQL mutation to create a file from an external URL
const FILE_CREATE_MUTATION = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        fileStatus
        alt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Query to check file processing status and get the final URL
const FILE_QUERY = `
  query fileQuery($id: ID!) {
    node(id: $id) {
      ... on MediaImage {
        id
        fileStatus
        image {
          url
        }
      }
    }
  }
`;

interface FileCreateResponse {
  fileCreate: {
    files: Array<{
      id: string;
      fileStatus: string;
      alt: string | null;
    }>;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface FileQueryResponse {
  node: {
    id: string;
    fileStatus: string;
    image?: {
      url: string;
    };
  } | null;
}

export interface UploadedImage {
  fileId: string;
  /** CDN URL for serving the image (e.g., https://cdn.shopify.com/...) */
  shopifyUrl: string;
  /** Theme settings reference format (e.g., shopify://shop_images/filename.jpg) */
  themeSettingsUrl: string;
}

/**
 * Check if a URL is an external URL that needs to be uploaded to Shopify
 */
export function isExternalUrl(url: string | undefined | null): boolean {
  if (!url) return false;

  // Check if it's a valid URL
  try {
    const parsed = new URL(url);
    // It's external if it's http/https and not already a Shopify CDN URL
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !parsed.hostname.includes('shopify.com') &&
      !parsed.hostname.includes('cdn.shopify.com')
    );
  } catch {
    return false;
  }
}

/**
 * Upload an image from an external URL to Shopify's Files API
 *
 * @param client - Shopify GraphQL client
 * @param url - External image URL to upload
 * @param alt - Alt text for the image
 * @returns The uploaded image info with Shopify URL, or null if upload failed
 */
export async function uploadImageFromUrl(
  client: ShopifyGraphQLClient,
  url: string,
  alt: string = 'Uploaded image'
): Promise<UploadedImage | null> {
  console.log(`[Files] Starting upload for: ${url}`);

  try {
    // Create the file from external URL
    const createResult = await client.mutate<FileCreateResponse>(
      FILE_CREATE_MUTATION,
      {
        files: [
          {
            originalSource: url,
            contentType: 'IMAGE',
            alt,
          },
        ],
      }
    );

    // Check for user errors
    if (createResult.fileCreate.userErrors.length > 0) {
      const errors = createResult.fileCreate.userErrors
        .map((e) => e.message)
        .join(', ');
      console.error(`[Files] Upload failed with user errors: ${errors}`);
      return null;
    }

    // Get the created file
    const createdFile = createResult.fileCreate.files[0];
    if (!createdFile) {
      console.error('[Files] No file returned from fileCreate mutation');
      return null;
    }

    console.log(`[Files] File created: ${createdFile.id}, status: ${createdFile.fileStatus}`);

    // Wait for file processing to complete
    const processedFile = await waitForFileProcessing(client, createdFile.id);
    if (!processedFile) {
      console.error('[Files] File processing failed or timed out');
      return null;
    }

    console.log(`[Files] Upload complete: ${processedFile.shopifyUrl}`);
    return processedFile;
  } catch (error) {
    console.error('[Files] Upload error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Poll for file processing completion
 *
 * @param client - Shopify GraphQL client
 * @param fileId - The file ID to check
 * @param maxAttempts - Maximum polling attempts (default 15 = 30 seconds)
 * @param delayMs - Delay between attempts in ms (default 2000)
 * @returns The processed file info, or null if processing failed/timed out
 */
async function waitForFileProcessing(
  client: ShopifyGraphQLClient,
  fileId: string,
  maxAttempts: number = 15,
  delayMs: number = 2000
): Promise<UploadedImage | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Files] Checking processing status (attempt ${attempt}/${maxAttempts})`);

    const result = await client.query<FileQueryResponse>(FILE_QUERY, {
      id: fileId,
    });

    const node = result.node;
    if (!node) {
      console.error(`[Files] File not found: ${fileId}`);
      return null;
    }

    const status = node.fileStatus;
    console.log(`[Files] File status: ${status}`);

    switch (status) {
      case 'READY':
        // File is processed and ready
        if (node.image?.url) {
          // Extract filename from CDN URL to build theme settings reference
          // CDN URL format: https://cdn.shopify.com/s/files/1/.../files/filename.ext
          const cdnUrl = node.image.url;
          const filename = extractFilenameFromCdnUrl(cdnUrl);
          const themeSettingsUrl = filename
            ? `shopify://shop_images/${filename}`
            : cdnUrl; // Fallback to CDN URL if extraction fails

          return {
            fileId: node.id,
            shopifyUrl: cdnUrl,
            themeSettingsUrl,
          };
        }
        console.error('[Files] File READY but no image URL found');
        return null;

      case 'FAILED':
        console.error('[Files] File processing failed');
        return null;

      case 'PROCESSING':
      case 'UPLOADED':
        // Still processing, wait and retry
        if (attempt < maxAttempts) {
          await delay(delayMs);
        }
        break;

      default:
        console.warn(`[Files] Unknown file status: ${status}`);
        if (attempt < maxAttempts) {
          await delay(delayMs);
        }
    }
  }

  console.error('[Files] Processing timed out');
  return null;
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract filename from Shopify CDN URL
 *
 * CDN URLs are typically in the format:
 * https://cdn.shopify.com/s/files/1/{shop_id}/files/{filename}.{ext}?v=...
 *
 * @param cdnUrl - The Shopify CDN URL
 * @returns The filename with extension, or null if extraction fails
 */
function extractFilenameFromCdnUrl(cdnUrl: string): string | null {
  try {
    const url = new URL(cdnUrl);
    // Remove query params and get the pathname
    const pathname = url.pathname;
    // Extract the last segment (filename)
    const segments = pathname.split('/');
    const filename = segments[segments.length - 1];
    // Validate it looks like a filename
    if (filename && filename.includes('.')) {
      return filename;
    }
    return null;
  } catch {
    return null;
  }
}
