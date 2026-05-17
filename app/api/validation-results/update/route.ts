import { NextResponse } from 'next/server';

import { updateDatabaseValidationResult } from '@/lib/product-core/db-store';
import { ValidationUpdateSchema } from '@/lib/product-core/input-validation';

const TENANT_ID = 'tenant_internal_lab';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ValidationUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          mode: 'database',
          error: 'Invalid validation update payload',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updated = await updateDatabaseValidationResult({
      id: parsed.data.id,
      tenantId: TENANT_ID,
      status: parsed.data.status,
      evidence: parsed.data.evidence,
      validatedBy: parsed.data.validatedBy ?? 'SOARForge Admin',
    });

    if (!updated) {
      return NextResponse.json(
        {
          mode: 'database',
          error: 'Validation item not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      mode: 'database',
      validationResult: updated,
    });
  } catch (error) {
    console.error('Validation result DB update failed:', error);

    return NextResponse.json(
      {
        mode: 'database',
        error: 'Failed to update validation result in database',
      },
      { status: 500 },
    );
  }
}