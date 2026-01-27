import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { EncryptionError } from '@/errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new EncryptionError('ENCRYPTION_KEY must be at least 32 characters');
  }
  return scryptSync(encryptionKey, 'shopify-token-salt', 32);
}

export function encrypt(text: string): string {
  try {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new EncryptionError(
      `Failed to encrypt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new EncryptionError('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      `Failed to decrypt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
