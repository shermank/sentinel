import { describe, it, expect } from "vitest";
import {
  generateSecureToken,
  generateUrlSafeToken,
  encryptServerData,
  decryptServerData,
  hashSha256,
  createTimeLimitedToken,
  validateTimeLimitedToken,
  generateCheckInCode,
  constantTimeCompare,
  createHmac,
  verifyHmac,
} from "../src/lib/crypto/server";

// Set up test environment
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.AUTH_SECRET = "test-secret";

describe("Server Crypto Utilities", () => {
  describe("generateSecureToken", () => {
    it("should generate a token of specified length", () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // hex encoding doubles the length
    });

    it("should generate unique tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("generateUrlSafeToken", () => {
    it("should generate a URL-safe token", () => {
      const token = generateUrlSafeToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("encryptServerData / decryptServerData", () => {
    it("should encrypt and decrypt data correctly", () => {
      const plaintext = "Hello, World!";
      const encrypted = encryptServerData(plaintext);
      const decrypted = decryptServerData(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const plaintext = "Same data";
      const encrypted1 = encryptServerData(plaintext);
      const encrypted2 = encryptServerData(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle special characters", () => {
      const plaintext = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encryptServerData(plaintext);
      const decrypted = decryptServerData(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode", () => {
      const plaintext = "Unicode: 你好世界 🎉 émojis";
      const encrypted = encryptServerData(plaintext);
      const decrypted = decryptServerData(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("hashSha256", () => {
    it("should produce consistent hashes", () => {
      const value = "test value";
      const hash1 = hashSha256(value);
      const hash2 = hashSha256(value);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different values", () => {
      const hash1 = hashSha256("value1");
      const hash2 = hashSha256("value2");
      expect(hash1).not.toBe(hash2);
    });

    it("should produce 64-character hex string", () => {
      const hash = hashSha256("test");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("createTimeLimitedToken / validateTimeLimitedToken", () => {
    it("should create and validate a valid token", () => {
      const data = "user-123";
      const token = createTimeLimitedToken(data, 60000); // 1 minute
      const result = validateTimeLimitedToken(token);
      expect(result.valid).toBe(true);
      expect(result.data).toBe(data);
    });

    it("should reject expired tokens", async () => {
      const token = createTimeLimitedToken("data", 1); // 1ms
      await new Promise((r) => setTimeout(r, 10)); // Wait for expiration
      const result = validateTimeLimitedToken(token);
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it("should reject invalid tokens", () => {
      const result = validateTimeLimitedToken("invalid-token");
      expect(result.valid).toBe(false);
    });
  });

  describe("generateCheckInCode", () => {
    it("should generate a 6-digit code", () => {
      const code = generateCheckInCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate codes within valid range", () => {
      for (let i = 0; i < 100; i++) {
        const code = parseInt(generateCheckInCode());
        expect(code).toBeGreaterThanOrEqual(100000);
        expect(code).toBeLessThan(1000000);
      }
    });
  });

  describe("constantTimeCompare", () => {
    it("should return true for identical strings", () => {
      expect(constantTimeCompare("abc", "abc")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(constantTimeCompare("abc", "abd")).toBe(false);
    });

    it("should return false for different length strings", () => {
      expect(constantTimeCompare("abc", "abcd")).toBe(false);
    });
  });

  describe("createHmac / verifyHmac", () => {
    it("should create and verify HMAC", () => {
      const data = "important data";
      const signature = createHmac(data);
      expect(verifyHmac(data, signature)).toBe(true);
    });

    it("should reject modified data", () => {
      const signature = createHmac("original");
      expect(verifyHmac("modified", signature)).toBe(false);
    });

    it("should work with custom secret", () => {
      const data = "data";
      const secret = "custom-secret";
      const signature = createHmac(data, secret);
      expect(verifyHmac(data, signature, secret)).toBe(true);
      expect(verifyHmac(data, signature, "wrong-secret")).toBe(false);
    });
  });
});
