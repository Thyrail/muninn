// Idempotent seed: ensures the demo user exists with the configured password.
// Writes Better Auth's credential account directly (hashPassword from better-auth/crypto),
// so seeding works even when public sign-up is disabled.
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { createPrismaClient } from './client.js';

const CREDENTIAL_PROVIDER = 'credential';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

async function main(): Promise<void> {
  const email = requireEnv('DEMO_USER_EMAIL').toLowerCase();
  const password = requireEnv('DEMO_USER_PASSWORD');
  const prisma = createPrismaClient(requireEnv('DATABASE_URL'));

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { id: randomUUID(), email, name: 'Demo', emailVerified: true },
    });

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: CREDENTIAL_PROVIDER },
    });
    if (account) {
      await prisma.account.update({ where: { id: account.id }, data: { password: passwordHash } });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: CREDENTIAL_PROVIDER,
          password: passwordHash,
        },
      });
    }
    console.log(`Seed: demo user ready (${email}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
