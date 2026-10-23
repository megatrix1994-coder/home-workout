import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findUniqueMuscle,
  findManyExercises,
  findManyStretches,
  findUniqueWorkout,
  findFirstWorkout,
  findManyWorkouts,
  findUniqueSession,
  createWorkout,
  updateWorkout,
  deleteWorkoutExercises,
  createWorkoutExercises,
  upsertSetLog,
  findFirstStretch,
  createCooldown,
  updateCooldown,
  transaction,
} = vi.hoisted(() => ({
  findUniqueMuscle: vi.fn(),
  findManyExercises: vi.fn(),
  findManyStretches: vi.fn(),
  findUniqueWorkout: vi.fn(),
  findFirstWorkout: vi.fn(),
  findManyWorkouts: vi.fn(),
  findUniqueSession: vi.fn(),
  createWorkout: vi.fn(),
  updateWorkout: vi.fn(),
  deleteWorkoutExercises: vi.fn(),
  createWorkoutExercises: vi.fn(),
  upsertSetLog: vi.fn(),
  findFirstStretch: vi.fn(),
  createCooldown: vi.fn(),
  updateCooldown: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    $transaction: transaction,
    muscleGroup: { findUnique: findUniqueMuscle },
    exercise: { findMany: findManyExercises },
    stretch: { findMany: findManyStretches, findFirst: findFirstStretch },
    workoutCooldown: { createMany: createCooldown, update: updateCooldown },
    session: { findUnique: findUniqueSession, update: vi.fn(), deleteMany: vi.fn() },
    workoutPlan: {
      findUnique: findUniqueWorkout,
      findFirst: findFirstWorkout,
      findMany: findManyWorkouts,
      create: createWorkout,
      update: updateWorkout,
    },
    workoutExercise: {
      deleteMany: deleteWorkoutExercises,
      createMany: createWorkoutExercises,
    },
    workoutSetLog: { upsert: upsertSetLog },
  },
}));

import { createApp } from './app.js';
import { sessionFor, TEST_COOKIE, testMember } from './test/session.js';

const app = createApp();
const api = request.agent(app).set('Cookie', TEST_COOKIE).set('Sec-Fetch-Site', 'same-origin');

beforeEach(() => {
  findUniqueSession.mockResolvedValue(sessionFor(testMember));
});

const chest = {
  id: 'm-1',
  slug: 'chest',
  name: 'Chest',
  anatomicalRegion: 'Upper body',
  sortOrder: 1,
};

function catalogueExercise(input: {
  id: string;
  slug: string;
  name: string;
  difficulty?: string;
  category: string;
  equipmentSlug: string;
  equipmentName: string;
}) {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    description: `${input.name} description.`,
    instructions: `Setup: Start the ${input.name}.\n1. Move with control.`,
    difficulty: input.difficulty ?? 'beginner',
    movementType: 'compound',
    region: 'mid',
    muscles: [{ role: 'primary', muscle: { slug: 'chest', name: 'Chest' } }],
    equipment: [
      {
        equipment: {
          slug: input.equipmentSlug,
          name: input.equipmentName,
          category: input.category,
        },
      },
    ],
  };
}

const pushUp = catalogueExercise({
  id: 'ex-push',
  slug: 'push-up',
  name: 'Push-up',
  category: 'bodyweight',
  equipmentSlug: 'bodyweight',
  equipmentName: 'Bodyweight',
});

const machinePress = catalogueExercise({
  id: 'ex-machine',
  slug: 'machine-chest-press',
  name: 'Chest press',
  category: 'machine',
  equipmentSlug: 'chest-press-machine',
  equipmentName: 'Chest press machine',
});

const dumbbellPress = catalogueExercise({
  id: 'ex-db',
  slug: 'dumbbell-bench-press',
  name: 'Dumbbell bench press',
  difficulty: 'intermediate',
  category: 'free_weight',
  equipmentSlug: 'dumbbell',
  equipmentName: 'Dumbbell',
});

const catalog = [pushUp, machinePress, dumbbellPress];

type StoredWorkout = {
  id: string;
  userId?: string;
  muscleId: string;
  goal: string;
  experience: string;
  equipmentCategories: string[];
  rationale: string;
  estimatedMinutes: number;
  rounds: number;
  status: string;
  startedAt: Date | null;
  completedAt?: Date | null;
  muscle: typeof chest;
  cooldowns?: Array<{
    id: string;
    order: number;
    durationSeconds: number;
    status: string;
    muscleId: string;
    stretchId: string;
    muscle: { id: string; slug: string; name: string };
    stretch: {
      id: string;
      slug: string;
      name: string;
      instructions: string;
      durationSeconds: number;
      animations: unknown[];
    };
  }>;
  warmups: Array<{
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
  }>;
  exercises: Array<{
    id: string;
    order: number;
    sets: number;
    reps: string;
    restSeconds: number;
    reason: string;
    exerciseId: string;
    exercise: (typeof catalog)[number] & {
      animations?: Array<{
        id: string;
        format: string;
        assetUrl: string;
        reviewStatus?: string;
      }>;
    };
    setLogs?: Array<{
      id: string;
      round: number;
      setNumber: number;
      repsCompleted: number;
      weightKg: number | null;
    }>;
  }>;
};

let current: StoredWorkout | null = null;

function lineFrom(
  item: {
    exerciseId: string;
    order: number;
    sets: number;
    reps: string;
    restSeconds: number;
    reason: string;
  },
  index: number,
) {
  const exercise = catalog.find((entry) => entry.id === item.exerciseId);
  if (!exercise) {
    throw new Error(`Missing ${item.exerciseId}`);
  }
  return {
    id: `line-${index}`,
    order: item.order,
    sets: item.sets,
    reps: item.reps,
    restSeconds: item.restSeconds,
    reason: item.reason,
    exerciseId: item.exerciseId,
    exercise,
  };
}

