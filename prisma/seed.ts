import { PrismaClient, Role, ValidationStatus } from '@prisma/client';
import { hashPassword } from '../lib/auth/password';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SOARFORGE_ADMIN_PASSWORD;
  const adminPasswordHash = adminPassword ? await hashPassword(adminPassword) : undefined;
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'internal-lab' },
    update: {
      name: 'SOARForge Internal Lab',
      status: 'PILOT',
    },
    create: {
      name: 'SOARForge Internal Lab',
      slug: 'internal-lab',
      status: 'PILOT',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'admin@soarforge.local' },
    update: {
      tenantId: tenant.id,
      name: 'SOARForge Admin',
      role: Role.TENANT_ADMIN,
      status: 'ACTIVE',
      ...(adminPasswordHash ? { passwordHash: adminPasswordHash, lastPasswordChangeAt: new Date() } : {}),
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@soarforge.local',
      name: 'SOARForge Admin',
      role: Role.TENANT_ADMIN,
      status: 'ACTIVE',
      ...(adminPasswordHash ? { passwordHash: adminPasswordHash, lastPasswordChangeAt: new Date() } : {}),
    },
  });

  const playbook = await prisma.playbook.upsert({
    where: { id: 'pb_ransomware_auto_containment' },
    update: {
      tenantId: tenant.id,
      name: 'Ransomware Auto Containment',
      incidentType: 'Ransomware Behavior',
      platform: 'fortisoar',
      status: 'ready_with_review',
      data: { templateId: 'ransomware-auto-containment', source: 'database-seed' },
      createdById: user.id,
    },
    create: {
      id: 'pb_ransomware_auto_containment',
      tenantId: tenant.id,
      name: 'Ransomware Auto Containment',
      incidentType: 'Ransomware Behavior',
      platform: 'fortisoar',
      status: 'ready_with_review',
      data: { templateId: 'ransomware-auto-containment', source: 'database-seed' },
      createdById: user.id,
    },
  });

  const validationItems = [
    ['connector', 'Group-IB EDR connector instance', 'SOAR Administrator'],
    ['connector', 'Active Directory connector instance', 'SOAR Administrator'],
    ['connector', 'Email / Notification connector instance', 'SOAR Administrator'],
    ['action', 'Isolate Endpoint non-production validation', 'SOC Automation Engineer'],
    ['action', 'Disable AD User non-production validation', 'SOC Automation Engineer'],
    ['uat', 'End-to-end non-production UAT alert', 'SOC Lead'],
    ['rollback', 'Rollback / reversal procedure', 'SOC Automation Engineer'],
  ] as const;

  for (const [itemType, itemName, owner] of validationItems) {
    const existing = await prisma.validationResult.findFirst({
      where: {
        tenantId: tenant.id,
        itemType,
        itemName,
      },
    });

    if (!existing) {
      await prisma.validationResult.create({
        data: {
          tenantId: tenant.id,
          playbookId: playbook.id,
          itemType,
          itemName,
          owner,
          status: ValidationStatus.PENDING,
          evidence: '',
        },
      });
    }
  }

  const existingKnowledgeUpdate = await prisma.knowledgeUpdate.findFirst({
    where: {
      source: 'MITRE ATT&CK',
      stagedVersion: '2026.06-demo',
    },
  });

  if (!existingKnowledgeUpdate) {
    await prisma.knowledgeUpdate.create({
      data: {
        tenantId: tenant.id,
        source: 'MITRE ATT&CK',
        localVersion: '2026.05-local',
        stagedVersion: '2026.06-demo',
        status: 'REVIEW_REQUIRED',
        diff: [
          {
            diffId: 'diff_t1490_metadata',
            objectId: 'T1490',
            changeType: 'modified',
            impact: 'medium',
          },
          {
            diffId: 'diff_sigma_phishing_url',
            objectId: 'sigma-demo-phishing-url-click-context',
            changeType: 'added',
            impact: 'low',
          },
        ],
        affectedTemplates: [
          {
            templateId: playbook.id,
            templateName: playbook.name,
            impact: 'medium',
          },
        ],
        rollbackPoint: '2026.05-local',
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      action: 'DATABASE_SEEDED',
      targetType: 'tenant',
      targetId: tenant.id,
      metadata: {
        phase: 'phase-7-real-persistence',
        seededValidationItems: validationItems.length,
      },
    },
  });

  if (!adminPasswordHash) {
    console.warn('SOARFORGE_ADMIN_PASSWORD is not set. Admin user was seeded without a password hash.');
  }

  console.log('SOARForge database seed completed.');
  console.log({ tenant: tenant.slug, user: user.email, playbook: playbook.name });
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });