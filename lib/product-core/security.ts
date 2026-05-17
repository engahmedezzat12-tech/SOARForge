import { NextRequest, NextResponse } from 'next/server';
import type { ProductRole } from './types';
import { can, type ProductPermission } from './rbac';

export interface ProductSession {
  userId: string;
  tenantId: string;
  role: ProductRole;
  email: string;
  name: string;
}

export const DEMO_SESSION: ProductSession = {
  userId: 'user_demo_admin',
  tenantId: 'tenant_internal_lab',
  role: 'TENANT_ADMIN',
  email: 'admin@soarforge.local',
  name: 'SOARForge Demo Admin',
};

export function getRequestSession(request?: NextRequest): ProductSession {
  const tenantId = request?.headers.get('x-soarforge-tenant') || DEMO_SESSION.tenantId;
  const role = (request?.headers.get('x-soarforge-role') as ProductRole | null) || DEMO_SESSION.role;
  return { ...DEMO_SESSION, tenantId, role };
}

export function requirePermission(request: NextRequest, permission: ProductPermission): ProductSession {
  const session = getRequestSession(request);
  if (!can(session.role, permission)) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return session;
}

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
