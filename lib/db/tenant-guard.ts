export function resolveTenantIdFromSession(session: { tenantId: string }) {
  if (!session.tenantId) throw new Error('Tenant context missing.');
  return session.tenantId;
}

export function rejectTenantIdFromClientInput(body: unknown) {
  if (body && typeof body === 'object' && 'tenantId' in body) {
    throw new Error('Client-supplied tenantId is not allowed.');
  }
}

export function ensureTenantScopedWhere<T extends Record<string, unknown>>(where: T, tenantId: string): T & { tenantId: string } {
  return { ...where, tenantId };
}
