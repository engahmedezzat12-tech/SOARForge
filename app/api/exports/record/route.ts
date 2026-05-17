import { NextRequest, NextResponse } from 'next/server';
import { ExportRecordSchema } from '@/lib/product-core/input-validation';
import { jsonError, requirePermission, securityHeaders } from '@/lib/product-core/security';
import { addExportRecord } from '@/lib/product-core/store';
import { writeAuditLog } from '@/lib/product-core/audit';

export async function POST(request: NextRequest) {
  try {
    const session = requirePermission(request, 'playbooks:export');
    const body = ExportRecordSchema.parse(await request.json());
    const record = addExportRecord({
      tenantId: session.tenantId,
      playbookId: body.playbookId,
      exportType: body.exportType,
      platform: body.platform,
      fileName: body.fileName ?? `${body.exportType}.${body.platform}`,
      readinessScore: body.readinessScore,
      threatCoverageScore: body.threatCoverageScore,
      intelligenceScore: body.intelligenceScore,
      createdById: session.userId,
    });
    await writeAuditLog({ tenantId: session.tenantId, userId: session.userId, action: 'EXPORT_RECORDED', targetType: 'export', targetId: record.id, metadata: body });
    return securityHeaders(NextResponse.json({ ok: true, export: record }));
  } catch (error) {
    return jsonError(error);
  }
}
