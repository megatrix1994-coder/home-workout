import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findManyMuscles,
  findManyExercises,
  countExercises,
  findFirstExercise,
} = vi.hoisted(() => ({
  findManyMuscles: vi.fn(),
  findManyExercises: vi.fn(),
  countExercises: vi.fn(),
  findFirstExercise: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    muscleGroup: { findMany: findManyMuscles },
    exercise: {
      findMany: findManyExercises,
      count: countExercises,
      findFirst: findFirstExercise,
    },
  },
}));

import { createApp } from './app.js';

const app = createApp();

const chestPress = {
  id: 'ex-1',
  slug: 'machine-chest-press',
  name: 'Chest press',
  description: 'A machine press.',
  instructions:
    'Setup: Sit tall.\n1. Press.\nBreathing: Exhale.\nCommon mistakes: Shrugging.',
  difficulty: 'beginner',
  movementType: 'compound',
  region: 'mid',
  goals: ['strength'],
  muscles: [
    {
      role: 'secondary',
      muscle: { slug: 'triceps', name: 'Triceps' },
    },
    {
      role: 'primary',
      muscle: { slug: 'chest', name: 'Chest' },
    },
  ],
  equipment: [
    {
      equipment: {
        slug: 'chest-press-machine',
        name: 'Chest press machine',
        category: 'machine',
      },
    },
  ],
};

describe('catalogue API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists muscle groups with exercise counts', async () => {
    findManyMuscles.mockResolvedValue([
      {
        id: 'm-1',
        slug: 'chest',
        name: 'Chest',
        anatomicalRegion: 'Upper body',
        _count: { exercises: 4 },
      },
    ]);

    const response = await request(app).get('/api/v1/muscles');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: 'm-1',
          slug: 'chest',
          name: 'Chest',
          anatomicalRegion: 'Upper body',
          exerciseCount: 4,
        },
      ],
    });
  });

  it('filters exercises and returns equipment plus target muscles', async () => {
    findManyExercises.mockResolvedValue([chestPress]);
    countExercises.mockResolvedValue(1);

    const response = await request(app).get(
      '/api/v1/exercises?search=press&muscle=chest&equipmentCategory=machine',
    );

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      name: 'Chest press',
      goals: ['strength'],
      muscles: [
        { slug: 'chest', name: 'Chest', role: 'primary' },
        { slug: 'triceps', name: 'Triceps', role: 'secondary' },
      ],
      equipment: [
        {
          slug: 'chest-press-machine',
          name: 'Chest press machine',
          category: 'machine',
        },
      ],
    });
    expect(response.body.data[0].instructions).toBeUndefined();
    expect(findManyExercises).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: { contains: 'press', mode: 'insensitive' },
          muscles: { some: { muscle: { slug: 'chest' } } },
          equipment: { some: { equipment: { category: 'machine' } } },
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 100,
      }),
    );
  });

  it('rejects an invalid equipment category', async () => {
    const response = await request(app).get(
      '/api/v1/exercises?equipmentCategory=kettlebell',
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findManyExercises).not.toHaveBeenCalled();
  });

  it('returns an exercise detail by slug', async () => {
    findFirstExercise.mockResolvedValue(chestPress);

    const response = await request(app).get(
      '/api/v1/exercises/machine-chest-press',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.instructions).toContain('Setup:');
    expect(response.body.data.equipment[0].name).toBe('Chest press machine');
    expect(response.body.data.progression).toEqual([
      expect.objectContaining({
        experience: 'beginner',
        cleanReps: 5,
        jumpKg: 1,
        summary: 'When every set reaches 5 clean reps, add 1 kg next time.',
      }),
      expect.objectContaining({ experience: 'intermediate', cleanReps: 5, jumpKg: 2.5 }),
      expect.objectContaining({ experience: 'advanced', cleanReps: 5, jumpKg: 5 }),
    ]);
    expect(findFirstExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ id: 'machine-chest-press' }, { slug: 'machine-chest-press' }],
        },
      }),
    );
  });

  it('returns 404 when an exercise is missing', async () => {
    findFirstExercise.mockResolvedValue(null);
    const response = await request(app).get('/api/v1/exercises/missing');
    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Exercise not found.',
    });
  });

  it('returns 500 when the catalogue query fails', async () => {
    findManyMuscles.mockRejectedValue(new Error('database down'));
    const response = await request(app).get('/api/v1/muscles');
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 503 when the database cannot be reached', async () => {
    const error = new Error("Can't reach database server at `localhost:51214`");
    error.name = 'PrismaClientInitializationError';
    findManyMuscles.mockRejectedValue(error);

    const response = await request(app).get('/api/v1/muscles');

    expect(response.status).toBe(503);
    expect(response.body.error).toEqual({
      code: 'DATABASE_UNAVAILABLE',
      message: 'The database is unavailable. Start it, then try again.',
    });
  });
});
