import { z } from 'zod';
import { equipmentCategories } from './exercise-query.js';
import {
  canonicalEquipment,
  experienceLevels,
  sessionLengths,
  trainingGoals,
} from './recommend.js';

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid muscle slug.');

const repsSchema = z
  .string()
  .trim()
  .regex(
    /^(?:[1-9]|[1-4]\d|50)(?:-(?:[1-9]|[1-4]\d|50))?$/,
    'Use a rep count such as 5 or 8-12.',
  );

const equipmentListSchema = z
  .array(z.enum(equipmentCategories))
  .min(1)
  .transform((categories) => canonicalEquipment(categories))
  .refine(
    (categories) => categories.length > 0,
    'Choose at least one equipment type.',
  );

function asEquipmentList(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === 'string' ? item.split(',') : [],
    );
  }
  if (typeof value === 'string') {
    return value.split(',');
  }
  return value;
}

function trimEquipment(value: unknown): unknown {
  const list = asEquipmentList(value);
  if (!Array.isArray(list)) {
    return list;
  }
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter(Boolean);
}

export const recommendationQuerySchema = z.object({
  muscle: slugSchema,
  goal: z.enum(trainingGoals),
  experience: z.enum(experienceLevels),
  equipment: z.preprocess(trimEquipment, equipmentListSchema),
  length: z.enum(sessionLengths).default('full'),
});

export const workoutExerciseInputSchema = z
  .object({
    exerciseId: z.string().trim().min(1),
    sets: z.number().int().min(1).max(10),
    reps: repsSchema,
    restSeconds: z.number().int().min(15).max(300),
  })
  .superRefine((value, context) => {
    const range = /^(\d+)-(\d+)$/.exec(value.reps);
    if (range && Number(range[2]) < Number(range[1])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rep range must go from fewer reps to more reps.',
        path: ['reps'],
      });
    }
  });

const exerciseListSchema = z
  .array(workoutExerciseInputSchema)
  .min(1)
  .max(16)
  .superRefine((exercises, context) => {
    const ids = exercises.map((exercise) => exercise.exerciseId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each exercise can appear only once.',
        path: [],
      });
    }
  });

export const createWorkoutSchema = z.object({
  muscle: slugSchema,
  goal: z.enum(trainingGoals),
  experience: z.enum(experienceLevels),
  equipmentCategories: equipmentListSchema,
  length: z.enum(sessionLengths).default('full'),
  exercises: exerciseListSchema,
});

export const updateWorkoutSchema = z.object({
  exercises: exerciseListSchema,
});

export const logSetSchema = z.object({
  workoutExerciseId: z.string().trim().min(1),
  round: z.number().int().min(1).max(10),
  setNumber: z.number().int().min(1).max(10),
  repsCompleted: z.number().int().min(0).max(100),
  weightKg: z.number().positive().max(500).nullable().optional(),
});

export const updateCooldownSchema = z
  .object({
    durationSeconds: z.number().int().min(20).max(90).optional(),
    status: z.enum(['completed', 'skipped']).optional(),
    replace: z.literal(true).optional(),
  })
  .refine(
    (value) =>
      value.durationSeconds !== undefined || value.status !== undefined || value.replace === true,
    'Choose a duration, a status, or a replacement.',
  );
