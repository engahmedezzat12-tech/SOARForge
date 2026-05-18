import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    name: session.name,
    role: session.role,
    tenantId: session.tenantId,
  });
}