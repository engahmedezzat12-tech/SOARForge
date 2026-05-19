import { NextResponse } from 'next/server';

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    return NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: 'Invalid origin header' }, { status: 403 });
  }

  if (originHost !== host) {
    return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
  }

  return null;
}