describe('workout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current = null;
    findUniqueMuscle.mockImplementation(
      async ({ where }: { where: { slug: string } }) =>
        where.slug === 'chest' ? chest : null,
    );
    findManyExercises.mockImplementation(
      async (args?: { where?: { id?: { in?: string[] } } }) => {
        const ids = args?.where?.id?.in;
        if (ids) {
          return catalog.filter((exercise) => ids.includes(exercise.id));
        }
        return catalog;
      },
    );
    findManyStretches.mockResolvedValue([]);
    findFirstStretch.mockResolvedValue(null);
    createCooldown.mockResolvedValue({ count: 0 });
    updateCooldown.mockResolvedValue({});
    findUniqueWorkout.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        current && where.id === current.id ? current : null,
    );
    findFirstWorkout.mockImplementation(
      async ({ where }: { where: { id: string; userId: string } }) =>
        current &&
        where.id === current.id &&
        where.userId === (current.userId ?? testMember.id)
          ? current
          : null,
    );
    findManyWorkouts.mockResolvedValue([]);
    createWorkout.mockImplementation(
      async ({
        data,
      }: {
        data: StoredWorkout & {
          exercises: {
            create: Array<{
              exerciseId: string;
              order: number;
              sets: number;
              reps: string;
              restSeconds: number;
              reason: string;
            }>;
          };
          warmups: {
            create: Array<{
              stretchId: string;
              order: number;
              durationSeconds: number;
            }>;
          };
        };
      }) => {
        current = {
          id: 'workout-1',
          userId: data.userId,
          muscleId: chest.id,
          goal: data.goal,
          experience: data.experience,
          equipmentCategories: data.equipmentCategories,
          rationale: data.rationale,
          estimatedMinutes: data.estimatedMinutes,
          rounds: data.rounds,
          status: 'draft',
          startedAt: null,
          muscle: chest,
          warmups: data.warmups.create.map((warmup, index) => ({
            id: `warmup-${index}`,
            order: warmup.order,
            durationSeconds: warmup.durationSeconds,
            stretch: {
              id: warmup.stretchId,
              slug: warmup.stretchId,
              name: 'Warm-up',
              instructions: 'Setup: Move slowly.',
              durationSeconds: warmup.durationSeconds,
            },
          })),
          exercises: data.exercises.create.map(lineFrom),
        };
        return current;
      },
    );
    updateWorkout.mockImplementation(
      async ({ data }: { data: Partial<StoredWorkout> }) => {
        current = {
          ...current!,
          ...data,
        };
        return current;
      },
    );
    deleteWorkoutExercises.mockResolvedValue({ count: 1 });
    createWorkoutExercises.mockImplementation(
      async ({
        data,
      }: {
        data: Array<{
          exerciseId: string;
          order: number;
          sets: number;
          reps: string;
          restSeconds: number;
          reason: string;
        }>;
      }) => {
        current = { ...current!, exercises: data.map(lineFrom) };
        return { count: data.length };
      },
    );
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it('rejects an incomplete recommendation query', async () => {
    const response = await api.get('/api/v1/workouts/recommendations');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findUniqueMuscle).not.toHaveBeenCalled();
  });

  it('returns an empty recommendation when the muscle is unknown', async () => {
    const response = await api.get(
      '/api/v1/workouts/recommendations?muscle=not-a-muscle&goal=strength&experience=beginner&equipment=bodyweight',
    );
    expect(response.status).toBe(200);
    expect(response.body.data.exercises).toEqual([]);
    expect(response.body.data.rationale).toContain('No muscle group matches');
    expect(findManyExercises).not.toHaveBeenCalled();
  });

  it('recommends only exercises that match the selected equipment', async () => {
    const response = await api.get(
      '/api/v1/workouts/recommendations?muscle=chest&goal=strength&experience=beginner&equipment=bodyweight',
    );

    expect(response.status).toBe(200);
    expect(
      response.body.data.exercises.map(
        (item: { exercise: { slug: string } }) => item.exercise.slug,
      ),
    ).toEqual(['push-up']);
    expect(response.body.data.exercises[0]).toMatchObject({
      sets: 4,
      reps: '5',
      restSeconds: 180,
    });
    expect(response.body.data.rounds).toBe(3);
    expect(response.body.data.estimatedMinutes).toBe(51);
    expect(response.body.data.warmups).toEqual([]);
    expect(response.body.data.exercises[0].exercise.instructions).toContain(
      'Setup:',
    );
    expect(response.body.data.rationale).toContain('Chest');
    expect(response.body.data.rationale).toContain('bodyweight');
    expect(response.body.data.rationale).toContain('general training rules');
    expect(JSON.stringify(response.body)).not.toContain('Chest press');
  });

  it('keeps the goal rest and one round for a standard session', async () => {
    const response = await api.get(
      '/api/v1/workouts/recommendations?muscle=chest&goal=general_fitness&experience=beginner&equipment=bodyweight&length=standard',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.rounds).toBe(1);
    expect(response.body.data.exercises[0]).toMatchObject({
      sets: 3,
      reps: '10',
      restSeconds: 60,
    });
    expect(response.body.data.estimatedMinutes).toBeLessThan(90);
  });

  it('includes the last load on a recommendation before the workout is saved', async () => {
    findManyWorkouts.mockResolvedValue([
      {
        rounds: 1,
        exercises: [
          {
            exerciseId: pushUp.id,
            sets: 3,
            setLogs: [
              { repsCompleted: 10, weightKg: 10 },
              { repsCompleted: 10, weightKg: 10 },
              { repsCompleted: 10, weightKg: 10 },
            ],
          },
        ],
      },
    ]);

    const response = await api.get(
      '/api/v1/workouts/recommendations?muscle=chest&goal=general_fitness&experience=beginner&equipment=bodyweight&length=standard',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.exercises[0].progression).toMatchObject({
      suggestedWeightKg: 11,
      earned: true,
    });
  });

  it('saves a draft workout and reads it back', async () => {
    const created = await api
      .post('/api/v1/workouts')
      .send({
        muscle: 'chest',
        goal: 'strength',
        experience: 'beginner',
        equipmentCategories: ['bodyweight'],
        exercises: [
          { exerciseId: 'ex-push', sets: 4, reps: '5', restSeconds: 150 },
        ],
      });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      id: 'workout-1',
      status: 'draft',
      startedAt: null,
    });
    expect(created.body.data.exercises[0].reason).toContain('Push-up');
    expect(created.body.data.exercises[0].exercise.instructions).toContain(
      'Setup:',
    );

    const fetched = await api.get('/api/v1/workouts/workout-1');
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.exercises[0].exercise.slug).toBe('push-up');
    expect(fetched.body.data.exercises[0].exercise.animations).toEqual([]);
  });

  it('returns only an approved video on a saved exercise', async () => {
    await api.post('/api/v1/workouts').send({
      muscle: 'chest',
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      exercises: [{ exerciseId: 'ex-push', sets: 4, reps: '5', restSeconds: 150 }],
    });
    current!.exercises[0].exercise = {
      ...pushUp,
      animations: [
        { id: 'draft-1', format: 'video', assetUrl: '/draft.mp4', reviewStatus: 'draft' },
        { id: 'clip-1', format: 'video', assetUrl: '/push-up.mp4', reviewStatus: 'approved' },
      ],
    };

    const fetched = await api.get('/api/v1/workouts/workout-1');

    expect(fetched.status).toBe(200);
    expect(fetched.body.data.exercises[0].exercise.animations).toEqual([
      { id: 'clip-1', format: 'video', assetUrl: '/push-up.mp4' },
    ]);
  });

  it('saves a standard session as one round', async () => {
    const created = await api.post('/api/v1/workouts').send({
      muscle: 'chest',
      goal: 'general_fitness',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      length: 'standard',
      exercises: [{ exerciseId: 'ex-push', sets: 3, reps: '10', restSeconds: 60 }],
    });

    expect(created.status).toBe(201);
    expect(created.body.data.rounds).toBe(1);
  });

  it("keeps a workout private to the person who saved it", async () => {
    const created = await api.post('/api/v1/workouts').send({
      muscle: 'chest',
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      exercises: [{ exerciseId: 'ex-push', sets: 4, reps: '5', restSeconds: 150 }],
    });
    expect(created.status).toBe(201);
    expect(createWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: testMember.id }) }),
    );

    findUniqueSession.mockResolvedValue(
      sessionFor({ id: 'user-other', email: 'other@example.com', name: 'Other', role: 'admin' }),
    );
    expect((await api.get('/api/v1/workouts/workout-1')).status).toBe(404);
    expect((await api.post('/api/v1/workouts/workout-1/start')).status).toBe(404);
    expect(current!.status).toBe('draft');
  });

  it('bases load suggestions only on your own past sessions', async () => {
    await api.get(
      '/api/v1/workouts/recommendations?muscle=chest&goal=general_fitness&experience=beginner&equipment=bodyweight',
    );
    expect(findManyWorkouts).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: testMember.id }) }),
    );
  });

  it('returns 404 for a missing workout', async () => {
    const response = await api.get('/api/v1/workouts/missing');
    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Workout not found.',
    });
  });

  it('rejects a swap onto equipment the plan does not allow', async () => {
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      rationale: 'A bodyweight chest workout.',
      estimatedMinutes: 51,
      rounds: 3,
      status: 'draft',
      startedAt: null,
      muscle: chest,
      warmups: [],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 4,
          reps: '5',
          restSeconds: 150,
          reason: 'Push-up matches bodyweight.',
          exerciseId: pushUp.id,
          exercise: pushUp,
        },
      ],
    };

    const response = await api
      .patch('/api/v1/workouts/workout-1')
      .send({
        exercises: [
          { exerciseId: machinePress.id, sets: 4, reps: '5', restSeconds: 150 },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain(
      'do not match this muscle and equipment',
    );
    expect(deleteWorkoutExercises).not.toHaveBeenCalled();
  });

  it('replaces an exercise and starts the workout', async () => {
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'general_fitness',
      experience: 'intermediate',
      equipmentCategories: ['free_weight', 'bodyweight'],
      rationale: 'A chest workout.',
      estimatedMinutes: 40,
      rounds: 3,
      status: 'draft',
      startedAt: null,
      muscle: chest,
      warmups: [],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 3,
          reps: '10',
          restSeconds: 60,
          reason: 'Push-up matches bodyweight.',
          exerciseId: pushUp.id,
          exercise: pushUp,
        },
      ],
    };

    const patched = await api
      .patch('/api/v1/workouts/workout-1')
      .send({
        exercises: [
          {
            exerciseId: dumbbellPress.id,
            sets: 3,
            reps: '8-12',
            restSeconds: 90,
          },
        ],
      });

    expect(patched.status).toBe(200);
    expect(patched.body.data.exercises[0].exercise.slug).toBe(
      'dumbbell-bench-press',
    );
    expect(patched.body.data.exercises[0].reps).toBe('8-12');
    expect(deleteWorkoutExercises).toHaveBeenCalled();

    const started = await api.post('/api/v1/workouts/workout-1/start');
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe('started');
    expect(started.body.data.startedAt).toEqual(expect.any(String));
    expect(started.body.data.exercises[0].exercise.instructions).toContain(
      'Setup:',
    );
  });

  it('logs the last set and marks the workout complete', async () => {
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      rationale: 'A bodyweight chest workout.',
      estimatedMinutes: 40,
      rounds: 1,
      status: 'started',
      startedAt: new Date(),
      muscle: chest,
      warmups: [],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 1,
          reps: '5',
          restSeconds: 60,
          reason: 'Push-up matches bodyweight.',
          exerciseId: pushUp.id,
          exercise: pushUp,
          setLogs: [],
        },
      ],
    };
    upsertSetLog.mockImplementation(async () => {
      const log = {
        id: 'log-1',
        round: 1,
        setNumber: 1,
        repsCompleted: 5,
        weightKg: null,
      };
      current = {
        ...current!,
        exercises: [
          {
            ...current!.exercises[0]!,
            setLogs: [log],
          },
        ],
      };
      return log;
    });

    const response = await api.post('/api/v1/workouts/workout-1/sets').send({
      workoutExerciseId: 'line-0',
      round: 1,
      setNumber: 1,
      repsCompleted: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('completed');
    expect(response.body.data.exercises[0].setLogs).toEqual([
      {
        id: 'log-1',
        round: 1,
        setNumber: 1,
        repsCompleted: 5,
        weightKg: null,
      },
    ]);
    expect(response.body.data.exercises[0].progression.outcome).toBe(
      'Next time use a harder version of this exercise.',
    );
  });

  it('suggests a heavier load after every set of the previous session was clean', async () => {
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'general_fitness',
      experience: 'intermediate',
      equipmentCategories: ['free_weight'],
      rationale: 'A chest workout.',
      estimatedMinutes: 40,
      rounds: 1,
      status: 'started',
      startedAt: new Date(),
      muscle: chest,
      warmups: [],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 1,
          reps: '10',
          restSeconds: 60,
          reason: 'Dumbbell bench press matches free weights.',
          exerciseId: dumbbellPress.id,
          exercise: dumbbellPress,
          setLogs: [],
        },
      ],
    };
    findManyWorkouts.mockResolvedValue([
      {
        rounds: 1,
        exercises: [
          {
            exerciseId: dumbbellPress.id,
            sets: 1,
            setLogs: [{ round: 1, setNumber: 1, repsCompleted: 10, weightKg: 10 }],
          },
        ],
      },
    ]);

    const response = await api.get('/api/v1/workouts/workout-1');

    expect(response.status).toBe(200);
    expect(response.body.data.exercises[0].progression).toMatchObject({
      cleanReps: 10,
      jumpKg: 2.5,
      suggestedWeightKg: 12.5,
      earned: true,
      outcome: null,
    });
  });

  it('keeps the same load when the previous exercise was left unfinished', async () => {
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'general_fitness',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      rationale: 'A chest workout.',
      estimatedMinutes: 90,
      rounds: 3,
      status: 'started',
      startedAt: new Date(),
      muscle: chest,
      warmups: [],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 3,
          reps: '10',
          restSeconds: 90,
          reason: 'Supported incline push-up matches bodyweight.',
          exerciseId: pushUp.id,
          exercise: pushUp,
          setLogs: [],
        },
      ],
    };
    findManyWorkouts.mockResolvedValue([
      {
        rounds: 3,
        exercises: [
          {
            exerciseId: pushUp.id,
            sets: 3,
            setLogs: [{ round: 1, setNumber: 1, repsCompleted: 10, weightKg: 5 }],
          },
        ],
      },
    ]);

    const response = await api.get('/api/v1/workouts/workout-1');

    expect(response.status).toBe(200);
    expect(response.body.data.exercises[0].progression).toMatchObject({
      suggestedWeightKg: 5,
      earned: false,
    });
  });

  it('rejects a reversed rep range', async () => {
    const response = await api
      .post('/api/v1/workouts')
      .send({
        muscle: 'chest',
        goal: 'strength',
        experience: 'beginner',
        equipmentCategories: ['bodyweight'],
        exercises: [
          { exerciseId: 'ex-push', sets: 4, reps: '12-8', restSeconds: 150 },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(createWorkout).not.toHaveBeenCalled();
  });

  it('creates one gentle cooldown stretch per trained muscle without duplicates', async () => {
    const press = {
      ...pushUp,
      muscles: [
        { role: 'primary', muscle: { slug: 'chest', name: 'Chest', sortOrder: 1 } },
        { role: 'secondary', muscle: { slug: 'chest', name: 'Chest', sortOrder: 1 } },
        { role: 'secondary', muscle: { slug: 'shoulders', name: 'Shoulders', sortOrder: 3 } },
        { role: 'secondary', muscle: { slug: 'triceps', name: 'Triceps', sortOrder: 5 } },
      ],
    };
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      rationale: 'A bodyweight chest workout.',
      estimatedMinutes: 20,
      rounds: 1,
      status: 'started',
      startedAt: new Date(),
      muscle: chest,
      warmups: [],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 1,
          reps: '5',
          restSeconds: 60,
          reason: 'Push-up matches bodyweight.',
          exerciseId: press.id,
          exercise: press,
          setLogs: [],
        },
      ],
    };
    findManyStretches.mockResolvedValue([
      {
        id: 's-triceps',
        slug: 'cooldown-triceps-gentle',
        durationSeconds: 30,
        muscles: [{ muscleId: 'm-triceps' }],
      },
      {
        id: 's-chest',
        slug: 'cooldown-chest-gentle',
        durationSeconds: 30,
        muscles: [{ muscleId: 'm-chest' }],
      },
      {
        id: 's-shoulders',
        slug: 'cooldown-shoulders-gentle',
        durationSeconds: 30,
        muscles: [{ muscleId: 'm-shoulders' }],
      },
    ]);
    createCooldown.mockImplementation(async ({ data }: { data: Array<Record<string, unknown>> }) => {
      current = {
        ...current!,
        cooldowns: data.map((row, index) => ({
          id: `cool-${index}`,
          order: Number(row.order),
          durationSeconds: Number(row.durationSeconds),
          status: String(row.status),
          muscleId: String(row.muscleId),
          stretchId: String(row.stretchId),
          muscle: { id: String(row.muscleId), slug: String(row.muscleId), name: String(row.muscleId) },
          stretch: {
            id: String(row.stretchId),
            slug: String(row.stretchId),
            name: String(row.stretchId),
            instructions: 'Setup: Hold.\n1. Relax.\nBreathing: Easy.\nCommon mistakes: Do not bounce.',
            durationSeconds: Number(row.durationSeconds),
            animations: [],
          },
        })),
      };
      return { count: data.length };
    });
    upsertSetLog.mockImplementation(async () => {
      const log = { id: 'log-1', round: 1, setNumber: 1, repsCompleted: 5, weightKg: null };
      current = {
        ...current!,
        exercises: [{ ...current!.exercises[0]!, setLogs: [log] }],
      };
      return log;
    });

    const response = await api.post('/api/v1/workouts/workout-1/sets').send({
      workoutExerciseId: 'line-0',
      round: 1,
      setNumber: 1,
      repsCompleted: 5,
    });

    expect(response.status).toBe(200);
    expect(createCooldown).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          muscleId: 'm-chest',
          stretchId: 's-chest',
          order: 0,
          durationSeconds: 30,
          status: 'pending',
        }),
        expect.objectContaining({ muscleId: 'm-shoulders', stretchId: 's-shoulders', order: 1 }),
        expect.objectContaining({ muscleId: 'm-triceps', stretchId: 's-triceps', order: 2 }),
      ],
    });
    expect(response.body.data.cooldowns).toHaveLength(3);
  });

  it('replaces, skips, and limits a cooldown hold', async () => {
    const gentle = {
      id: 'cool-1',
      order: 0,
      durationSeconds: 30,
      status: 'pending',
      muscleId: 'm-chest',
      stretchId: 's-gentle',
      muscle: { id: 'm-chest', slug: 'chest', name: 'Chest' },
      stretch: {
        id: 's-gentle',
        slug: 'cooldown-chest-gentle',
        name: 'Doorway chest stretch',
        instructions: 'Setup: Hold.\n1. Relax.\nBreathing: Easy.\nCommon mistakes: Do not bounce.',
        durationSeconds: 30,
        animations: [],
      },
    };
    current = {
      id: 'workout-1',
      muscleId: chest.id,
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      rationale: 'A bodyweight chest workout.',
      estimatedMinutes: 20,
      rounds: 1,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      muscle: chest,
      warmups: [],
      cooldowns: [gentle],
      exercises: [
        {
          id: 'line-0',
          order: 0,
          sets: 1,
          reps: '5',
          restSeconds: 60,
          reason: 'Push-up matches bodyweight.',
          exerciseId: pushUp.id,
          exercise: pushUp,
          setLogs: [],
        },
      ],
    };
    updateCooldown.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { stretchId?: string; durationSeconds?: number; status?: string };
      }) => {
        current = {
          ...current!,
          cooldowns: (current!.cooldowns ?? []).map((item) => {
            if (item.id !== where.id) {
              return item;
            }
            const next = { ...item, ...data };
            if (data.stretchId === 's-easier') {
              next.stretch = {
                ...item.stretch,
                id: 's-easier',
                slug: 'cooldown-chest-easier',
                name: 'Seated chest opener',
              };
              next.stretchId = 's-easier';
            }
            return next;
          }),
        };
        return {};
      },
    );
    findFirstStretch.mockResolvedValue({
      id: 's-easier',
      slug: 'cooldown-chest-easier',
      name: 'Seated chest opener',
    });

    const tooShort = await api
      .patch('/api/v1/workouts/workout-1/cooldowns/cool-1')
      .send({ durationSeconds: 19 });
    expect(tooShort.status).toBe(400);
    const tooLong = await api
      .patch('/api/v1/workouts/workout-1/cooldowns/cool-1')
      .send({ durationSeconds: 91 });
    expect(tooLong.status).toBe(400);
    expect(updateCooldown).not.toHaveBeenCalled();

    const longer = await api
      .patch('/api/v1/workouts/workout-1/cooldowns/cool-1')
      .send({ durationSeconds: 40 });
    expect(longer.status).toBe(200);
    expect(longer.body.data.cooldowns[0].durationSeconds).toBe(40);

    const replaced = await api
      .patch('/api/v1/workouts/workout-1/cooldowns/cool-1')
      .send({ replace: true });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.cooldowns[0].stretch.slug).toBe('cooldown-chest-easier');

    const skipped = await api
      .patch('/api/v1/workouts/workout-1/cooldowns/cool-1')
      .send({ status: 'skipped' });
    expect(skipped.status).toBe(200);
    expect(skipped.body.data.cooldowns[0].status).toBe('skipped');

    const again = await api
      .patch('/api/v1/workouts/workout-1/cooldowns/cool-1')
      .send({ status: 'completed' });
    expect(again.status).toBe(400);
  });
});

