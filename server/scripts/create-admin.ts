import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, PASSWORD_MIN_LENGTH } from '../src/lib/auth.js';

const prisma = new PrismaClient();

async function ask(question: string) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || (await ask('Admin email: ')));
  const name = (process.env.ADMIN_NAME || (await ask('Admin name: '))).trim();
  const password = process.env.ADMIN_PASSWORD || (await ask('Admin password: '));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  if (!name) {
    throw new Error('Enter a name.');
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Use a password of at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: 'admin', status: 'active', removedAt: null },
    create: { email, name, passwordHash, role: 'admin' },
  });
  console.log(`Admin ready: ${admin.email}.`);
  if (process.argv.includes('--keep-unowned')) {
    return;
  }
  const claimed = await prisma.workoutPlan.updateMany({
    where: { userId: null },
    data: { userId: admin.id },
  });
  if (claimed.count > 0) {
    console.log(`Assigned ${claimed.count} existing workouts to this admin.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
