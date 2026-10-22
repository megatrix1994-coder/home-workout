import type { Equipment, Exercise, ExerciseEquipment, ExerciseMuscle, MuscleGroup } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { approvedAnimations } from '../lib/animations.js';
import { buildExerciseWhere, exerciseListQuerySchema } from '../lib/exercise-query.js';
import { HttpError } from '../lib/http.js';
import { progressionCycle } from '../lib/progression.js';
import type { TrainingGoal } from '../lib/recommend.js';
import { asyncHandler } from '../middleware/error-handler.js';

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
    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        include: exerciseInclude,
        orderBy: { name: 'asc' },
        skip: query.offset,
        take: query.limit,
      }),
      prisma.exercise.count({ where }),
    ]);

    res.json({
      data: exercises.map((exercise) => serializeExercise(exercise, false)),
      meta: { total, limit: query.limit, offset: query.offset },
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

    res.json({ data: serializeExercise(exercise, true) });
  }),
);
