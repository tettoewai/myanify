/**
 * Content Protection & Encryption Utilities
 *
 * Implements AES-256-GCM encryption for downloaded audio files
 * to prevent unauthorized sharing.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Derives an encryption key from a user ID and master secret
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) throw new Error("ENCRYPTION_MASTER_KEY is not set");
  return key;
}

function deriveKey(userId: string, salt: Buffer): Buffer {
  const masterKey = getMasterKey();
  return crypto.pbkdf2Sync(
    masterKey,
    Buffer.concat([Buffer.from(userId, "utf8"), salt]),
    100000,
    KEY_LENGTH,
    "sha256",
  );
}

/**
 * Encrypts data using AES-256-GCM
 * Returns: iv + salt + tag + encryptedData (all as base64)
 */
export function encrypt(data: Buffer, userId: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(userId, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  // Combine: iv + salt + tag + encrypted data
  const combined = Buffer.concat([iv, salt, tag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypts data encrypted with encrypt()
 */
export function decrypt(encryptedData: string, userId: string): Buffer {
  try {
    const combined = Buffer.from(encryptedData, "base64");

    // Extract components
    const iv = combined.slice(0, IV_LENGTH);
    const salt = combined.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const tag = combined.slice(
      IV_LENGTH + SALT_LENGTH,
      IV_LENGTH + SALT_LENGTH + TAG_LENGTH,
    );
    const encrypted = combined.slice(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);

    const key = deriveKey(userId, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed: Invalid data or key");
  }
}

/**
 * Generates a unique license key for a device
 */
export function generateLicenseKey(userId: string, deviceId: string): string {
  const payload = JSON.stringify({
    userId,
    deviceId,
    timestamp: Date.now(),
  });

  // Derive a stable key from master key + userId
  const masterKey = getMasterKey();
  const key = crypto
    .createHash("sha256")
    .update(masterKey + userId)
    .digest();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(payload, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Validates a license key
 */
export function validateLicenseKey(
  licenseKey: string,
  userId: string,
  deviceId: string,
): boolean {
  try {
    const combined = Buffer.from(licenseKey, "base64");
    const iv = combined.slice(0, IV_LENGTH);
    const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);

    const masterKey = getMasterKey();
    const key = crypto
      .createHash("sha256")
      .update(masterKey + userId)
      .digest();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const payload = JSON.parse(decrypted.toString("utf8"));

    return payload.userId === userId && payload.deviceId === deviceId;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a checksum for file integrity verification
 */
export function generateChecksum(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Verifies file integrity using checksum
 */
export function verifyChecksum(
  data: Buffer,
  expectedChecksum: string,
): boolean {
  const actualChecksum = generateChecksum(data);
  return actualChecksum === expectedChecksum;
}
