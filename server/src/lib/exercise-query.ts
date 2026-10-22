import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const equipmentCategories = ['free_weight', 'machine', 'bodyweight'] as const;
const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
const trainingGoals = ['strength', 'hypertrophy', 'general_fitness', 'endurance'] as const;

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const exerciseListQuerySchema = z.object({
  search: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  muscle: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid muscle slug.')
      .optional(),
  ),
  equipmentCategory: z.preprocess(
    blankToUndefined,
    z.enum(equipmentCategories).optional(),
  ),
  difficulty: z.preprocess(blankToUndefined, z.enum(difficulties).optional()),
  goal: z.preprocess(blankToUndefined, z.enum(trainingGoals).optional()),
  limit: z.preprocess(
    (value) => (value === undefined || value === '' ? 100 : value),
    z.coerce.number().int().min(1).max(100),
  ),
  offset: z.preprocess(
    (value) => (value === undefined || value === '' ? 0 : value),
    z.coerce.number().int().min(0),
  ),
});

export type ExerciseListQuery = z.infer<typeof exerciseListQuerySchema>;

export function buildExerciseWhere(query: ExerciseListQuery): Prisma.ExerciseWhereInput {
  const where: Prisma.ExerciseWhereInput = {};

  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  if (query.muscle) {
    where.muscles = { some: { muscle: { slug: query.muscle } } };
  }

  if (query.equipmentCategory) {
    where.equipment = { some: { equipment: { category: query.equipmentCategory } } };
  }

  if (query.difficulty) {
    where.difficulty = query.difficulty;
  }

  if (query.goal) {
    where.goals = { has: query.goal };
  }

  return where;
}
