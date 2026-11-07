import type { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, PASSWORD_MIN_LENGTH } from './auth.js';

export async function ensureAdmin(db: PrismaClient) {
  const email = process.env.ADMIN_EMAIL?.trim() ?? '';
  const name = process.env.ADMIN_NAME?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD?.trim() ?? '';
  if (!email && !name && !password) {
    return;
  }
  if (!email || !name || password.length < PASSWORD_MIN_LENGTH) {
    console.error(
      `Admin account was not created. Set ADMIN_EMAIL, ADMIN_NAME, and a password of at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
    return;
  }
  const normalized = normalizeEmail(email);
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return;
  }
  await db.user.create({
    data: {
      email: normalized,
      name,
      passwordHash: await hashPassword(password),
      role: 'admin',
      status: 'active',
    },
  });
  console.log('Admin account is ready.');
}
