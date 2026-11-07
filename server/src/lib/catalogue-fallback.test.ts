import { describe, expect, it } from 'vitest';
import { catalogueExerciseDetail, catalogueExercisePage, catalogueMuscles } from './catalogue-fallback.js';

describe('catalogue fallback', () => {
  it('lists every muscle group with at least one exercise', () => {
    const muscles = catalogueMuscles();
    expect(muscles.map((muscle) => muscle.slug)).toEqual([
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'quadriceps',
      'hamstrings',
      'glutes',
      'calves',
      'abdominals',
    ]);
    expect(muscles.every((muscle) => muscle.exerciseCount > 0)).toBe(true);
  });

  it('filters the built-in exercises by muscle', () => {
    const page = catalogueExercisePage({
      muscle: 'chest',
      limit: 5,
      offset: 0,
    });
    expect(page.meta.total).toBeGreaterThan(5);
    expect(page.data).toHaveLength(5);
    expect(page.data.every((exercise) => exercise.muscles.some((muscle) => muscle.slug === 'chest'))).toBe(
      true,
    );
  });

  it('returns a built-in exercise by slug', () => {
    const detail = catalogueExerciseDetail('dumbbell-bench-press');
    expect(detail?.name).toBe('Dumbbell bench press');
    expect(detail?.instructions).toContain('Setup:');
    expect(detail?.muscles[0]?.slug).toBe('chest');
    expect(catalogueExerciseDetail('missing')).toBeNull();
  });
});
