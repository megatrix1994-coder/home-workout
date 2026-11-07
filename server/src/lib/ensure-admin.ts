import type { PrismaClient } from '@prisma/client';
import { hashPassword, normalizeEmail, PASSWORD_MIN_LENGTH } from './auth.js';

export type AdminBootstrap = {
  email: string;
  name: string;
  password: string;
};

export function adminBootstrapFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AdminBootstrap | null {
  const email = env.ADMIN_EMAIL ? normalizeEmail(env.ADMIN_EMAIL) : '';
  const password = env.ADMIN_PASSWORD ?? '';
  const name = (env.ADMIN_NAME ?? 'Admin').trim();
  if (!email || !password || !name) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < PASSWORD_MIN_LENGTH) {
    return null;
  }
  return { email, name, password };
}

export async function ensureAdmin(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  const admin = adminBootstrapFromEnv(env);
  if (!admin) {
    if (env.ADMIN_EMAIL || env.ADMIN_PASSWORD) {
      console.error('Admin bootstrap was skipped because the account settings are incomplete.');
    }
    return;
  }
  const passwordHash = await hashPassword(admin.password);
  await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      name: admin.name,
      passwordHash,
      role: 'admin',
      status: 'active',
      removedAt: null,
    },
    create: {
      email: admin.email,
      name: admin.name,
      passwordHash,
      role: 'admin',
      status: 'active',
    },
  });
  console.log('Admin account is ready.');
}
