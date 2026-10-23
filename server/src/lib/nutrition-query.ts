import { z } from 'zod';
import { bodyIntents } from './body-composition.js';
import {
  allergens,
  budgetBands,
  dietPatterns,
  foodRegions,
  mealTimings,
} from './nutrition.js';
import { trainingGoals } from './recommend.js';

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

function trimList(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return [];
  }
  const raw = Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter(Boolean);
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return typeof value === 'number' ? value : Number(value);
}

export const nutritionQuerySchema = z.object({
  timing: z.preprocess(blankToUndefined, z.enum(mealTimings).optional()),
  region: z.preprocess(blankToUndefined, z.enum(foodRegions).optional()),
  diet: z.preprocess(blankToUndefined, z.enum(dietPatterns).optional()),
  exclude: z.preprocess(trimList, z.array(z.enum(allergens)).default([])),
  budget: z.preprocess(blankToUndefined, z.enum(budgetBands).optional()),
  maxPrepMinutes: z.preprocess(
    optionalNumber,
    z.number().int().min(0).max(240).optional(),
  ),
  goal: z.preprocess(blankToUndefined, z.enum(trainingGoals).optional()),
  intent: z.preprocess(blankToUndefined, z.enum(bodyIntents).optional()),
});
