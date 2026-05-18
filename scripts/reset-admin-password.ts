import { prisma } from '../lib/db/prisma';
import { hashPassword } from '../lib/auth/password';

async function main() {
  const email = 'admin@soarforge.local';
  const rawPassword = process.env.SOARFORGE_ADMIN_PASSWORD;

  if (!rawPassword) {
    throw new Error('SOARFORGE_ADMIN_PASSWORD is not set');
  }

  const password = rawPassword.trim();
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
      lastPasswordChangeAt: new Date(),
    },
  });

  console.log('Admin password reset successfully');
  console.log({
    email: user.email,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil,
    hasPasswordHash: Boolean(user.passwordHash),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });