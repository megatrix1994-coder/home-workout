import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { exercises } from '../src/catalogue.js';
import { cooldowns } from '../src/cooldowns.js';
import { MEAL_GUIDANCE } from '../src/lib/nutrition.js';
import { foods, meals } from '../src/nutrition.js';
import { warmups } from '../src/warmups.js';

const outDir = path.resolve(__dirname, '../../content-review');
const signOff = ['Verdict (approve or change)', 'Notes', 'Reviewer name', 'Date'];

function cell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeSheet(file: string, header: string[], rows: Array<Array<string | number>>) {
  const lines = [header, ...rows.map((row) => [...row, '', '', '', ''])].map((row) =>
    row.map(cell).join(','),
  );
  // The byte-order mark makes Excel open the file as UTF-8.
  writeFileSync(path.join(outDir, file), `\uFEFF${lines.join('\r\n')}\r\n`);
  console.log(`Wrote ${rows.length} rows to content-review/${file}.`);
}

const demo = (slug: string) => `client/public/demonstrations/${slug}.mp4`;

mkdirSync(outDir, { recursive: true });

writeSheet(
  'exercises.csv',
  ['Slug', 'Name', 'Muscles', 'Difficulty', 'Goal', 'Equipment', 'Description', 'Instructions', 'Demonstration', ...signOff],
  exercises.map((exercise) => [
    exercise.slug,
    exercise.name,
    exercise.muscles.map((muscle) => `${muscle.slug} (${muscle.role})`).join('; '),
    exercise.difficulty,
    exercise.goal,
    exercise.equipment.join('; '),
    exercise.description,
    exercise.instructions,
    demo(exercise.slug),
  ]),
);

writeSheet(
  'warmups.csv',
  ['Slug', 'Name', 'Muscles', 'Seconds', 'Instructions', ...signOff],
  warmups.map((warmup) => [warmup.slug, warmup.name, warmup.muscles.join('; '), warmup.durationSeconds, warmup.instructions]),
);

writeSheet(
  'cooldowns.csv',
  ['Slug', 'Name', 'Muscle', 'Version', 'Seconds', 'Instructions', 'Demonstration', ...signOff],
  cooldowns.map((stretch) => [
    stretch.slug,
    stretch.name,
    stretch.muscle,
    stretch.ease,
    stretch.durationSeconds,
    stretch.instructions,
    demo(stretch.slug),
  ]),
);

writeSheet(
  'nutrition.csv',
  ['Type', 'Slug', 'Name', 'Details', 'Allergens', 'Diets', 'Nutrients and source', ...signOff],
  [
    ['Disclaimer', 'meal-guidance', 'Shown with every meal list', MEAL_GUIDANCE, '', '', ''],
    ...foods.map((food) => [
      'Food',
      food.slug,
      food.name,
      `Region: ${food.region}. Serving: ${food.servingSize}. Preparation: ${food.preparation}`,
      food.allergens.join('; ') || 'none listed',
      food.diets.join('; ') || 'none',
      food.nutrients.length
        ? `${food.nutrients.map((row) => `${row.nutrient} ${row.amount} ${row.unit}`).join(', ')}. Source: ${food.nutrients[0]!.sourceName}`
        : 'Not shown: no sourced values',
    ]),
    ...meals.map((meal) => [
      'Meal',
      meal.slug,
      meal.name,
      `Timing: ${meal.timing}. Region: ${meal.region}. Budget: ${meal.budget}. Prep: ${meal.prepMinutes} min. Emphasis: ${meal.emphasis}. Foods: ${meal.foods.join(', ')}. Rationale: ${meal.rationale}`,
      '',
      '',
      '',
    ]),
  ],
);
