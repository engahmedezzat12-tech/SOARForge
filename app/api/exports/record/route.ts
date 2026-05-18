import { NextResponse } from 'next/server';
import { ExportRecordSchema } from '@/lib/product-core/input-validation';
import { prisma } from '@/lib/db/prisma';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const POST = withSecureApi({
  permission: 'export.create',
  schema: ExportRecordSchema,
  rateLimit: 'generalApi',
  async handler({ session, body }) {
    const record = await prisma.export.create({
      data: {
        tenantId: session.tenantId,
        playbookId: body.playbookId,
        exportType: body.exportType,
        platform: body.platform,
        fileName: body.fileName ?? `${body.exportType}.${body.platform}`,
        readinessScore: body.readinessScore,
        threatCoverageScore: body.threatCoverageScore,
        intelligenceScore: body.intelligenceScore,
        createdById: session.userId,
      },
    });
    return NextResponse.json({ ok: true, export: record });
  },
});
