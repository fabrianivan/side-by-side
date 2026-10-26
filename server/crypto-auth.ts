import crypto from 'node:crypto';

/**
 * Hash kata sandi menggunakan parameter Argon2/scrypt yang aman dengan salt acak 16-byte.
 * Mendukung verifikasi timing-safe untuk mencegah timing attack.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `argon2id-compat$${salt}$${derivedKey.toString('hex')}`;
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
