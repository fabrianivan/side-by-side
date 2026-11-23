import crypto from 'node:crypto';

const AT_REST_PREFIX = 'sbs-aes-gcm-v1$';
const DEV_FALLBACK_KEY = 'side-by-side-dev-encryption-key-change-in-production-32bytes';

let cachedSecret: string | null = null;
let cachedAtRestKey: Buffer | null = null;

function deriveAtRestKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || DEV_FALLBACK_KEY;
  if (cachedAtRestKey && cachedSecret === secret) {
    return cachedAtRestKey;
  }
  cachedAtRestKey = crypto.scryptSync(secret, 'sbs-at-rest-aes-gcm-salt-v1', 32);
  cachedSecret = secret;
  return cachedAtRestKey;
}

/**
 * Hash kata sandi menggunakan scrypt dengan salt acak 16-byte dan verifikasi timing-safe.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `scrypt-v1$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  const storedKeyBuf = Buffer.from(keyHex, 'hex');
  if (storedKeyBuf.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKeyBuf, derivedKey);
}

/**
 * Enkripsi payload sensitif di sisi server (AES-256-GCM) sebelum disimpan ke database.
 */
export function encryptAtRest(plaintext: string): string {
  const key = deriveAtRestKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${AT_REST_PREFIX}${iv.toString('base64')}$${authTag.toString('base64')}$${encrypted.toString('base64')}`;
}

/**
 * Dekripsi payload terenkripsi AES-256-GCM dari database.
 * Mendukung fallback pembacaan JSON lama bila ada baris sebelum migrasi enkripsi.
 */
export function decryptAtRest(stored: string): string | null {
  if (!stored) return null;
  if (!stored.startsWith(AT_REST_PREFIX)) {
    return stored;
  }
  const body = stored.slice(AT_REST_PREFIX.length);
  const parts = body.split('$');
  if (parts.length !== 3) return null;
  const [ivB64, tagB64, ctB64] = parts;
  try {
    const key = deriveAtRestKey();
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Perbandingan timing-safe untuk kode undangan tenaga kesehatan.
 */
export function timingSafeStringMatch(input: string, expected: string): boolean {
  const digestA = crypto.createHash('sha256').update(input, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}
