import { expect, test } from '@playwright/test';
import { createWorkout, SIGNED_OUT } from './helpers';

test('an admin invites a member, keeps data private, and removes access', async ({
  page,
  browser,
}, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${Date.now()}@example.com`;
  const password = 'e2e-member-password';

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Manage access' })).toBeVisible();
  await page.getByLabel('Email (optional)').fill(email);
  await page.getByRole('button', { name: 'Create invite' }).click();
  const link = await page.getByLabel('Link').inputValue();
  expect(link).toMatch(/\/invite\/[\w-]{40,}$/);

  const memberContext = await browser.newContext({ storageState: SIGNED_OUT });
  const member = await memberContext.newPage();
  await member.goto(link);
  await expect(member.getByLabel('Email')).toHaveValue(email);
  await member.getByLabel('Name').fill('E2E Member');
  await member.getByLabel('Password', { exact: true }).fill(password);
  await member.getByLabel('Confirm password').fill(password);
  await member.getByRole('button', { name: 'Create account' }).click();
  await expect(member.getByRole('link', { name: 'Build a workout' })).toBeVisible();
  await expect(member.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  const workoutId = await createWorkout(member.request);
  await member.goto(`/workouts/${workoutId}`);
  await expect(member.getByRole('button', { name: 'Start workout' })).toBeVisible();

  await page.goto(`/workouts/${workoutId}`);
  await expect(page.getByRole('heading', { name: 'Workout not found' })).toBeVisible();

  await member.goto('/admin');
  await expect(member.getByRole('heading', { name: 'Admins only' })).toBeVisible();

  await page.goto('/admin');
  const row = page.getByRole('listitem').filter({ hasText: email });
  await row.getByRole('button', { name: 'Remove access' }).click();
  await expect(row.getByText('Access removed')).toBeVisible();

  await member.goto('/history');
  await expect(member).toHaveURL(/\/login\?next=%2Fhistory$/);
  await member.getByLabel('Email').fill(email);
  await member.getByLabel('Password').fill(password);
  await member.getByRole('button', { name: 'Sign in' }).click();
  await expect(member.getByRole('alert')).toHaveText('This account no longer has access.');

  await row.getByRole('button', { name: 'Delete account' }).click();
  await row.getByLabel(/^Type .* to delete this account/).fill(email);
  await row.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: email })).toHaveCount(0);

  await memberContext.close();
});

test('a signed-out visitor only sees the sign-in page', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SIGNED_OUT });
  const page = await context.newPage();
  await page.goto('/history');
  await expect(page).toHaveURL(/\/login\?next=%2Fhistory$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  expect((await page.request.get('/api/v1/muscles')).status()).toBe(401);
  await context.close();
});
