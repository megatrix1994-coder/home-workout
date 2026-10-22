import type {
  Equipment,
  Exercise,
  ExerciseEquipment,
  ExerciseMuscle,
  MuscleGroup,
} from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { approvedAnimations } from '../lib/animations.js';
import { HttpError } from '../lib/http.js';
import {
  exerciseReason,
  isEligible,
  listAlternatives,
  recommend,
  sessionSeconds,
  unknownMuscleRationale,
  type Candidate,
  type EquipmentCategory,
  type ExperienceLevel,
  type RecommendationInput,
  type TrainingGoal,
} from '../lib/recommend.js';
import { exerciseProgression, type LoggedSet } from '../lib/progression.js';
import {
  createWorkoutSchema,
  logSetSchema,
  recommendationQuerySchema,
  updateWorkoutSchema,
} from '../lib/workout-query.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { warmups as warmupCatalogue } from '../warmups.js';

const exerciseInclude = {
  muscles: { include: { muscle: true } },
  equipment: { include: { equipment: true } },
  animations: {
    select: { id: true, format: true, assetUrl: true, reviewStatus: true },
  },
} as const;

const workoutInclude = {
  muscle: true,
  exercises: {
    orderBy: { order: 'asc' as const },
    include: {
      exercise: { include: exerciseInclude },
      setLogs: { orderBy: [{ round: 'asc' as const }, { setNumber: 'asc' as const }] },
    },
  },
  warmups: {
    orderBy: { order: 'asc' as const },
    include: { stretch: true },
  },
};

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

type WorkoutSetLogRecord = {
  id: string;
  round: number;
  setNumber: number;
  repsCompleted: number;
  weightKg: number | null;
};

type WorkoutExerciseRecord = {
  id: string;
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  reason: string;
  exerciseId: string;
  exercise: ExerciseRecord;
  setLogs?: WorkoutSetLogRecord[];
};

type WorkoutWarmupRecord = {
  id: string;
  order: number;
  durationSeconds: number;
  stretch: {
    id: string;
    slug: string;
    name: string;
    instructions: string;
    durationSeconds: number;
  };
};

type WorkoutRecord = {
  id: string;
  status: 'draft' | 'started' | 'completed';
  startedAt: Date | null;
  completedAt: Date | null;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  equipmentCategories: EquipmentCategory[];
  rationale: string;
  estimatedMinutes: number;
  rounds: number;
  muscleId: string;
  muscle: { id: string; slug: string; name: string };
  exercises: WorkoutExerciseRecord[];
  warmups: WorkoutWarmupRecord[];
};

function toCandidate(exercise: ExerciseRecord): Candidate {
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
    description: exercise.description,
    instructions: exercise.instructions,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    region: exercise.region,
    goals: exercise.goals ?? [],
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
    animations: approvedAnimations(exercise.animations),
  };
}

function recommendationInput(
  muscle: { slug: string; name: string },
  goal: TrainingGoal,
  experience: ExperienceLevel,
  equipmentCategories: EquipmentCategory[],
): RecommendationInput {
  return {
    muscleSlug: muscle.slug,
    muscleName: muscle.name,
    goal,
    experience,
    equipmentCategories,
  };
}

async function loadWarmups(muscleId: string) {
  const rows = await prisma.stretch.findMany({
    where: {
      purpose: 'warmup',
      muscles: { some: { muscleId } },
    },
  });
  const order = new Map(
    warmupCatalogue.map((stretch, index) => [stretch.slug, index]),
  );
  return rows.sort(
    (left, right) =>
      (order.get(left.slug) ?? order.size) -
      (order.get(right.slug) ?? order.size),
  );
}

function presentWarmup(stretch: {
  id: string;
  slug: string;
  name: string;
  instructions: string;
  durationSeconds: number;
}) {
  return {
    id: stretch.id,
    slug: stretch.slug,
    name: stretch.name,
    instructions: stretch.instructions,
    durationSeconds: stretch.durationSeconds,
  };
}

async function loadPrimaryCandidates(muscleId: string) {
  const exercises = await prisma.exercise.findMany({
    where: { muscles: { some: { muscleId, role: 'primary' } } },
    include: exerciseInclude,
  });
  return exercises.map((exercise) => toCandidate(exercise));
}

async function loadRequestedExercises(ids: string[]) {
  const records = await prisma.exercise.findMany({
    where: { id: { in: ids } },
    include: exerciseInclude,
  });
  const byId = new Map(records.map((exercise) => [exercise.id, exercise]));
  if (ids.some((id) => !byId.has(id))) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'One or more exercises were not found.',
    );
  }
  return ids.map((id) => byId.get(id)!);
}

