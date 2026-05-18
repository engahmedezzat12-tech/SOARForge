import { NextResponse } from 'next/server';

import { updateDatabaseValidationResult } from '@/lib/product-core/db-store';
import { ValidationUpdateSchema } from '@/lib/product-core/input-validation';
import { withSecureApi } from '@/lib/security/api-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const POST = withSecureApi({
  permission: 'validation.update',
  schema: ValidationUpdateSchema,
  rateLimit: 'validationUpdate',
  async handler({ session, body }) {
    const updated = await updateDatabaseValidationResult({
      id: body.id,
      tenantId: session.tenantId,
      status: body.status,
      evidence: body.evidence,
      validatedBy: body.validatedBy ?? session.name,
      userId: session.userId,
    });

    if (!updated) {
      return NextResponse.json({ mode: 'database', error: 'Validation item not found' }, { status: 404 });
    }

    return NextResponse.json({ mode: 'database', validationResult: updated });
  },
});
