import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, PASSWORD_MIN_LENGTH, verifyPassword } from './auth.js';

const PASSWORD_STAMP = 'admin-password-stamp';

function passwordStamp(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

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
  const stamp = passwordStamp(password);
  const [existing, applied] = await Promise.all([
    db.user.findUnique({ where: { email: normalized } }),
    db.serverSetting.findUnique({ where: { key: PASSWORD_STAMP } }),
  ]);
  if (
    existing &&
    applied?.value === stamp &&
    (await verifyPassword(password, existing.passwordHash))
  ) {
    return;
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    await db.user.update({
      where: { email: normalized },
      data: { name, passwordHash, role: 'admin', status: 'active', removedAt: null },
    });
  } else {
    await db.user.create({
      data: {
        email: normalized,
        name,
        passwordHash,
        role: 'admin',
        status: 'active',
      },
    });
  }
  await db.serverSetting.upsert({
    where: { key: PASSWORD_STAMP },
    create: { key: PASSWORD_STAMP, value: stamp },
    update: { value: stamp },
  });
  console.log('Admin account is ready.');
}
