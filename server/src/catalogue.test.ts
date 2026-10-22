import { describe, expect, it } from 'vitest';
import { equipment, exercises, muscleGroups } from './catalogue.js';

describe('catalogue seed data', () => {
  it('lists the initial muscle groups in product order', () => {
    expect(muscleGroups.map((muscle) => muscle.name)).toEqual([
      'Chest',
      'Back',
      'Shoulders',
      'Biceps',
      'Triceps',
      'Forearms',
      'Quadriceps',
      'Hamstrings',
      'Glutes',
      'Calves',
      'Abdominals and obliques',
    ]);
  });

  it('uses unique slugs for muscles, equipment, and exercises', () => {
    expect(new Set(muscleGroups.map((muscle) => muscle.slug)).size).toBe(muscleGroups.length);
    expect(new Set(equipment.map((item) => item.slug)).size).toBe(equipment.length);
    expect(new Set(exercises.map((exercise) => exercise.slug)).size).toBe(exercises.length);
  });

  it('represents free-weight, machine, and bodyweight options', () => {
    const categories = new Set(
      exercises.flatMap((exercise) =>
        exercise.equipment.map(
          (slug) => equipment.find((item) => item.slug === slug)?.category,
        ),
      ),
    );

    expect(categories.has('free_weight')).toBe(true);
    expect(categories.has('machine')).toBe(true);
    expect(categories.has('bodyweight')).toBe(true);
  });

  it('gives every exercise a primary muscle, equipment, and text instructions', () => {
    const muscleSlugs = new Set(muscleGroups.map((muscle) => muscle.slug));
    const equipmentSlugs = new Set(equipment.map((item) => item.slug));

    for (const exercise of exercises) {
      expect(exercise.muscles.some((muscle) => muscle.role === 'primary')).toBe(true);
      expect(new Set(exercise.muscles.map((muscle) => muscle.slug)).size).toBe(
        exercise.muscles.length,
      );
      expect(exercise.equipment.length).toBeGreaterThan(0);
      expect(exercise.instructions).toContain('Setup:');
      expect(exercise.instructions).toContain('Breathing:');
      expect(exercise.instructions).toContain('Common mistakes:');

      for (const muscle of exercise.muscles) {
        expect(muscleSlugs.has(muscle.slug)).toBe(true);
      }
      for (const slug of exercise.equipment) {
        expect(equipmentSlugs.has(slug)).toBe(true);
      }
    }
  });

  it('covers every muscle group', () => {
    const trained = new Set(exercises.flatMap((exercise) => exercise.muscles.map((muscle) => muscle.slug)));
    for (const muscle of muscleGroups) {
      expect(trained.has(muscle.slug)).toBe(true);
    }
  });
});
