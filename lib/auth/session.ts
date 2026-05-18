import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role, User } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { generateSessionToken, hashToken } from '@/lib/auth/tokens';

export const SESSION_COOKIE_NAME = 'soarforge_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type CurrentSession = {
  sessionId: string;
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
};

export async function getRequestFingerprint(request?: Request) {
  const headerStore = await headers();
  return {
    ipAddress:
      request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request?.headers.get('x-real-ip') ||
      headerStore.get('x-real-ip') ||
      undefined,
    userAgent: request?.headers.get('user-agent') || headerStore.get('user-agent') || undefined,
  };
}

export async function createSession(user: Pick<User, 'id' | 'tenantId' | 'email' | 'name' | 'role'>, request?: Request) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  const fingerprint = await getRequestFingerprint(request);

  await prisma.session.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      tokenHash,
      userAgent: fingerprint.userAgent,
      ipAddress: fingerprint.ipAddress,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { token, expiresAt };
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.user.id,
    tenantId: session.tenantId,
    email: session.user.email,
    name: session.user.name ?? session.user.email,
    role: session.user.role,
  };
}

export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/sign-in');
  }
  return session;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
