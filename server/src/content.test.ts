import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { exercises, muscleGroups } from './catalogue.js';
import { cooldowns, easierSlug, gentleSlug } from './cooldowns.js';
import { MEAL_GUIDANCE } from './lib/nutrition.js';
import { foods, meals } from './nutrition.js';
import { warmups } from './warmups.js';

const demonstrations = path.resolve(__dirname, '../../client/public/demonstrations');

const medicalClaims = /\b(cure|cures|treat|treats|heal|heals|detox|guarantee|guaranteed|prevents? injury|burns? fat)\b/i;

function cueProblems(instructions: string) {
  const lines = instructions.split('\n');
  const problems: string[] = [];
  if (!/^Setup: \S/.test(lines[0] ?? '')) {
    problems.push('no Setup line first');
  }
  const steps = lines.filter((line) => /^\d+\. /.test(line));
  if (steps.length < 2) {
    problems.push('fewer than two numbered steps');
  }
  steps.forEach((step, index) => {
    if (!step.startsWith(`${index + 1}. `) || step.slice(`${index + 1}. `.length).trim() === '') {
      problems.push(`step ${index + 1} is out of order or empty`);
    }
  });
  if (!lines.some((line) => /^Breathing: \S/.test(line))) {
    problems.push('no Breathing line');
  }
  if (!/^Common mistakes: \S/.test(lines[lines.length - 1] ?? '')) {
    problems.push('no Common mistakes line last');
  }
  if (lines.some((line) => line.trim() === '')) {
    problems.push('an empty line');
  }
  return problems;
}

function failures<T>(items: T[], label: (item: T) => string, check: (item: T) => string[]) {
  return items.flatMap((item) => check(item).map((problem) => `${label(item)}: ${problem}`));
}

describe('exercise content', () => {
  it('gives every exercise setup, ordered steps, breathing, and common mistakes', () => {
    expect(failures(exercises, (exercise) => exercise.slug, (exercise) => cueProblems(exercise.instructions))).toEqual([]);
  });

  it('has a demonstration clip for every exercise and cooldown stretch', () => {
    const slugs = [...exercises.map((exercise) => exercise.slug), ...cooldowns.map((stretch) => stretch.slug)];
    expect(slugs.filter((slug) => !existsSync(path.join(demonstrations, `${slug}.mp4`)))).toEqual([]);
  });

  it('makes no medical claims in exercise text', () => {
    expect(
      exercises
        .filter((exercise) => medicalClaims.test(`${exercise.description} ${exercise.instructions}`))
        .map((exercise) => exercise.slug),
    ).toEqual([]);
  });
});

describe('warm-up and cooldown content', () => {
  it('gives every muscle a gentle and an easier cooldown', () => {
    const slugs = new Set(cooldowns.map((stretch) => stretch.slug));
    const missing = muscleGroups.flatMap((muscle) =>
      [gentleSlug(muscle.slug), easierSlug(muscle.slug)].filter((slug) => !slugs.has(slug)),
    );
    expect(missing).toEqual([]);
  });

  it('keeps every hold between 20 and 90 seconds', () => {
    const outside = [...warmups, ...cooldowns].filter(
      (stretch) => stretch.durationSeconds < 20 || stretch.durationSeconds > 90,
    );
    expect(outside.map((stretch) => stretch.slug)).toEqual([]);
  });

  it('gives every cooldown complete cues', () => {
    expect(failures(cooldowns, (stretch) => stretch.slug, (stretch) => cueProblems(stretch.instructions))).toEqual([]);
  });

  it('tells people to stay out of pain in every stretch', () => {
    const silent = [...warmups, ...cooldowns].filter(
      (stretch) => !/\b(pain|painful|hurts?|sharp)\b/i.test(stretch.instructions),
    );
    expect(silent.map((stretch) => stretch.slug)).toEqual([]);
  });

  it('gives every muscle at least one warm-up', () => {
    const covered = new Set(warmups.flatMap((warmup) => warmup.muscles));
    expect(muscleGroups.map((muscle) => muscle.slug).filter((slug) => !covered.has(slug))).toEqual([]);
  });
});

describe('nutrition content', () => {
  it('names a source for every nutrient number', () => {
    const unsourced = foods.flatMap((food) =>
      food.nutrients.filter((row) => row.sourceName.trim() === '').map((row) => `${food.slug}: ${row.nutrient}`),
    );
    expect(unsourced).toEqual([]);
  });

  it('lists the allergen a food name points to', () => {
    const expected: Array<[RegExp, string]> = [
      [/\b(milk|yogurt|yoghurt|cheese|mala|maziwa)\b/i, 'milk'],
      [/\begg/i, 'egg'],
      [/\bpeanut|groundnut/i, 'peanut'],
      [/\b(fish|omena|tilapia|tuna|sardine)/i, 'fish'],
      [/\b(soy|soya|tofu)\b/i, 'soy'],
      [/\b(wheat|bread|chapati|pasta)\b/i, 'gluten'],
      [/\b(almond|cashew|walnut|macadamia)/i, 'tree_nut'],
    ];
    const missing = foods.flatMap((food) =>
      expected
        .filter(([pattern, allergen]) => pattern.test(food.name) && !food.allergens.includes(allergen as never))
        .map(([, allergen]) => `${food.slug}: ${allergen}`),
    );
    expect(missing).toEqual([]);
  });

  it('keeps animal allergens off vegan foods and meat off vegetarian foods', () => {
    const wrong = foods.filter(
      (food) =>
        (food.diets.includes('vegan') && food.allergens.some((allergen) => ['milk', 'egg', 'fish'].includes(allergen))) ||
        (food.diets.includes('vegetarian') && /\b(chicken|beef|goat|fish|meat|tuna)\b/i.test(food.name)),
    );
    expect(wrong.map((food) => food.slug)).toEqual([]);
  });

  it('builds every meal from known foods and makes no medical claims', () => {
    const slugs = new Set(foods.map((food) => food.slug));
    expect(meals.flatMap((meal) => meal.foods.filter((slug) => !slugs.has(slug)).map((slug) => `${meal.slug}: ${slug}`))).toEqual([]);
    expect(meals.filter((meal) => medicalClaims.test(`${meal.name} ${meal.rationale}`)).map((meal) => meal.slug)).toEqual([]);
  });

  it('states that meals are general guidance', () => {
    expect(MEAL_GUIDANCE).toMatch(/general guidance/i);
    expect(MEAL_GUIDANCE).toMatch(/not a medical diet/i);
  });
});
