import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  return NextResponse.json(
    {
      error: 'Demo login is disabled. Use /sign-in with a real session-backed account.',
    },
    { status: 410 },
  );
}
