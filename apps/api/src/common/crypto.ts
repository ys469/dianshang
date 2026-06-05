import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const HASH_PREFIX = 'scrypt';
const HASH_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, HASH_KEY_LENGTH).toString('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [prefix, salt, hash] = storedHash.split('$');
  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, HASH_KEY_LENGTH);
  return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
}
