import { expect, test, type Page } from '@playwright/test';

async function finishWarmups(page: Page) {
  const next = page.getByRole('button', { name: 'Next warm-up' });
  const start = page.getByRole('button', { name: 'Start exercises' });
  await expect(next.or(start)).toBeVisible();
  while (await next.isVisible()) {
    await next.click();
  }
  await start.click();
}

async function logEverySet(page: Page) {
  const complete = page.getByRole('button', { name: 'Complete set' });
  const skipRest = page.getByRole('button', { name: 'Skip rest' });
  const cooldownDone = page.getByRole('button', { name: 'Done' });
  const finished = page.getByRole('heading', { name: 'Workout complete' });

  for (let guard = 0; guard < 80; guard += 1) {
    await expect(complete.or(skipRest).or(cooldownDone).or(finished)).toBeVisible();
    if (await skipRest.isVisible()) {
      await skipRest.click();
      continue;
    }
    if (await complete.isVisible()) {
      await complete.click();
      await expect(page.getByRole('button', { name: 'Saving…' })).toHaveCount(0);
      continue;
    }
    return;
  }
  throw new Error('The session did not reach the cooldown.');
}

async function finishCooldown(page: Page) {
  const done = page.getByRole('button', { name: 'Done' });
  const finished = page.getByRole('heading', { name: 'Workout complete' });
  for (let guard = 0; guard < 20; guard += 1) {
    await expect(done.or(finished)).toBeVisible();
    if (await finished.isVisible()) {
      return;
    }
    const stretch = await page.getByRole('heading', { level: 2 }).first().textContent();
    await done.click();
    await expect(page.getByRole('heading', { level: 2, name: stretch ?? '' })).toHaveCount(0);
  }
  throw new Error('The cooldown did not finish.');
}

test('builds, runs, and records a chest bodyweight cut session', async ({ page }) => {
  await page.goto('/workouts/new?muscle=chest&intent=cut');
  await expect(page.getByRole('heading', { name: 'Build a workout' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /^Muscle/ })).toHaveValue('chest');
  await expect(page.getByRole('combobox', { name: /^Goal/ })).toHaveValue('strength');

  await page.getByRole('checkbox', { name: 'Free weights' }).uncheck();
  await page.getByRole('checkbox', { name: 'Machines' }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Bodyweight' })).toBeChecked();
  await page.getByRole('button', { name: 'Build workout' }).click();

  const save = page.getByRole('button', { name: 'Save workout' });
  await expect(save).toBeVisible();
  await save.click();
  await expect(page).toHaveURL(/\/workouts\/c[a-z0-9]+$/);
  const workoutUrl = page.url();
  await expect(page.getByText('Saved workout')).toBeVisible();

  await page.getByRole('button', { name: 'Start workout' }).click();
  await finishWarmups(page);
  await logEverySet(page);
  await finishCooldown(page);

  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('link', { name: 'View history' }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();

  const completed = page.locator('section', {
    has: page.getByRole('heading', { name: 'Completed', exact: true }),
  });
  const card = completed.locator(`a[href="${new URL(workoutUrl).pathname}"]`);
  await expect(card).toBeVisible();
  await expect(card).toContainText('Chest workout');
  await expect(card).toContainText(/(\d+) of \1 sets? logged/);
  await expect(page.getByText(/^Chest: \d+$/)).toBeVisible();
});

test('keeps the written instructions when the demonstration video fails', async ({ page }) => {
  await page.route('**/*.mp4', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/exercises/barbell-bench-press');

  await expect(page.getByRole('heading', { name: 'Barbell bench press' })).toBeVisible();
  await expect(page.getByLabel('Exercise demonstration')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Setup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Execution' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Breathing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Common mistakes' })).toBeVisible();
});
