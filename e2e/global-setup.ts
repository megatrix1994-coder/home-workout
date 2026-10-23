import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { request, type FullConfig } from '@playwright/test';

export const ADMIN_STATE = path.join(__dirname, '.auth', 'admin.json');

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:8080';
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to an admin account. Create one with npm run admin:create -- --keep-unowned.',
    );
  }

  const context = await request.newContext({ baseURL });
  const response = await context.post('/api/v1/auth/login', {
    headers: { Origin: new URL(baseURL).origin },
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`The end-to-end admin could not sign in (${response.status()}).`);
  }
  mkdirSync(path.dirname(ADMIN_STATE), { recursive: true });
  await context.storageState({ path: ADMIN_STATE });
  await context.dispose();
}
