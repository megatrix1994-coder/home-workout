import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findManyMuscles,
  findManyExercises,
  countExercises,
  groupExercises,
  findFirstExercise,
  findUniqueSession,
  queryRaw,
} = vi.hoisted(() => ({
  findUniqueSession: vi.fn(),
  findManyMuscles: vi.fn(),
  findManyExercises: vi.fn(),
  countExercises: vi.fn(),
  groupExercises: vi.fn(),
  findFirstExercise: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('./db', () => ({
  prisma: {
    $queryRaw: queryRaw,
    session: { findUnique: findUniqueSession, update: vi.fn(), deleteMany: vi.fn() },
    muscleGroup: { findMany: findManyMuscles },
    exercise: {
      findMany: findManyExercises,
      count: countExercises,
      groupBy: groupExercises,
      findFirst: findFirstExercise,
    },
  },
}));

import { createApp } from './app.js';
import { sessionFor, TEST_COOKIE } from './test/session.js';

const app = createApp();
const api = request.agent(app).set('Cookie', TEST_COOKIE).set('Sec-Fetch-Site', 'same-origin');

beforeEach(() => {
  findUniqueSession.mockResolvedValue(sessionFor());
  queryRaw.mockResolvedValue([{ '?column?': 1 }]);
});

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

    const response = await api.get('/api/v1/muscles');

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
    groupExercises.mockResolvedValue([{ region: 'mid' }]);

    const response = await api.get(
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
    expect(response.body.meta.regions).toEqual(['mid']);
    expect(groupExercises).toHaveBeenCalledWith({
      by: ['region'],
      where: {
        name: { contains: 'press', mode: 'insensitive' },
        muscles: { some: { muscle: { slug: 'chest' } } },
        equipment: { some: { equipment: { category: 'machine' } } },
      },
    });
    expect(response.body.data[0].instructions).toBeUndefined();
    expect(response.body.data[0].animations).toBeUndefined();
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
    const response = await api.get(
      '/api/v1/exercises?equipmentCategory=kettlebell',
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findManyExercises).not.toHaveBeenCalled();
  });

  it('returns an exercise detail by slug', async () => {
    findFirstExercise.mockResolvedValue(chestPress);

    const response = await api.get(
      '/api/v1/exercises/machine-chest-press',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.instructions).toContain('Setup:');
    expect(response.body.data.animations).toEqual([]);
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

  it('returns only approved animations on an exercise', async () => {
    findFirstExercise.mockResolvedValue({
      ...chestPress,
      animations: [
        { id: 'draft-1', format: 'video', assetUrl: '/draft.mp4', reviewStatus: 'draft' },
        { id: 'clip-1', format: 'video', assetUrl: '/press.mp4', reviewStatus: 'approved' },
        { id: 'motion-1', format: 'lottie', assetUrl: '/press.json', reviewStatus: 'approved' },
      ],
    });

    const response = await api.get('/api/v1/exercises/machine-chest-press');

    expect(response.status).toBe(200);
    expect(response.body.data.animations).toEqual([
      { id: 'clip-1', format: 'video', assetUrl: '/press.mp4' },
      { id: 'motion-1', format: 'lottie', assetUrl: '/press.json' },
    ]);
  });

  it('returns 404 when an exercise is missing', async () => {
    findFirstExercise.mockResolvedValue(null);
    const response = await api.get('/api/v1/exercises/missing');
    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Exercise not found.',
    });
  });

  it('returns 500 when the catalogue query fails', async () => {
    findManyMuscles.mockRejectedValue(new Error('database down'));
    const response = await api.get('/api/v1/muscles');
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 503 when the database cannot be reached', async () => {
    const error = new Error("Can't reach database server at `localhost:51214`");
    error.name = 'PrismaClientInitializationError';
    findManyMuscles.mockRejectedValue(error);

    const response = await api.get('/api/v1/muscles');

    expect(response.status).toBe(503);
    expect(response.body.error).toEqual({
      code: 'DATABASE_UNAVAILABLE',
      message: 'The database is unavailable. Start it, then try again.',
    });
  });
});

describe('security and production serving', () => {
  it('sets security headers and hides the framework', async () => {
    const response = await request(createApp()).get('/api/v1/unknown');
    expect(response.status).toBe(404);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).toContain("media-src 'self'");
    expect(response.headers['strict-transport-security']).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('reports health without a session and is never cached', async () => {
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(queryRaw).toHaveBeenCalled();
  });

  it('returns 503 when the health query cannot reach the database', async () => {
    queryRaw.mockRejectedValue(new Error("Can't reach database server"));
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
  });

  it('sends HSTS only when the request arrived over HTTPS', async () => {
    const previous = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = '1';
    try {
      const response = await request(createApp())
        .get('/api/health')
        .set('X-Forwarded-Proto', 'https');
      expect(response.status).toBe(200);
      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains',
      );
    } finally {
      if (previous === undefined) {
        delete process.env.TRUST_PROXY;
      } else {
        process.env.TRUST_PROXY = previous;
      }
    }
  });

  it('rejects a body over 100 kB and malformed JSON', async () => {
    const app = createApp();
    const large = await request(app)
      .post('/api/v1/workouts')
      .set('Sec-Fetch-Site', 'same-origin')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(110 * 1024) }));
    expect(large.status).toBe(413);
    expect(large.body.error.code).toBe('PAYLOAD_TOO_LARGE');

    const malformed = await request(app)
      .post('/api/v1/workouts')
      .set('Sec-Fetch-Site', 'same-origin')
      .set('Content-Type', 'application/json')
      .send('{"muscle":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('serves the built client with an index fallback that leaves the API alone', async () => {
    const clientDir = mkdtempSync(path.join(tmpdir(), 'client-dist-'));
    writeFileSync(path.join(clientDir, 'index.html'), '<!doctype html><title>Home Workout</title>');
    writeFileSync(path.join(clientDir, 'app.js'), 'console.log(1);');
    const app = createApp({ clientDir });

    const page = await request(app).get('/workouts/abc');
    expect(page.status).toBe(200);
    expect(page.text).toContain('<title>Home Workout</title>');
    expect(page.headers['x-frame-options']).toBe('DENY');

    const asset = await request(app).get('/app.js');
    expect(asset.status).toBe(200);
    expect(asset.headers['content-type']).toMatch(/javascript/);

    const missingAsset = await request(app).get('/demonstrations/missing.mp4');
    expect(missingAsset.status).toBe(404);

    const api = await request(app).get('/api/v1/unknown');
    expect(api.status).toBe(404);
    expect(api.body.error.code).toBe('NOT_FOUND');
    rmSync(clientDir, { recursive: true, force: true });
  });
});
