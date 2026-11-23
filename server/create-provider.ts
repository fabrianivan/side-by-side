import { PrismaClient } from '@prisma/client';
import { hashPassword } from './crypto-auth';

/**
 * CLI utility for clinic administrators to provision a verified Healthcare Provider (nakes) account.
 * Usage: npx tsx server/create-provider.ts <email> <password> "<Display Name>"
 */
async function main() {
  const [rawEmail, password, displayName] = process.argv.slice(2);
  if (!rawEmail || !password || password.length < 8) {
    console.error('Usage: npx tsx server/create-provider.ts <email> <password(min 8 chars)> "<Display Name>"');
    process.exit(1);
  }

  const email = rawEmail.trim().toLowerCase();
  const prisma = new PrismaClient();

  try {
    const password_hash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password_hash,
        role: 'nakes',
        ...(displayName ? { display_name: displayName } : {}),
      },
      create: {
        email,
        password_hash,
        role: 'nakes',
        display_name: displayName || email.split('@')[0],
      },
    });
    console.log(`✅ Healthcare Provider account ready: ${user.email} (${user.display_name}) [id=${user.id}]`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Failed to provision provider account:', err);
  process.exit(1);
});
