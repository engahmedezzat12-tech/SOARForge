import { NextRequest, NextResponse } from 'next/server';
import { DEMO_SESSION, securityHeaders } from '@/lib/product-core/security';
import { writeAuditLog } from '@/lib/product-core/audit';

export async function POST(request: NextRequest) {
  await writeAuditLog({
    tenantId: DEMO_SESSION.tenantId,
    userId: DEMO_SESSION.userId,
    action: 'DEMO_LOGIN_CREATED',
    targetType: 'session',
    ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    metadata: { authMode: 'demo-foundation', nextStep: 'replace-with-authjs-or-keycloak' },
  });

  const response = NextResponse.json({
    ok: true,
    session: DEMO_SESSION,
    note: 'Demo foundation login. Replace with Auth.js/Keycloak before customer production.',
  });
  response.cookies.set('soarforge_demo_session', 'demo-admin', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return securityHeaders(response);
}
