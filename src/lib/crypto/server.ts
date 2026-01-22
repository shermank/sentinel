/**
 * Server-Side Cryptographic Utilities
 *
 * Used for:
 * - Generating secure tokens (check-in tokens, access tokens)
 * - Encrypting server-managed data (like access tokens in DB)
 * - Hash operations
 *
 * NOTE: This does NOT handle vault data encryption.
 * Vault encryption is strictly client-side for zero-knowledge.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const TOKEN_LENGTH = 32;

/**
 * Get the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Key should be 32 bytes (64 hex characters)
  return Buffer.from(key, "hex");
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a URL-safe random token
 */
export function generateUrlSafeToken(length: number = TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * Encrypt data using AES-256-GCM
 * Used for encrypting sensitive data stored in the database
 */
export function encryptServerData(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all hex encoded)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encryptServerData
 */
export function decryptServerData(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Hash a value using SHA-256
 */
export function hashSha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Create a time-limited token
 * Encodes expiration time into the token
 */
export function createTimeLimitedToken(
  data: string,
  expiresInMs: number
): string {
  const expiresAt = Date.now() + expiresInMs;
  const payload = JSON.stringify({ data, expiresAt });
  return encryptServerData(payload);
}

/**
 * Validate and decode a time-limited token
 */
export function validateTimeLimitedToken(
  token: string
): { valid: boolean; data?: string; expired?: boolean } {
  try {
    const payload = decryptServerData(token);
    const { data, expiresAt } = JSON.parse(payload);

    if (Date.now() > expiresAt) {
      return { valid: false, expired: true };
    }

    return { valid: true, data };
  } catch {
    return { valid: false };
  }
}

/**
 * Generate a check-in confirmation code (6 digits)
 */
export function generateCheckInCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Compare two strings in constant time (prevent timing attacks)
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Create a HMAC signature
 */
export function createHmac(data: string, secret?: string): string {
  const key = secret || process.env.AUTH_SECRET || "";
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Verify a HMAC signature
 */
export function verifyHmac(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = createHmac(data, secret);
  return constantTimeCompare(signature, expectedSignature);
}
