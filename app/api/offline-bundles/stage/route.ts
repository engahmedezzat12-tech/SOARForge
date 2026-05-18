import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { withSecureApi } from '@/lib/security/api-wrapper';
import { sha256Buffer, validateBundleFileMetadata, validateBundleMagicBytes } from '@/lib/security/file-validation';
import { verifyBundleSignature } from '@/lib/security/signature-verify';
import { recordSecurityEvent, SecurityEvents } from '@/lib/product-core/security-events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const POST = withSecureApi({
  permission: 'offline_bundle.upload',
  rateLimit: 'offlineBundleUpload',
  async handler({ request, session }) {
    const formData = await request.formData();
    const file = formData.get('bundle');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Bundle file is required.' }, { status: 422 });
    }

    const metadata = validateBundleFileMetadata({ fileName: file.name, size: file.size, contentType: file.type });
    if (!metadata.valid) {
      await recordSecurityEvent({
        tenantId: session.tenantId,
        userId: session.userId,
        eventType: SecurityEvents.OFFLINE_BUNDLE_REJECTED,
        severity: 'MEDIUM',
        metadata: { fileName: file.name, reason: metadata.reason },
      });
      return NextResponse.json({ error: metadata.reason }, { status: 422 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const payloadBuffer = Buffer.from(arrayBuffer);
    const magic = validateBundleMagicBytes(file.name, payloadBuffer);
    if (!magic.valid) {
      await recordSecurityEvent({
        tenantId: session.tenantId,
        userId: session.userId,
        eventType: SecurityEvents.OFFLINE_BUNDLE_REJECTED,
        severity: 'HIGH',
        metadata: { fileName: file.name, reason: magic.reason },
      });
      return NextResponse.json({ error: magic.reason }, { status: 422 });
    }

    const signature = formData.get('signature');
    const signatureResult = verifyBundleSignature(payloadBuffer, typeof signature === 'string' ? signature : null);
    if (!signatureResult.valid) {
      await recordSecurityEvent({
        tenantId: session.tenantId,
        userId: session.userId,
        eventType: SecurityEvents.OFFLINE_BUNDLE_REJECTED,
        severity: signatureResult.required ? 'CRITICAL' : 'MEDIUM',
        metadata: { fileName: file.name, reason: signatureResult.reason },
      });
      return NextResponse.json({ error: signatureResult.reason }, { status: 422 });
    }

    const fileHash = sha256Buffer(payloadBuffer);

    const staged = await prisma.offlineBundleImport.create({
      data: {
        tenantId: session.tenantId,
        uploadedById: session.userId,
        fileName: file.name,
        fileSize: file.size,
        fileHash,
        status: 'STAGED',
        validationJson: {
          contentType: file.type || 'unknown',
          magicBytes: magic.reason,
          signature: signatureResult,
          message: 'File metadata, magic bytes, and signature policy validated. Manual approval is required before any use.',
        },
      },
    });

    await recordSecurityEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      eventType: SecurityEvents.OFFLINE_BUNDLE_STAGED,
      severity: 'INFO',
      metadata: { importId: staged.id, fileName: file.name, fileHash },
    });

    return NextResponse.json({ mode: 'database', offlineBundleImport: staged });
  },
});
