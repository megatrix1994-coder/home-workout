import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createWorkout, SIGNED_OUT } from './helpers';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    serious.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    })),
  ).toEqual([]);
}

async function tabUntil(page: Page, names: string[], limit = 60) {
  const reached = new Set<string>();
  for (let step = 0; step < limit && reached.size < names.length; step += 1) {
    await page.keyboard.press('Tab');
    const name = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return '';
      const label = element.closest('label');
      return (
        element.getAttribute('aria-label') ??
        (label ? label.textContent : element.textContent) ??
        ''
      ).trim();
    });
    for (const wanted of names) {
      if (name.startsWith(wanted)) reached.add(wanted);
    }
  }
  return names.filter((name) => !reached.has(name));
}

test.describe('accessibility scans', () => {
  test('home, builder, exercises, and history have no serious issues', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/workouts/new?muscle=chest');
    await expect(page.getByRole('button', { name: 'Build workout' })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/exercises?muscle=chest');
    await expect(page.getByRole('link', { name: /press/i }).first()).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'Your sessions' })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('the sign-in page has no serious issues', async ({ browser }) => {
    const context = await browser.newContext({ storageState: SIGNED_OUT });
    const page = await context.newPage();
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectNoSeriousViolations(page);
    await context.close();
  });

  test('a saved and a started workout have no serious issues', async ({ page }) => {
    const id = await createWorkout(page.request);
    await page.goto(`/workouts/${id}`);
    await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.getByRole('button', { name: 'Start workout' }).click();
    await expect(
      page.getByRole('button', { name: /Next warm-up|Start exercises/ }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe('keyboard reach', () => {
  test('the primary navigation is reachable with Tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    const missing = await tabUntil(page, ['Workout', 'Muscles', 'Exercises', 'Meals', 'History']);
    expect(missing).toEqual([]);
  });

  test('the builder controls are reachable and the workout builds from the keyboard', async ({
    page,
  }) => {
    await page.goto('/workouts/new?muscle=chest');
    await expect(page.getByRole('button', { name: 'Build workout' })).toBeVisible();
    const missing = await tabUntil(page, [
      'Aim',
      'Muscle',
      'Goal',
      'Experience',
      'Session length',
      'Free weights',
      'Machines',
      'Bodyweight',
      'Build workout',
    ]);
    expect(missing).toEqual([]);
    await expect(page.getByRole('button', { name: 'Build workout' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Save workout' })).toBeVisible();
  });

  test('a started workout can be driven with the keyboard', async ({ page }) => {
    const id = await createWorkout(page.request);
    await page.goto(`/workouts/${id}`);
    const start = page.getByRole('button', { name: 'Start workout' });
    await expect(start).toBeVisible();
    expect(await tabUntil(page, ['Start workout'], 120)).toEqual([]);
    await expect(start).toBeFocused();
    await page.keyboard.press('Enter');

    const nextWarmup = page.getByRole('button', { name: 'Next warm-up' });
    const startExercises = page.getByRole('button', { name: 'Start exercises' });
    await expect(nextWarmup.or(startExercises)).toBeVisible();
    while (await nextWarmup.isVisible()) {
      await nextWarmup.focus();
      await page.keyboard.press('Enter');
    }
    await startExercises.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('button', { name: 'Complete set' })).toBeVisible();
    const missing = await tabUntil(page, ['Clean reps', 'Weight (kg)', 'Complete set'], 120);
    expect(missing).toEqual([]);
    await expect(page.getByRole('button', { name: 'Complete set' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Skip rest' })).toBeVisible();
  });
});
