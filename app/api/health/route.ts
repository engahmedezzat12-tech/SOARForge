import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: 'SOARForge',
      status: 'healthy',
      database: 'connected',
      version: 'pilot-ready',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        ok: false,
        service: 'SOARForge',
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }
}