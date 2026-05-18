import { createHash, randomBytes } from 'crypto';

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionSecret(): string {
  const value = process.env.SOARFORGE_SESSION_SECRET || process.env.AUTH_SECRET || '';
  if (!value || value.length < 32) {
    throw new Error('SOARFORGE_SESSION_SECRET must be configured with at least 32 characters.');
  }
  return value;
}
