import { prisma } from '../lib/db/prisma';
import { hashPassword } from '../lib/auth/password';

type Role =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'SOC_MANAGER'
  | 'SOC_ENGINEER'
  | 'VIEWER'
  | 'AUDITOR';

async function main() {
  const email = process.argv[2];
  const name = process.argv[3];
  const password = process.argv[4];
  const role = (process.argv[5] || 'VIEWER') as Role;

  if (!email || !name || !password) {
    throw new Error(
      'Usage: pnpm.cmd tsx scripts/create-user.ts email name password role'
    );
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'internal-lab' },
  });

  if (!tenant) {
    throw new Error('Tenant internal-lab not found. Run seed first.');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name,
      role,
      status: 'ACTIVE',
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      lastPasswordChangeAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      email: email.toLowerCase(),
      name,
      role,
      status: 'ACTIVE',
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      lastPasswordChangeAt: new Date(),
    },
  });

  console.log('User created/updated successfully');
  console.log({
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    tenantId: user.tenantId,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });