import type { Equipment, Exercise, ExerciseEquipment, ExerciseMuscle, MuscleGroup } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { approvedAnimations } from '../lib/animations.js';
import {
  easierDifficulty,
  listPrerequisites,
  pickPrerequisite,
  type PrerequisiteCandidate,
} from '../lib/body-composition.js';
import { buildExerciseWhere, exerciseListQuerySchema } from '../lib/exercise-query.js';
import { HttpError } from '../lib/http.js';
import { progressionCycle } from '../lib/progression.js';
import { experienceLevels, trainingGoals, type TrainingGoal } from '../lib/recommend.js';
import { asyncHandler } from '../middleware/error-handler.js';

const prerequisiteQuerySchema = z.object({
  muscle: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid muscle slug.'),
  goal: z.enum(trainingGoals),
  experience: z.enum(experienceLevels),
});

const exerciseInclude = {
  muscles: { include: { muscle: true } },
  equipment: { include: { equipment: true } },
} as const;

const exerciseDetailInclude = {
  ...exerciseInclude,
  animations: {
    select: { id: true, format: true, assetUrl: true, reviewStatus: true },
  },
} as const;

type ExerciseRecord = Exercise & {
  muscles: (ExerciseMuscle & { muscle: MuscleGroup })[];
  equipment: (ExerciseEquipment & { equipment: Equipment })[];
  animations?: Array<{
    id: string;
    format: 'lottie' | 'video' | 'image';
    assetUrl: string;
    reviewStatus: 'draft' | 'approved';
  }>;
};

function serializeExercise(exercise: ExerciseRecord, includeInstructions: boolean) {
  const muscles = [...exercise.muscles].sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === 'primary' ? -1 : 1;
    }
    return left.muscle.name.localeCompare(right.muscle.name);
  });

  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    region: exercise.region,
    goals: exercise.goals ?? [],
    ...(includeInstructions
      ? { description: exercise.description, instructions: exercise.instructions }
      : {}),
    muscles: muscles.map((muscle) => ({
      slug: muscle.muscle.slug,
      name: muscle.muscle.name,
      role: muscle.role,
    })),
    equipment: exercise.equipment
      .map((item) => ({
        slug: item.equipment.slug,
        name: item.equipment.name,
        category: item.equipment.category,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    ...(includeInstructions ? { progression: progressionFor(exercise) } : {}),
    ...(includeInstructions ? { animations: approvedAnimations(exercise.animations) } : {}),
  };
}

function toCandidate(exercise: ExerciseRecord): PrerequisiteCandidate {
  return {
    slug: exercise.slug,
    name: exercise.name,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    region: exercise.region,
    goals: exercise.goals ?? [],
    muscles: exercise.muscles.map((muscle) => ({
      slug: muscle.muscle.slug,
      role: muscle.role,
    })),
  };
}

function progressionFor(exercise: ExerciseRecord) {
  const goal = exercise.goals?.[0] as TrainingGoal | undefined;
  if (!goal) {
    return [];
  }
  return progressionCycle({
    goal,
    movementType: exercise.movementType,
    bodyweightOnly: exercise.equipment.every(
      (item) => item.equipment.category === 'bodyweight',
    ),
  });
}

export const exercisesRouter = Router();

exercisesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = exerciseListQuerySchema.parse(req.query);
    const where = buildExerciseWhere(query);
    const regionWhere = buildExerciseWhere({ ...query, region: undefined });
    const [exercises, total, regionRows] = await Promise.all([
      prisma.exercise.findMany({
        where,
        include: exerciseInclude,
        orderBy: { name: 'asc' },
        skip: query.offset,
        take: query.limit,
      }),
      prisma.exercise.count({ where }),
      prisma.exercise.groupBy({
        by: ['region'],
        where: regionWhere,
      }),
    ]);

    res.json({
      data: exercises.map((exercise) => serializeExercise(exercise, false)),
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
        regions: regionRows.map((row) => row.region).sort(),
      },
    });
  }),
);

exercisesRouter.get(
  '/prerequisites',
  asyncHandler(async (req, res) => {
    const query = prerequisiteQuerySchema.parse(req.query);
    const listed = listPrerequisites(
      {
        muscleSlug: query.muscle,
        goal: query.goal,
        experience: query.experience,
      },
      [],
    );
    if (!listed.prerequisiteDifficulty) {
      res.json({ data: listed });
      return;
    }

    const muscle = await prisma.muscleGroup.findUnique({
      where: { slug: query.muscle },
    });
    if (!muscle) {
      res.json({ data: listed });
      return;
    }

    const rows = await prisma.exercise.findMany({
      where: {
        difficulty: listed.prerequisiteDifficulty,
        goals: { has: query.goal },
        muscles: { some: { role: 'primary', muscleId: muscle.id } },
      },
      include: exerciseInclude,
    });
    res.json({
      data: listPrerequisites(
        {
          muscleSlug: query.muscle,
          goal: query.goal,
          experience: query.experience,
        },
        rows.map((exercise) => toCandidate(exercise)),
      ),
    });
  }),
);

exercisesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const exercise = await prisma.exercise.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: exerciseDetailInclude,
    });

    if (!exercise) {
      throw new HttpError(404, 'NOT_FOUND', 'Exercise not found.');
    }

    const primary = exercise.muscles.find((muscle) => muscle.role === 'primary');
    const goal = exercise.goals?.[0];
    const easier = easierDifficulty(exercise.difficulty);
    let prerequisite: ReturnType<typeof pickPrerequisite> = null;
    if (easier && primary && goal) {
      const rows = await prisma.exercise.findMany({
        where: {
          difficulty: easier,
          region: exercise.region,
          goals: { has: goal },
          muscles: { some: { role: 'primary', muscleId: primary.muscleId } },
        },
        include: exerciseInclude,
      });
      prerequisite = pickPrerequisite(
        toCandidate(exercise),
        rows.map((row) => toCandidate(row)),
      );
    }

    const [previous, next] = await Promise.all([
      prisma.exercise.findFirst({
        where: {
          OR: [
            { name: { lt: exercise.name } },
            { name: exercise.name, slug: { lt: exercise.slug } },
          ],
        },
        orderBy: [{ name: 'desc' }, { slug: 'desc' }],
        select: { slug: true, name: true },
      }),
      prisma.exercise.findFirst({
        where: {
          OR: [
            { name: { gt: exercise.name } },
            { name: exercise.name, slug: { gt: exercise.slug } },
          ],
        },
        orderBy: [{ name: 'asc' }, { slug: 'asc' }],
        select: { slug: true, name: true },
      }),
    ]);

    res.json({
      data: {
        ...serializeExercise(exercise, true),
        navigation: { previous, next },
        prerequisite,
      },
    });
  }),
);
