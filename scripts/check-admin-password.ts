import { prisma } from '../lib/db/prisma';
import { verifyPassword } from '../lib/auth/password';

async function main() {
  const email = 'admin@soarforge.local';
  const rawPassword = process.env.SOARFORGE_ADMIN_PASSWORD;

  if (!rawPassword) {
    throw new Error('SOARFORGE_ADMIN_PASSWORD is not set');
  }

  const password = rawPassword.trim();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  if (!user.passwordHash) {
    throw new Error('User has no passwordHash');
  }

  const matches = await verifyPassword(password, user.passwordHash);

  console.log({
    email: user.email,
    envPasswordLength: rawPassword.length,
    trimmedPasswordLength: password.length,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil,
    hasPasswordHash: Boolean(user.passwordHash),
    passwordMatchesHash: matches,
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