function assertEligible(
  records: ExerciseRecord[],
  muscleSlug: string,
  allowed: EquipmentCategory[],
) {
  const candidates = records.map((exercise) => toCandidate(exercise));
  if (
    candidates.some((candidate) => !isEligible(candidate, muscleSlug, allowed))
  ) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'One or more exercises do not match this muscle and equipment.',
    );
  }
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

async function serializeWorkout(workout: WorkoutRecord) {
  const input = recommendationInput(
    workout.muscle,
    workout.goal,
    workout.experience,
    workout.equipmentCategories,
  );
  const candidates = await loadPrimaryCandidates(workout.muscleId);
  const selectedIds = workout.exercises.map((exercise) => exercise.exerciseId);
  const previousLogs = await priorLogsByExercise({
    excludeId: workout.id,
    muscleId: workout.muscleId,
    goal: workout.goal,
    experience: workout.experience,
  });
  const exercises = [...workout.exercises].sort(
    (left, right) => left.order - right.order,
  );

  return {
    id: workout.id,
    status: workout.status,
    startedAt: workout.startedAt?.toISOString() ?? null,
    completedAt: workout.completedAt?.toISOString() ?? null,
    goal: workout.goal,
    experience: workout.experience,
    equipmentCategories: workout.equipmentCategories,
    rationale: workout.rationale,
    estimatedMinutes: workout.estimatedMinutes,
    rounds: workout.rounds,
    muscle: {
      id: workout.muscle.id,
      slug: workout.muscle.slug,
      name: workout.muscle.name,
    },
    warmups: [...workout.warmups]
      .sort((left, right) => left.order - right.order)
      .map((warmup) => ({
        id: warmup.id,
        order: warmup.order,
        durationSeconds: warmup.durationSeconds,
        stretch: presentWarmup(warmup.stretch),
      })),
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      order: exercise.order,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      reason: exercise.reason,
      setLogs: (exercise.setLogs ?? []).map((log) => ({
        id: log.id,
        round: log.round,
        setNumber: log.setNumber,
        repsCompleted: log.repsCompleted,
        weightKg: log.weightKg,
      })),
      exercise: toCandidate(exercise.exercise),
      progression: exerciseProgression({
        experience: workout.experience,
        goal: workout.goal,
        movementType: exercise.exercise.movementType,
        bodyweightOnly: exercise.exercise.equipment.every(
          (item) => item.equipment.category === 'bodyweight',
        ),
        expectedSets: exercise.sets * workout.rounds,
        currentLogs: exercise.setLogs ?? [],
        previousLogs: previousLogs.get(exercise.exerciseId)?.logs ?? null,
        previousExpectedSets: previousLogs.get(exercise.exerciseId)?.expectedSets ?? 0,
      }),
      alternatives: listAlternatives(
        input,
        candidates,
        selectedIds,
        exercise.exercise.region,
      ),
    })),
  };
}

async function priorLogsByExercise(query: {
  excludeId?: string;
  muscleId: string;
  goal: TrainingGoal;
  experience: ExperienceLevel;
}) {
  const plans = await prisma.workoutPlan.findMany({
    where: {
      ...(query.excludeId ? { id: { not: query.excludeId } } : {}),
      muscleId: query.muscleId,
      goal: query.goal,
      experience: query.experience,
      status: { in: ['started', 'completed'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      rounds: true,
      exercises: {
        select: {
          exerciseId: true,
          sets: true,
          setLogs: {
            orderBy: [{ round: 'asc' }, { setNumber: 'asc' }],
            select: { repsCompleted: true, weightKg: true },
          },
        },
      },
    },
  });
  const found = new Map<string, { logs: LoggedSet[]; expectedSets: number }>();
  for (const plan of plans) {
    for (const line of plan.exercises) {
      if (found.has(line.exerciseId) || line.setLogs.length === 0) {
        continue;
      }
      found.set(line.exerciseId, {
        logs: line.setLogs,
        expectedSets: line.sets * plan.rounds,
      });
    }
  }
  return found;
}

function routeId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export const workoutsRouter = Router();

workoutsRouter.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    const query = recommendationQuerySchema.parse(req.query);
    const muscle = await prisma.muscleGroup.findUnique({
      where: { slug: query.muscle },
    });
    if (!muscle) {
      res.json({
        data: {
          muscle: null,
          goal: query.goal,
          experience: query.experience,
          equipmentCategories: query.equipment,
          rationale: unknownMuscleRationale(),
          estimatedMinutes: 0,
          rounds: 1,
          warmups: [],
          exercises: [],
        },
      });
      return;
    }

    const warmups = await loadWarmups(muscle.id);
    const recommendation = recommend(
      recommendationInput(
        muscle,
        query.goal,
        query.experience,
        query.equipment,
      ),
      await loadPrimaryCandidates(muscle.id),
      warmups.reduce((sum, stretch) => sum + stretch.durationSeconds, 0),
      query.length,
    );
    const previousLogs = await priorLogsByExercise({
      muscleId: muscle.id,
      goal: query.goal,
      experience: query.experience,
    });

    res.json({
      data: {
        muscle: { id: muscle.id, slug: muscle.slug, name: muscle.name },
        goal: query.goal,
        experience: query.experience,
        equipmentCategories: query.equipment,
        rationale: recommendation.rationale,
        estimatedMinutes: recommendation.estimatedMinutes,
        rounds: recommendation.rounds,
        warmups: warmups.map((stretch) => presentWarmup(stretch)),
        exercises: recommendation.exercises.map((slot) => ({
          ...slot,
          progression: exerciseProgression({
            experience: query.experience,
            goal: query.goal,
            movementType: slot.exercise.movementType,
            bodyweightOnly: slot.exercise.equipment.every(
              (item) => item.category === 'bodyweight',
            ),
            expectedSets: slot.sets * recommendation.rounds,
            currentLogs: [],
            previousLogs: previousLogs.get(slot.exercise.id)?.logs ?? null,
            previousExpectedSets: previousLogs.get(slot.exercise.id)?.expectedSets ?? 0,
          }),
        })),
      },
    });
  }),
);

workoutsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createWorkoutSchema.parse(req.body);
    const muscle = await prisma.muscleGroup.findUnique({
      where: { slug: body.muscle },
    });
    if (!muscle) {
      throw new HttpError(404, 'NOT_FOUND', 'Muscle group not found.');
    }

    const records = await loadRequestedExercises(
      body.exercises.map((exercise) => exercise.exerciseId),
    );
    const byId = assertEligible(records, muscle.slug, body.equipmentCategories);
    const warmups = await loadWarmups(muscle.id);
    const warmupSeconds = warmups.reduce(
      (sum, stretch) => sum + stretch.durationSeconds,
      0,
    );
    const recommendation = recommend(
      recommendationInput(
        muscle,
        body.goal,
        body.experience,
        body.equipmentCategories,
      ),
      await loadPrimaryCandidates(muscle.id),
      warmupSeconds,
      body.length,
    );
    const estimatedMinutes = Math.round(
      sessionSeconds({
        exercises: body.exercises,
        rounds: recommendation.rounds,
        warmupSeconds,
      }) / 60,
    );

    const saved = await prisma.workoutPlan.create({
      data: {
        muscleId: muscle.id,
        goal: body.goal,
        experience: body.experience,
        equipmentCategories: body.equipmentCategories,
        rationale: recommendation.rationale,
        estimatedMinutes,
        rounds: recommendation.rounds,
        warmups: {
          create: warmups.map((stretch, index) => ({
            stretchId: stretch.id,
            order: index,
            durationSeconds: stretch.durationSeconds,
          })),
        },
        exercises: {
          create: body.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            order: index,
            sets: exercise.sets,
            reps: exercise.reps,
            restSeconds: exercise.restSeconds,
            reason: exerciseReason(byId.get(exercise.exerciseId)!, muscle.name),
          })),
        },
      },
      include: workoutInclude,
    });

    res.status(201).json({ data: await serializeWorkout(saved) });
  }),
);

workoutsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workout = await prisma.workoutPlan.findUnique({
      where: { id: routeId(req.params.id) },
      include: workoutInclude,
    });
    if (!workout) {
      throw new HttpError(404, 'NOT_FOUND', 'Workout not found.');
    }
    res.json({ data: await serializeWorkout(workout) });
  }),
);

workoutsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = updateWorkoutSchema.parse(req.body);
    const existing = await prisma.workoutPlan.findUnique({
      where: { id: routeId(req.params.id) },
      include: { muscle: true },
    });
    if (!existing) {
      throw new HttpError(404, 'NOT_FOUND', 'Workout not found.');
    }
    if (existing.status !== 'draft') {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'A started workout cannot be edited.',
      );
    }

    const records = await loadRequestedExercises(
      body.exercises.map((exercise) => exercise.exerciseId),
    );
    const byId = assertEligible(
      records,
      existing.muscle.slug,
      existing.equipmentCategories,
    );
    const warmups = await loadWarmups(existing.muscleId);
    const estimatedMinutes = Math.round(
      sessionSeconds({
        exercises: body.exercises,
        rounds: existing.rounds,
        warmupSeconds: warmups.reduce(
          (sum, stretch) => sum + stretch.durationSeconds,
          0,
        ),
      }) / 60,
    );

    await prisma.$transaction([
      prisma.workoutExercise.deleteMany({ where: { workoutId: existing.id } }),
      prisma.workoutExercise.createMany({
        data: body.exercises.map((exercise, index) => ({
          workoutId: existing.id,
          exerciseId: exercise.exerciseId,
          order: index,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
          reason: exerciseReason(
            byId.get(exercise.exerciseId)!,
            existing.muscle.name,
          ),
        })),
      }),
      prisma.workoutPlan.update({
        where: { id: existing.id },
        data: { estimatedMinutes },
      }),
    ]);

    const saved = await prisma.workoutPlan.findUnique({
      where: { id: existing.id },
      include: workoutInclude,
    });
    if (!saved) {
      throw new HttpError(404, 'NOT_FOUND', 'Workout not found.');
    }
    res.json({ data: await serializeWorkout(saved) });
  }),
);

workoutsRouter.post(
  '/:id/start',
  asyncHandler(async (req, res) => {
    const existing = await prisma.workoutPlan.findUnique({
      where: { id: routeId(req.params.id) },
      include: workoutInclude,
    });
    if (!existing) {
      throw new HttpError(404, 'NOT_FOUND', 'Workout not found.');
    }
    if (existing.status === 'started' || existing.status === 'completed') {
      res.json({ data: await serializeWorkout(existing) });
      return;
    }

    const started = await prisma.workoutPlan.update({
      where: { id: existing.id },
      data: { status: 'started', startedAt: new Date() },
      include: workoutInclude,
    });
    res.json({ data: await serializeWorkout(started) });
  }),
);

function loggedSetCount(workout: WorkoutRecord) {
  return workout.exercises.reduce(
    (sum, exercise) => sum + (exercise.setLogs?.length ?? 0),
    0,
  );
}

function expectedSetCount(workout: WorkoutRecord) {
  return (
    workout.rounds *
    workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)
  );
}

workoutsRouter.post(
  '/:id/sets',
  asyncHandler(async (req, res) => {
    const body = logSetSchema.parse(req.body);
    const existing = await prisma.workoutPlan.findUnique({
      where: { id: routeId(req.params.id) },
      include: workoutInclude,
    });
    if (!existing) {
      throw new HttpError(404, 'NOT_FOUND', 'Workout not found.');
    }
    if (existing.status !== 'started') {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Start the workout before logging a set.',
      );
    }

    const line = existing.exercises.find(
      (exercise) => exercise.id === body.workoutExerciseId,
    );
    if (!line) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'That exercise is not in this workout.');
    }
    if (body.round > existing.rounds || body.setNumber > line.sets) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'That set is outside this workout.',
      );
    }

    await prisma.workoutSetLog.upsert({
      where: {
        workoutExerciseId_round_setNumber: {
          workoutExerciseId: line.id,
          round: body.round,
          setNumber: body.setNumber,
        },
      },
      update: {
        repsCompleted: body.repsCompleted,
        weightKg: body.weightKg ?? null,
      },
      create: {
        workoutExerciseId: line.id,
        round: body.round,
        setNumber: body.setNumber,
        repsCompleted: body.repsCompleted,
        weightKg: body.weightKg ?? null,
      },
    });

    const saved = await prisma.workoutPlan.findUnique({
      where: { id: existing.id },
      include: workoutInclude,
    });
    if (!saved) {
      throw new HttpError(404, 'NOT_FOUND', 'Workout not found.');
    }

    if (loggedSetCount(saved) >= expectedSetCount(saved)) {
      const completed = await prisma.workoutPlan.update({
        where: { id: saved.id },
        data: { status: 'completed', completedAt: new Date() },
        include: workoutInclude,
      });
      res.json({ data: await serializeWorkout(completed) });
      return;
    }

    res.json({ data: await serializeWorkout(saved) });
  }),
);
