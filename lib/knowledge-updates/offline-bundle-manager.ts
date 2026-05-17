import type { OfflineKnowledgeBundleManifest } from './knowledge-update-types';

export function createDemoOfflineBundleManifest(): OfflineKnowledgeBundleManifest {
  return {
    bundleId: 'soarforge-demo-bundle-2026-05',
    createdAt: '2026-05-17T19:35:00Z',
    createdBy: 'SOARForge Demo Generator',
    sources: ['mitre_attack_enterprise', 'sigma_hq', 'cisa_kev', 'lolbas'],
    signatureStatus: 'not_required_for_demo',
    checksum: 'demo-bundle-checksum-not-for-production',
    mode: 'demo',
    objectCount: 24,
  };
}

export function validateOfflineBundleName(fileName: string): { valid: boolean; message: string } {
  if (!fileName.endsWith('.tar.gz') && !fileName.endsWith('.json')) {
    return { valid: false, message: 'Offline bundle must be a signed .tar.gz package or approved JSON demo bundle.' };
  }
  return { valid: true, message: 'Bundle name accepted for staging. Signature validation is required before approval in production.' };
}
