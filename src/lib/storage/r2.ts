import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

/**
 * Initialize S3Client configured for Cloudflare R2
 */
function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration is missing. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Generate a unique filename with UUID prefix
 */
export function generateUniqueFilename(originalName: string): string {
  // Sanitize the original filename
  const sanitized = originalName
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${uuid()}-${sanitized}`;
}

/**
 * Get public URL for a file stored in R2
 */
export function getPublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL environment variable is not configured');
  }
  return `${publicUrl}/${key}`;
}

/**
 * Upload a file buffer to Cloudflare R2
 * @param buffer - The file data as a Buffer
 * @param filename - Original filename (will be prefixed with UUID)
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME environment variable is not configured');
  }

  const client = getR2Client();
  const uniqueFilename = generateUniqueFilename(filename);
  const key = `images/${uniqueFilename}`;

  await client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return getPublicUrl(key);
}

/**
 * Validate that an uploaded file is an acceptable image
 */
export function validateImageFile(
  contentType: string,
  size: number
): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (!allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit',
    };
  }

  return { valid: true };
}

/**
 * Extract the R2 key from a public URL
 * @param url - The public URL of the file (e.g., https://pub-xxxxx.r2.dev/images/uuid-filename.jpg)
 * @returns The R2 key (e.g., images/uuid-filename.jpg)
 */
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('R2_PUBLIC_URL environment variable is not configured');
  }

  // Normalize URLs by removing trailing slashes
  const normalizedPublicUrl = publicUrl.replace(/\/$/, '');
  const normalizedUrl = url.replace(/\/$/, '');

  // Check if the URL belongs to our R2 bucket
  if (!normalizedUrl.startsWith(normalizedPublicUrl)) {
    return null;
  }

  // Extract the key (everything after the public URL)
  const key = normalizedUrl.slice(normalizedPublicUrl.length + 1);
  return key || null;
}

/**
 * Delete a file from Cloudflare R2
 * @param url - The public URL of the file to delete
 * @returns True if deleted successfully, false if URL doesn't belong to our bucket
 */
export async function deleteFromR2(url: string): Promise<boolean> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME environment variable is not configured');
  }

  const key = extractKeyFromUrl(url);
  if (!key) {
    // URL doesn't belong to our R2 bucket, nothing to delete
    return false;
  }

  const client = getR2Client();

  await client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  }));

  return true;
}
