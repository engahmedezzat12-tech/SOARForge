import { NextResponse } from 'next/server';

import { getCurrentSession, getRequestFingerprint, revokeCurrentSession } from '@/lib/auth/session';
import { recordSecurityEvent, SecurityEvents } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const fingerprint = await getRequestFingerprint(request);
  await revokeCurrentSession();

  if (session) {
    await recordSecurityEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      eventType: SecurityEvents.LOGOUT,
      severity: 'INFO',
      ipAddress: fingerprint.ipAddress,
      userAgent: fingerprint.userAgent,
    });
  }

  return NextResponse.json({ ok: true });
}