describe('workout history API', () => {
  const firstId = 'cmhist000000000000000001';
  const secondId = 'cmhist000000000000000002';

  function historyPlan(id: string, completedAt: string, weights: number[]) {
    return {
      id,
      status: 'completed',
      goal: 'strength',
      experience: 'beginner',
      estimatedMinutes: 30,
      rounds: 1,
      createdAt: new Date(completedAt),
      startedAt: new Date(completedAt),
      completedAt: new Date(completedAt),
      muscle: chest,
      exercises: [
        {
          sets: 2,
          exercise: dumbbellPress,
          setLogs: weights.map((weightKg) => ({ repsCompleted: 5, weightKg })),
        },
      ],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only the signed-in user's newest workouts with a progress summary", async () => {
    findManyWorkouts.mockResolvedValue([
      historyPlan(secondId, '2026-10-20T07:00:00Z', [22.5, 25]),
      historyPlan(firstId, '2026-10-13T07:00:00Z', [20]),
    ]);

    const response = await api.get('/api/v1/workouts');

    expect(response.status).toBe(200);
    expect(findManyWorkouts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: testMember.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
    expect(response.body.data[0]).toMatchObject({
      id: secondId,
      status: 'completed',
      muscle: { slug: 'chest', name: 'Chest' },
      setsLogged: 2,
      setsPlanned: 2,
      exercises: [{ slug: 'dumbbell-bench-press', bestWeightKg: 25, totalReps: 10 }],
    });
    expect(response.body.meta.progress.trends).toEqual([
      expect.objectContaining({
        slug: 'dumbbell-bench-press',
        unit: 'kg',
        improved: true,
        points: [
          expect.objectContaining({ workoutId: firstId, value: 20 }),
          expect.objectContaining({ workoutId: secondId, value: 25 }),
        ],
      }),
    ]);
  });

  it('filters by status and rejects an unknown status', async () => {
    findManyWorkouts.mockResolvedValue([]);

    expect((await api.get('/api/v1/workouts?status=started')).status).toBe(200);
    expect(findManyWorkouts).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: testMember.id, status: 'started' } }),
    );

    const response = await api.get('/api/v1/workouts?status=lost');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses the list without a session', async () => {
    const response = await request(app).get('/api/v1/workouts');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
    expect(findManyWorkouts).not.toHaveBeenCalled();
  });
});
