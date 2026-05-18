import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const pbkdf2 = promisify(pbkdf2Callback);
const ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';
const PREFIX = 'pbkdf2';

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 10) {
    throw new Error('Password must be at least 10 characters.');
  }
  const salt = randomBytes(16).toString('hex');
  const derived = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return `${PREFIX}$${ITERATIONS}$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!password || !storedHash) return false;
  const [prefix, iterationsRaw, salt, hashHex] = storedHash.split('$');
  if (prefix !== PREFIX || !iterationsRaw || !salt || !hashHex) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await pbkdf2(password, salt, iterations, expected.length, DIGEST);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
