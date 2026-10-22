import { describe, expect, it } from 'vitest';
import { buildExerciseWhere, exerciseListQuerySchema } from './exercise-query.js';

describe('exercise list query', () => {
  it('applies defaults and ignores blank filters', () => {
    const query = exerciseListQuerySchema.parse({
      search: '  ',
      muscle: '',
      equipmentCategory: '',
      limit: '',
      offset: '',
    });

    expect(query).toEqual({
      search: undefined,
      muscle: undefined,
      equipmentCategory: undefined,
      limit: 100,
      offset: 0,
    });
    expect(buildExerciseWhere(query)).toEqual({});
  });

  it('builds a case-insensitive name search and muscle filter', () => {
    const query = exerciseListQuerySchema.parse({
      search: ' row ',
      muscle: 'back',
      limit: '10',
      offset: '20',
    });

    expect(buildExerciseWhere(query)).toEqual({
      name: { contains: 'row', mode: 'insensitive' },
      muscles: { some: { muscle: { slug: 'back' } } },
    });
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(20);
  });

  it('filters by equipment category', () => {
    const query = exerciseListQuerySchema.parse({ equipmentCategory: 'machine' });
    expect(buildExerciseWhere(query)).toEqual({
      equipment: { some: { equipment: { category: 'machine' } } },
    });
  });

  it('filters by difficulty and goal', () => {
    const query = exerciseListQuerySchema.parse({
      difficulty: 'beginner',
      goal: 'strength',
    });
    expect(buildExerciseWhere(query)).toEqual({
      difficulty: 'beginner',
      goals: { has: 'strength' },
    });
  });

  it('rejects an unknown equipment category', () => {
    expect(() =>
      exerciseListQuerySchema.parse({ equipmentCategory: 'kettlebell' }),
    ).toThrow();
  });

  it('rejects a limit outside 1 to 100', () => {
    expect(() => exerciseListQuerySchema.parse({ limit: '0' })).toThrow();
    expect(() => exerciseListQuerySchema.parse({ limit: '101' })).toThrow();
  });
});
