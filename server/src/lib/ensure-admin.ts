import type { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, PASSWORD_MIN_LENGTH } from './auth.js';

export async function ensureAdmin(db: PrismaClient) {
  const email = process.env.ADMIN_EMAIL?.trim() ?? '';
  const name = process.env.ADMIN_NAME?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email && !name && !password) {
    return;
  }
  if (!email || !name || password.length < PASSWORD_MIN_LENGTH) {
    console.error(
      `Admin account was not created. Set ADMIN_EMAIL, ADMIN_NAME, and a password of at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
    return;
  }
  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { email: normalizeEmail(email) },
    update: { name, passwordHash, role: 'admin', status: 'active', removedAt: null },
    create: {
      email: normalizeEmail(email),
      name,
      passwordHash,
      role: 'admin',
      status: 'active',
    },
  });
  console.log('Admin account is ready.');
}
