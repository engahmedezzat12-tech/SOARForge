// ============================================================
// SOARForge — Unsafe Pattern Rules
// Blocks or warns on risky actions before export.
// ============================================================

export interface UnsafePatternRule {
  id: string;
  title: string;
  severity: 'warning' | 'critical';
  keywords: string[];
  requiresApproval: boolean;
  message: string;
  recommendation: string;
}

export const UNSAFE_PATTERN_RULES: UnsafePatternRule[] = [
  {
    id: 'endpoint_isolation_requires_review',
    title: 'Endpoint isolation requires safety review',
    severity: 'warning',
    keywords: [
      'isolate',
      'contain host',
      'contain endpoint',
      'network containment',
      'edr.device.isolate',
      'isolate_endpoint',
    ],
    requiresApproval: false,
    message: 'Endpoint isolation can disrupt business operations.',
    recommendation: 'Ensure asset criticality checks and rollback/unisolate steps exist.',
  },
  {
    id: 'privileged_user_disable_requires_approval',
    title: 'Privileged user disable requires approval',
    severity: 'critical',
    keywords: [
      'disable user',
      'disable_ad_user',
      'ad-disable-account',
      'suspend account',
      'iam.user.disable',
    ],
    requiresApproval: true,
    message: 'Disabling accounts can lock out administrators or business-critical users.',
    recommendation: 'Add analyst approval and privileged-user guardrails before disabling users.',
  },
  {
    id: 'email_delete_requires_approval',
    title: 'Email deletion requires approval',
    severity: 'critical',
    keywords: ['delete email', 'delete message', 'ews-delete', 'o365-delete'],
    requiresApproval: true,
    message: 'Deleting emails can remove business evidence or legitimate communications.',
    recommendation: 'Use quarantine first where possible, and require analyst approval for deletion.',
  },
  {
    id: 'firewall_block_requires_context',
    title: 'Firewall block requires context checks',
    severity: 'warning',
    keywords: [
      'block ip',
      'block_ip',
      'panorama-create-rule',
      'fortigate-block-ip',
      'waf block',
      'firewall.ip.block',
    ],
    requiresApproval: false,
    message: 'Blocking IPs can impact shared/CDN/cloud services.',
    recommendation: 'Check CDN/cloud ownership and reputation before automatic blocking.',
  },
  {
    id: 'cloud_destructive_action_requires_approval',
    title: 'Cloud destructive action requires approval',
    severity: 'critical',
    keywords: ['terminate instance', 'detach public ip', 'delete bucket', 'delete disk', 'remove role'],
    requiresApproval: true,
    message: 'Cloud containment actions can cause outages or data loss.',
    recommendation: 'Add approval, snapshot/backup step, and rollback action before execution.',
  },
];
