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
      expect(exercise.region.trim().length).toBeGreaterThan(0);

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

  it('gives each muscle the regions that cover it all around', () => {
    const expected: Record<string, string[]> = {
      chest: ['mid', 'upper', 'lower', 'pecs'],
      back: ['lats', 'mid-back', 'upper-back', 'lower-back'],
      biceps: ['overall', 'short-head', 'long-head', 'brachialis'],
      triceps: ['long-head', 'lateral-head', 'medial-head'],
      forearms: ['flexors', 'extensors'],
      quadriceps: ['squat', 'single-leg', 'knee-extension'],
      hamstrings: ['hip-hinge', 'knee-flexion'],
      glutes: ['thrust', 'kickback'],
      calves: ['standing', 'seated'],
      shoulders: ['front-delt', 'side-delt', 'rear-delt'],
      abdominals: ['abdominals', 'obliques', 'brace'],
    };

    for (const [muscle, regions] of Object.entries(expected)) {
      const present = new Set(
        exercises
          .filter((exercise) =>
            exercise.muscles.some(
              (link) => link.slug === muscle && link.role === 'primary',
            ),
          )
          .map((exercise) => exercise.region),
      );
      expect([...present].sort()).toEqual([...regions].sort());
    }
  });

  it('gives every region a free-weight, machine, and bodyweight exercise', () => {
    const categories = ['free_weight', 'machine', 'bodyweight'] as const;
    const byRegion = new Map<string, Set<string>>();

    for (const exercise of exercises) {
      const primary = exercise.muscles.find((muscle) => muscle.role === 'primary');
      if (!primary) continue;
      const key = `${primary.slug}:${exercise.region}`;
      const present = byRegion.get(key) ?? new Set<string>();
      for (const slug of exercise.equipment) {
        const category = equipment.find((item) => item.slug === slug)?.category;
        if (category) present.add(category);
      }
      byRegion.set(key, present);
    }

    for (const [key, present] of byRegion) {
      for (const category of categories) {
        expect(present.has(category), `${key} ${category}`).toBe(true);
      }
    }
  });

  it('adds barbell chest presses and bench-supported free-weight options', () => {
    const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

    expect(bySlug.get('barbell-bench-press')).toMatchObject({
      region: 'mid',
      difficulty: 'intermediate',
      equipment: ['barbell'],
    });
    expect(bySlug.get('incline-barbell-press')).toMatchObject({
      region: 'upper',
      difficulty: 'intermediate',
      equipment: ['barbell'],
    });
    expect(bySlug.get('incline-barbell-press')?.muscles).toEqual(
      expect.arrayContaining([
        { slug: 'chest', role: 'primary' },
        { slug: 'shoulders', role: 'secondary' },
        { slug: 'triceps', role: 'secondary' },
      ]),
    );
    expect(bySlug.get('decline-barbell-press')).toMatchObject({
      region: 'lower',
      difficulty: 'intermediate',
      equipment: ['barbell'],
    });
    expect(bySlug.get('bench-dumbbell-press')).toMatchObject({
      region: 'mid',
      difficulty: 'beginner',
      equipment: ['dumbbell'],
    });

    for (const slug of [
      'bench-hex-press',
      'chest-supported-dumbbell-row',
      'incline-chest-supported-reverse-fly',
      'seated-dumbbell-shoulder-press',
      'bench-overhead-dumbbell-extension',
      'chest-supported-dumbbell-kickback',
      'bench-close-grip-dumbbell-press',
    ]) {
      expect(bySlug.has(slug), slug).toBe(true);
    }

    expect(bySlug.get('dumbbell-pullover')?.instructions).toContain('bench');
    expect(bySlug.get('dumbbell-hip-thrust')?.instructions.toLowerCase()).toContain('bench');
  });

  it('names the glute area on every glute exercise', () => {
    const glutes = exercises.filter((exercise) =>
      exercise.muscles.some((muscle) => muscle.slug === 'glutes' && muscle.role === 'primary'),
    );
    expect(glutes.length).toBeGreaterThan(0);
    for (const exercise of glutes) {
      if (exercise.region === 'thrust') {
        expect(exercise.description, exercise.slug).toContain('gluteus maximus');
        expect(exercise.description, exercise.slug).not.toContain('upper gluteus maximus');
      } else if (exercise.region === 'kickback') {
        expect(exercise.description, exercise.slug).toContain('upper gluteus maximus');
      }
    }
  });

  it('gives every region strength and muscle growth on each kit and difficulty', () => {
    const expected: Record<string, string[]> = {
      chest: ['mid', 'upper', 'lower', 'pecs'],
      back: ['lats', 'mid-back', 'upper-back', 'lower-back'],
      biceps: ['overall', 'short-head', 'long-head', 'brachialis'],
      triceps: ['long-head', 'lateral-head', 'medial-head'],
      forearms: ['flexors', 'extensors'],
      quadriceps: ['squat', 'single-leg', 'knee-extension'],
      hamstrings: ['hip-hinge', 'knee-flexion'],
      glutes: ['thrust', 'kickback'],
      calves: ['standing', 'seated'],
      shoulders: ['front-delt', 'side-delt', 'rear-delt'],
      abdominals: ['abdominals', 'obliques', 'brace'],
    };
    const categories = ['free_weight', 'machine', 'bodyweight'] as const;
    const goals = ['strength', 'hypertrophy'] as const;
    const levels = ['beginner', 'intermediate', 'advanced'] as const;

    for (const [muscle, regions] of Object.entries(expected)) {
      for (const region of regions) {
        for (const category of categories) {
          for (const goal of goals) {
            for (const difficulty of levels) {
              const found = exercises.some(
                (exercise) =>
                  exercise.region === region &&
                  exercise.goal === goal &&
                  exercise.difficulty === difficulty &&
                  exercise.muscles.some(
                    (link) => link.slug === muscle && link.role === 'primary',
                  ) &&
                  exercise.equipment.some(
                    (slug) => equipment.find((item) => item.slug === slug)?.category === category,
                  ),
              );
              expect(found, `${muscle} ${region} ${goal} ${category} ${difficulty}`).toBe(true);
            }
          }
        }
      }
    }

    const bodyweightStrength = exercises.find(
      (exercise) => exercise.slug === 'chest-mid-strength-bodyweight-beginner',
    );
    expect(bodyweightStrength?.instructions).toContain('This version is for strength.');
    const freeWeightGrowth = exercises.find(
      (exercise) => exercise.slug === 'chest-mid-hypertrophy-free-weight-intermediate',
    );
    expect(freeWeightGrowth?.instructions).toContain('This version is for muscle growth.');
  });

  it('gives every region a beginner, intermediate, and advanced exercise for each goal', () => {
    const expected: Record<string, string[]> = {
      chest: ['mid', 'upper', 'lower', 'pecs'],
      back: ['lats', 'mid-back', 'upper-back', 'lower-back'],
      biceps: ['overall', 'short-head', 'long-head', 'brachialis'],
      triceps: ['long-head', 'lateral-head', 'medial-head'],
      forearms: ['flexors', 'extensors'],
      quadriceps: ['squat', 'single-leg', 'knee-extension'],
      hamstrings: ['hip-hinge', 'knee-flexion'],
      glutes: ['thrust', 'kickback'],
      calves: ['standing', 'seated'],
      shoulders: ['front-delt', 'side-delt', 'rear-delt'],
      abdominals: ['abdominals', 'obliques', 'brace'],
    };
    const goals = ['strength', 'hypertrophy', 'general_fitness', 'endurance'] as const;
    const levels = ['beginner', 'intermediate', 'advanced'] as const;

    for (const [muscle, regions] of Object.entries(expected)) {
      for (const region of regions) {
        for (const goal of goals) {
          for (const difficulty of levels) {
            const found = exercises.some(
              (exercise) =>
                exercise.region === region &&
                exercise.goal === goal &&
                exercise.difficulty === difficulty &&
                exercise.muscles.some(
                  (link) => link.slug === muscle && link.role === 'primary',
                ),
            );
            expect(found, `${muscle} ${region} ${goal} ${difficulty}`).toBe(true);
          }
        }
      }
    }
  });
});
