import type { Role } from '@prisma/client';

export type Permission =
  | 'admin.read'
  | 'validation.read'
  | 'validation.update'
  | 'audit.read'
  | 'security.read'
  | 'knowledge.read'
  | 'knowledge.approve'
  | 'export.create'
  | 'tenant.manage'
  | 'user.manage'
  | 'offline_bundle.upload'
  | 'offline_bundle.review';

const ALL_PERMISSIONS: Permission[] = [
  'admin.read',
  'validation.read',
  'validation.update',
  'audit.read',
  'security.read',
  'knowledge.read',
  'knowledge.approve',
  'export.create',
  'tenant.manage',
  'user.manage',
  'offline_bundle.upload',
  'offline_bundle.review',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  TENANT_ADMIN: [
    'admin.read',
    'validation.read',
    'validation.update',
    'audit.read',
    'security.read',
    'knowledge.read',
    'knowledge.approve',
    'export.create',
    'tenant.manage',
    'user.manage',
    'offline_bundle.upload',
    'offline_bundle.review',
  ],
  SOC_MANAGER: ['admin.read', 'validation.read', 'validation.update', 'audit.read', 'knowledge.read', 'export.create'],
  SOC_ENGINEER: ['validation.read', 'validation.update', 'knowledge.read', 'export.create'],
  AUDITOR: ['admin.read', 'validation.read', 'audit.read', 'security.read'],
  VIEWER: ['admin.read', 'validation.read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export function assertTenantAccess(sessionTenantId: string, requestedTenantId: string): void {
  if (sessionTenantId !== requestedTenantId) {
    throw new Error('Cross-tenant access denied.');
  }
}
