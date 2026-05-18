import { createVerify } from 'crypto';

export function getTrustedBundlePublicKey() {
  const pem = process.env.SOARFORGE_BUNDLE_PUBLIC_KEY_PEM || process.env.SOARFORGE_BUNDLE_PUBLIC_KEY;
  return pem?.replace(/\\n/g, '\n').trim() || '';
}

export function isBundleSignatureRequired() {
  return process.env.SOARFORGE_REQUIRE_BUNDLE_SIGNATURE === 'true';
}

export function verifyBundleSignature(payload: Buffer, signatureBase64?: string | null) {
  const publicKey = getTrustedBundlePublicKey();
  const required = isBundleSignatureRequired();

  if (!publicKey) {
    return {
      configured: false,
      required,
      valid: !required,
      reason: required ? 'Bundle signature verification is required but no trusted public key is configured.' : 'Signature verification not configured.',
    };
  }

  if (!signatureBase64) {
    return {
      configured: true,
      required,
      valid: !required,
      reason: required ? 'Bundle signature is required.' : 'No signature supplied; staged without cryptographic verification.',
    };
  }

  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(payload);
    verifier.end();
    const valid = verifier.verify(publicKey, signatureBase64, 'base64');
    return {
      configured: true,
      required,
      valid,
      reason: valid ? 'Signature verified with trusted public key.' : 'Signature verification failed.',
    };
  } catch (error) {
    return {
      configured: true,
      required,
      valid: false,
      reason: 'Signature verification threw an error.',
    };
  }
}
