// ===========================================
// ENCRYPTION UTILITY
// Securely encrypt/decrypt credentials for storage
// ===========================================

import crypto from 'crypto';

// Algorithm for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get the encryption key from environment or generate one
 * In production, this should be set via ENCRYPTION_KEY env var
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    console.warn(
      '⚠️  ENCRYPTION_KEY not set! Using derived key from DATABASE_URL. ' +
        'Set ENCRYPTION_KEY in production for better security.'
    );
    // Derive a key from DATABASE_URL as fallback (not ideal but works)
    const dbUrl = process.env.DATABASE_URL || 'default-fallback-key';
    return crypto.scryptSync(dbUrl, 'botmakers-salt', 32);
  }

  // If key is provided, it should be a 64-character hex string (32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }

  // Otherwise, derive from the provided key
  return crypto.scryptSync(key, 'botmakers-salt', 32);
}

/**
 * Encrypt a string (API key, token, etc.)
 * Returns base64 encoded string containing: salt + iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine: iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt a previously encrypted string
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  // Extract parts
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt a credentials object (multiple keys/values)
 */
export function encryptCredentials(credentials: Record<string, string>): string {
  const json = JSON.stringify(credentials);
  return encrypt(json);
}

/**
 * Decrypt a credentials object
 */
export function decryptCredentials(encryptedBase64: string): Record<string, string> {
  const json = decrypt(encryptedBase64);
  return JSON.parse(json);
}

/**
 * Mask a credential for display (show first/last few chars)
 */
export function maskCredential(credential: string, showChars = 4): string {
  if (credential.length <= showChars * 2) {
    return '••••••••';
  }
  const start = credential.substring(0, showChars);
  const end = credential.substring(credential.length - showChars);
  return `${start}••••••••${end}`;
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(prefix = 'bm'): string {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${randomPart}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify an API key against a hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computed = hashApiKey(apiKey);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

// ===========================================
// INTEGRATION-SPECIFIC HELPERS
// ===========================================

export interface IntegrationCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  [key: string]: string | undefined;
}

/**
 * Store credentials for an integration
 */
export function storeIntegrationCredentials(
  credentials: IntegrationCredentials
): string {
  // Remove undefined values
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return encryptCredentials(clean);
}

/**
 * Retrieve credentials for an integration
 */
export function retrieveIntegrationCredentials(
  encryptedBase64: string
): IntegrationCredentials {
  return decryptCredentials(encryptedBase64) as IntegrationCredentials;
}

/**
 * Get a masked version of credentials for display in UI
 */
export function getMaskedCredentials(
  encryptedBase64: string
): Record<string, string> {
  const credentials = retrieveIntegrationCredentials(encryptedBase64);
  const masked: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (value) {
      masked[key] = maskCredential(value);
    }
  }

  return masked;
}
