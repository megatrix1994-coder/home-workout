import { expect, test } from '@playwright/test';
import { SIGNED_OUT } from './helpers';

test('a person requests access on this device and signs in after the admin approves', async ({
  page,
  browser,
}, testInfo) => {
  const email = `e2e-request-${testInfo.project.name}-${Date.now()}@example.com`;
  const password = 'e2e-request-password';

  const visitorContext = await browser.newContext({ storageState: SIGNED_OUT });
  const visitor = await visitorContext.newPage();
  await visitor.goto('/login');
  await visitor.getByRole('link', { name: 'Create an account' }).click();
  await expect(visitor.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await visitor.getByLabel('Email').fill(email);
  await visitor.getByLabel('Name').fill('E2E Request');
  await visitor.getByLabel('Password', { exact: true }).fill(password);
  await visitor.getByLabel('Confirm password').fill(password);
  await visitor.getByRole('button', { name: 'Request access' }).click();
  await expect(visitor.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible();

  await visitor.goto('/login');
  await visitor.getByLabel('Email').fill(email);
  await visitor.getByLabel('Password').fill(password);
  await visitor.getByRole('button', { name: 'Sign in' }).click();
  await expect(visitor.getByRole('alert')).toHaveText('The admin has not approved your access yet.');

  await page.goto('/admin');
  const request = page.getByRole('region', { name: 'Access requests' }).getByRole('listitem').filter({
    hasText: email,
  });
  await expect(request).toBeVisible();
  await request.getByRole('button', { name: 'Approve' }).click();
  await expect(request).toHaveCount(0);

  await visitor.getByRole('button', { name: 'Sign in' }).click();
  await expect(visitor.getByRole('link', { name: 'Build a workout' })).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await visitorContext.close();
});
