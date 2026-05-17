import { NextRequest, NextResponse } from 'next/server';
import { ValidationUpdateSchema } from '@/lib/product-core/input-validation';
import { jsonError, requirePermission, securityHeaders } from '@/lib/product-core/security';
import { updateValidationResult, summarizeReadiness, addTenantLearning } from '@/lib/product-core/store';
import { writeAuditLog } from '@/lib/product-core/audit';

export async function POST(request: NextRequest) {
  try {
    const session = requirePermission(request, 'validation:update');
    const body = ValidationUpdateSchema.parse(await request.json());
    const result = updateValidationResult({ ...body, tenantId: session.tenantId });
    if (!result) return NextResponse.json({ ok: false, error: 'Validation item not found' }, { status: 404 });

    if (body.status === 'PASSED' || body.status === 'FAILED') {
      addTenantLearning({
        tenantId: session.tenantId,
        signalType: body.status === 'PASSED' ? 'uat_passed' : 'uat_failed',
        signalKey: result.itemName,
        confidenceDelta: body.status === 'PASSED' ? 5 : -10,
        metadata: { validationId: result.id, itemType: result.itemType },
      });
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'VALIDATION_RESULT_UPDATED',
      targetType: 'validation_result',
      targetId: result.id,
      metadata: { status: body.status, itemName: result.itemName },
    });

    return securityHeaders(NextResponse.json({ ok: true, validationResult: result, readiness: summarizeReadiness(session.tenantId) }));
  } catch (error) {
    return jsonError(error);
  }
}
