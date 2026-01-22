/**
 * Client-Side Encryption Module for Eternal Sentinel
 *
 * This module implements zero-knowledge encryption using:
 * - Web Crypto API for AES-GCM encryption
 * - libsodium for additional cryptographic operations
 * - PBKDF2 for key derivation from passwords
 *
 * IMPORTANT: All encryption/decryption happens client-side.
 * The server NEVER sees plaintext data or the user's password.
 */

// Type definitions for libsodium
declare const sodium: {
  ready: Promise<void>;
  crypto_secretbox_easy: (message: Uint8Array, nonce: Uint8Array, key: Uint8Array) => Uint8Array;
  crypto_secretbox_open_easy: (ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array) => Uint8Array;
  crypto_secretbox_NONCEBYTES: number;
  crypto_secretbox_KEYBYTES: number;
  randombytes_buf: (length: number) => Uint8Array;
  from_base64: (input: string) => Uint8Array;
  to_base64: (input: Uint8Array) => string;
  from_string: (input: string) => Uint8Array;
  to_string: (input: Uint8Array) => string;
};

// Constants
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return arrayBufferToBase64(salt.buffer);
}

/**
 * Generate a random IV/nonce for encryption
 */
export function generateNonce(): string {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  return arrayBufferToBase64(iv.buffer);
}

/**
 * Generate a random master key
 */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: KEY_LENGTH,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Export a CryptoKey to raw bytes (Base64 encoded)
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a raw key from Base64 string
 */
export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive an encryption key from a password using PBKDF2
 *
 * @param password - User's password
 * @param salt - Salt for key derivation (Base64 encoded)
 * @returns Derived CryptoKey
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToArrayBuffer(salt);

  // Import password as a key
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data using AES-GCM
 *
 * @param data - Data to encrypt (string or ArrayBuffer)
 * @param key - Encryption key
 * @param nonce - Optional nonce (will generate if not provided)
 * @returns Object with encrypted data and nonce (both Base64 encoded)
 */
export async function encrypt(
  data: string | ArrayBuffer,
  key: CryptoKey,
  nonce?: string
): Promise<{ ciphertext: string; nonce: string }> {
  const iv = nonce ? base64ToArrayBuffer(nonce) : crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ivArray = new Uint8Array(iv);

  let dataBuffer: ArrayBuffer;
  if (typeof data === "string") {
    const encoder = new TextEncoder();
    dataBuffer = encoder.encode(data).buffer;
  } else {
    dataBuffer = data;
  }

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivArray,
    },
    key,
    dataBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    nonce: arrayBufferToBase64(ivArray.buffer),
  };
}

/**
 * Decrypt data using AES-GCM
 *
 * @param ciphertext - Encrypted data (Base64 encoded)
 * @param key - Decryption key
 * @param nonce - Nonce used during encryption (Base64 encoded)
 * @returns Decrypted data as string
 */
export async function decrypt(
  ciphertext: string,
  key: CryptoKey,
  nonce: string
): Promise<string> {
  const iv = base64ToArrayBuffer(nonce);
  const data = base64ToArrayBuffer(ciphertext);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Decrypt data to ArrayBuffer (for files)
 */
export async function decryptToBuffer(
  ciphertext: string,
  key: CryptoKey,
  nonce: string
): Promise<ArrayBuffer> {
  const iv = base64ToArrayBuffer(nonce);
  const data = base64ToArrayBuffer(ciphertext);

  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    key,
    data
  );
}

/**
 * Encrypt a file
 *
 * @param file - File to encrypt
 * @param key - Encryption key
 * @returns Object with encrypted data and nonce
 */
export async function encryptFile(
  file: File,
  key: CryptoKey
): Promise<{ ciphertext: string; nonce: string; metadata: object }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await encrypt(arrayBuffer, key);

  return {
    ...result,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      lastModified: file.lastModified,
    },
  };
}

/**
 * Create an encrypted vault structure
 * This creates a new master key and encrypts it with the user's derived key
 */
export async function createEncryptedVault(password: string): Promise<{
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyNonce: string;
}> {
  // Generate a new master key for the vault
  const masterKey = await generateMasterKey();
  const masterKeyExported = await exportKey(masterKey);

  // Generate salt and derive key from password
  const salt = generateSalt();
  const derivedKey = await deriveKeyFromPassword(password, salt);

  // Encrypt the master key with the derived key
  const { ciphertext, nonce } = await encrypt(masterKeyExported, derivedKey);

  return {
    encryptedMasterKey: ciphertext,
    masterKeySalt: salt,
    masterKeyNonce: nonce,
  };
}

/**
 * Unlock vault and retrieve the master key
 */
export async function unlockVault(
  password: string,
  encryptedMasterKey: string,
  masterKeySalt: string,
  masterKeyNonce: string
): Promise<CryptoKey> {
  // Derive key from password
  const derivedKey = await deriveKeyFromPassword(password, masterKeySalt);

  // Decrypt the master key
  const masterKeyBase64 = await decrypt(
    encryptedMasterKey,
    derivedKey,
    masterKeyNonce
  );

  // Import the master key
  return importKey(masterKeyBase64);
}

/**
 * Encrypt a vault item
 */
export async function encryptVaultItem(
  data: string | ArrayBuffer,
  masterKey: CryptoKey
): Promise<{ encryptedData: string; nonce: string }> {
  const { ciphertext, nonce } = await encrypt(data, masterKey);
  return { encryptedData: ciphertext, nonce };
}

/**
 * Decrypt a vault item
 */
export async function decryptVaultItem(
  encryptedData: string,
  nonce: string,
  masterKey: CryptoKey
): Promise<string> {
  return decrypt(encryptedData, masterKey, nonce);
}

/**
 * Change vault password
 * Re-encrypts the master key with a new derived key
 */
export async function changeVaultPassword(
  oldPassword: string,
  newPassword: string,
  encryptedMasterKey: string,
  masterKeySalt: string,
  masterKeyNonce: string
): Promise<{
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyNonce: string;
}> {
  // Unlock with old password to get master key
  const masterKey = await unlockVault(
    oldPassword,
    encryptedMasterKey,
    masterKeySalt,
    masterKeyNonce
  );

  // Export master key
  const masterKeyExported = await exportKey(masterKey);

  // Generate new salt and derive new key from new password
  const newSalt = generateSalt();
  const newDerivedKey = await deriveKeyFromPassword(newPassword, newSalt);

  // Encrypt master key with new derived key
  const { ciphertext, nonce } = await encrypt(masterKeyExported, newDerivedKey);

  return {
    encryptedMasterKey: ciphertext,
    masterKeySalt: newSalt,
    masterKeyNonce: nonce,
  };
}

/**
 * Validate that a password can unlock the vault
 */
export async function validateVaultPassword(
  password: string,
  encryptedMasterKey: string,
  masterKeySalt: string,
  masterKeyNonce: string
): Promise<boolean> {
  try {
    await unlockVault(password, encryptedMasterKey, masterKeySalt, masterKeyNonce);
    return true;
  } catch {
    return false;
  }
}
