import crypto from 'crypto';

/**
 * Encryption utilities for protecting sensitive text data at rest. Uses
 * AES-256-GCM with a 32-byte key supplied via the ENCRYPTION_KEY
 * environment variable (hex encoded). Each encryption call generates a
 * random IV and authentication tag which are concatenated with the
 * ciphertext using ':' separators. The decrypt function reverses this
 * process. If the ENCRYPTION_KEY is not defined, the functions will
 * throw an error.
 */

const algorithm = 'aes-256-gcm';

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return key;
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(data: string): string {
  const key = getKey();
  const parts = data.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}