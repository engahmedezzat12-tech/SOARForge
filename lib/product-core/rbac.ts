import type { ProductRole } from './types';

export type ProductPermission =
  | '*'
  | 'tenant:manage'
  | 'users:manage'
  | 'playbooks:read'
  | 'playbooks:create'
  | 'playbooks:export'
  | 'validation:read'
  | 'validation:update'
  | 'knowledge:read'
  | 'knowledge:review'
  | 'knowledge:approve'
  | 'audit:read'
  | 'admin:security'
  | 'deployment:read';

export const ROLE_PERMISSIONS: Record<ProductRole, ProductPermission[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: [
    'tenant:manage', 'users:manage', 'playbooks:read', 'playbooks:create',
    'playbooks:export', 'validation:read', 'validation:update', 'knowledge:read',
    'knowledge:review', 'knowledge:approve', 'audit:read', 'admin:security', 'deployment:read',
  ],
  SOC_MANAGER: [
    'playbooks:read', 'playbooks:create', 'playbooks:export', 'validation:read',
    'validation:update', 'knowledge:read', 'knowledge:review', 'audit:read', 'deployment:read',
  ],
  SOC_ENGINEER: [
    'playbooks:read', 'playbooks:create', 'playbooks:export', 'validation:read',
    'validation:update', 'knowledge:read', 'deployment:read',
  ],
  VIEWER: ['playbooks:read', 'validation:read', 'knowledge:read', 'deployment:read'],
  AUDITOR: ['audit:read', 'playbooks:read', 'validation:read', 'knowledge:read'],
};

export function can(role: ProductRole, permission: ProductPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function assertCan(role: ProductRole, permission: ProductPermission): void {
  if (!can(role, permission)) {
    throw new Error(`Role ${role} is not allowed to perform ${permission}`);
  }
}
