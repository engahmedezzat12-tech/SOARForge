const sections = [
  ['Authentication', 'Demo login foundation included. Replace with Auth.js/Keycloak before production.'],
  ['Authorization / RBAC', 'Role-permission matrix and protected API pattern included.'],
  ['Secure API Routes', 'Routes include permission checks, Zod validation, and security headers.'],
  ['Input Validation', 'Zod schemas included for tenants, validation updates, exports, and approvals.'],
  ['File Upload Validation', 'Offline bundle safety model documented with extension, size, schema, and signature checks.'],
  ['Rate Limiting', 'In-memory rate limiter included as a replaceable adapter for Redis/Upstash.'],
  ['Secrets Handling', '.env.example and deployment guide define secret boundaries.'],
  ['No Tenant Data Leakage', 'Tenant-scoped store and query pattern included; DB implementation must enforce tenant_id on every query.'],
  ['No Cross-Tenant Learning Leakage', 'Tenant learning records are separated from global knowledge updates.'],
  ['Docker / Deployment', 'Dockerfile, docker-compose, deployment guide, backup/restore docs, and admin guide included.'],
  ['Commercial Packaging', 'Landing page plan, demo script, pitch deck outline, pricing model, license terms, and support model included.'],
];

export default function SecurityReadinessPage() {
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Phase 1-6 Readiness</p>
          <h1 className="text-3xl font-bold">Security, Deployment & Commercial Checklist</h1>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map(([title, body]) => (
            <div key={title} className="rounded-lg border border-border p-4">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
