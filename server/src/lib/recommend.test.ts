import { describe, expect, it } from 'vitest';
import { equipment, exercises } from '../catalogue.js';
import {
  listAlternatives,
  recommend,
  unknownMuscleRationale,
  type Candidate,
  type RecommendationInput,
} from './recommend.js';

const chest: RecommendationInput = {
  muscleSlug: 'chest',
  muscleName: 'Chest',
  goal: 'hypertrophy',
  experience: 'beginner',
  equipmentCategories: ['free_weight', 'machine', 'bodyweight'],
};

const bodyweight = [
  { slug: 'bodyweight', name: 'Bodyweight', category: 'bodyweight' as const },
];
const machine = [
  {
    slug: 'chest-press',
    name: 'Chest press machine',
    category: 'machine' as const,
  },
];

function exercise(
  overrides: Partial<Candidate> & Pick<Candidate, 'slug'>,
): Candidate {
  return {
    id: overrides.slug,
    name: overrides.slug,
    description: 'A movement.',
    instructions: 'Setup: Start tall.',
    difficulty: 'beginner',
    movementType: 'compound',
    region: overrides.region ?? overrides.slug,
    goals: ['hypertrophy'],
    muscles: [{ slug: 'chest', name: 'Chest', role: 'primary' }],
    equipment: [
      { slug: 'dumbbell', name: 'Dumbbell', category: 'free_weight' },
    ],
    ...overrides,
  };
}

describe('recommend', () => {
  it('excludes equipment the user does not have', () => {
    const result = recommend(
      { ...chest, equipmentCategories: ['free_weight'] },
      [
        exercise({ slug: 'push-up', equipment: bodyweight }),
        exercise({ slug: 'machine-press', equipment: machine }),
        exercise({ slug: 'db-press' }),
        exercise({
          slug: 'combo',
          equipment: [
            { slug: 'dumbbell', name: 'Dumbbell', category: 'free_weight' },
            {
              slug: 'chest-press',
              name: 'Chest press machine',
              category: 'machine',
            },
          ],
        }),
      ],
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual([
      'db-press',
    ]);
    expect(result.rationale).toContain('free weights');
    expect(result.rationale).not.toContain('machines');
  });

  it('keeps harder exercises out when enough matching ones exist', () => {
    const result = recommend(chest, [
      exercise({ slug: 'push-up', equipment: bodyweight }),
      exercise({ slug: 'machine-press', equipment: machine }),
      exercise({
        slug: 'db-fly',
        difficulty: 'intermediate',
        movementType: 'isolation',
        region: 'push-up',
      }),
    ]);

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual([
      'machine-press',
      'push-up',
    ]);
    expect(result.rationale).not.toContain('next difficulty');
  });

  it('uses a harder exercise when this experience has none in that part', () => {
    const result = recommend(
      { ...chest, equipmentCategories: ['free_weight'] },
      [
        exercise({ slug: 'db-press', difficulty: 'intermediate' }),
        exercise({
          slug: 'db-fly',
          difficulty: 'intermediate',
          movementType: 'isolation',
        }),
        exercise({
          slug: 'advanced-press',
          difficulty: 'advanced',
          region: 'db-press',
        }),
      ],
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual([
      'db-press',
      'db-fly',
    ]);
    expect(result.rationale).toContain('use a harder exercise');
    expect(result.exercises[0]?.reason).toContain(
      'is an intermediate muscle growth compound',
    );
    expect(result.exercises.map((item) => item.exercise.slug)).not.toContain(
      'advanced-press',
    );
  });

  it('prescribes reps from the goal', () => {
    const cases = [
      ['strength', '5'],
      ['hypertrophy', '8-12'],
      ['general_fitness', '10'],
      ['endurance', '15'],
    ] as const;

    for (const [goal, reps] of cases) {
      const result = recommend({ ...chest, goal }, [
        exercise({ slug: 'press' }),
      ]);
      expect(result.exercises[0]?.reps).toBe(reps);
    }
  });

  it('fits every eligible exercise into a 90 to 120 minute session', () => {
    const result = recommend(
      { ...chest, goal: 'hypertrophy' },
      ['a', 'b', 'c', 'd', 'e'].map((slug) => exercise({ slug })),
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
    expect(result.estimatedMinutes).toBeGreaterThanOrEqual(90);
    expect(result.estimatedMinutes).toBeLessThanOrEqual(120);
    expect(result.exercises[0]).toMatchObject({
      sets: 3,
      reps: '8-12',
      restSeconds: 75,
    });
    expect(result.rationale).toContain(
      `about ${result.estimatedMinutes} minutes`,
    );
    expect(result.rationale).toContain('long session');
    expect(result.rationale).toContain('form slips');
  });

  it('keeps the goal prescription for one round in a standard session', () => {
    const result = recommend(
      { ...chest, goal: 'general_fitness' },
      ['a', 'b', 'c', 'd'].map((slug) => exercise({ slug })),
      0,
      'standard',
    );

    expect(result.rounds).toBe(1);
    expect(result.exercises[0]).toMatchObject({
      sets: 3,
      reps: '10',
      restSeconds: 60,
    });
    expect(result.estimatedMinutes).toBeLessThan(90);
    expect(result.rationale).not.toContain('long session');
  });

  it('keeps the best exercise in a region and offers the other matches as replacements', () => {
    const sameRegion = { region: 'mid' };
    const result = recommend(
      {
        ...chest,
        goal: 'general_fitness',
        equipmentCategories: ['free_weight'],
      },
      [
        exercise({ slug: 'a', ...sameRegion }),
        exercise({ slug: 'b', ...sameRegion }),
        exercise({ slug: 'c', ...sameRegion }),
        exercise({ slug: 'd', ...sameRegion }),
        exercise({ slug: 'e', ...sameRegion }),
        exercise({ slug: 'f', ...sameRegion }),
        exercise({ slug: 'g', ...sameRegion }),
        exercise({
          slug: 'back-row',
          region: 'mid-back',
          muscles: [{ slug: 'back', name: 'Back', role: 'primary' }],
        }),
        exercise({ slug: 'machine-press', region: 'mid', equipment: machine }),
      ],
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual(['a']);
    expect(result.exercises[0]?.alternatives.map((item) => item.exercise.slug)).toEqual([
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);
    const alternatives = listAlternatives(
      {
        ...chest,
        goal: 'general_fitness',
        equipmentCategories: ['free_weight'],
      },
      [
        exercise({ slug: 'a', ...sameRegion }),
        exercise({ slug: 'b', ...sameRegion }),
        exercise({ slug: 'c', ...sameRegion }),
        exercise({ slug: 'd', ...sameRegion }),
        exercise({ slug: 'e', ...sameRegion }),
        exercise({ slug: 'f', ...sameRegion }),
        exercise({ slug: 'g', ...sameRegion }),
      ],
      ['a', 'b', 'c', 'd'],
      'mid',
    );
    expect(alternatives.map((item) => item.exercise.slug)).toEqual([
      'e',
      'f',
      'g',
    ]);
    expect(alternatives[0]?.exercise.muscles[0]?.slug).toBe('chest');
  });

  it('orders compounds before isolation even when the goal prefers isolation', () => {
    const result = recommend(
      { ...chest, goal: 'endurance', equipmentCategories: ['bodyweight'] },
      [
        exercise({
          slug: 'iso-b',
          movementType: 'isolation',
          equipment: bodyweight,
        }),
        exercise({
          slug: 'iso-a',
          movementType: 'isolation',
          equipment: bodyweight,
        }),
        exercise({
          slug: 'press',
          movementType: 'compound',
          equipment: bodyweight,
        }),
        exercise({
          slug: 'hold',
          movementType: 'isometric',
          equipment: bodyweight,
        }),
      ],
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual([
      'press',
      'iso-a',
      'iso-b',
      'hold',
    ]);
  });

  it('returns a shorter workout when the muscle has few exercises', () => {
    const result = recommend(
      {
        ...chest,
        muscleSlug: 'forearms',
        muscleName: 'Forearms',
        equipmentCategories: ['free_weight'],
      },
      [
        exercise({
          slug: 'wrist-curl',
          muscles: [{ slug: 'forearms', name: 'Forearms', role: 'primary' }],
        }),
      ],
    );

    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0]?.reason).toContain('wrist-curl');
    expect(result.exercises[0]?.reason).toContain('Forearms');
  });

  it('includes every eligible exercise for the muscle', () => {
    const result = recommend(
      {
        ...chest,
        experience: 'advanced',
        goal: 'strength',
        equipmentCategories: ['free_weight'],
      },
      [
        exercise({ slug: 'm1', difficulty: 'intermediate' }),
        exercise({ slug: 'm2', difficulty: 'intermediate' }),
        exercise({ slug: 'm3', difficulty: 'intermediate' }),
        exercise({ slug: 'm4', difficulty: 'intermediate' }),
        exercise({ slug: 'hard', difficulty: 'advanced' }),
      ],
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual([
      'hard',
      'm1',
      'm2',
      'm3',
      'm4',
    ]);
  });

  it('explains an empty equipment match and ignores secondary muscles', () => {
    const result = recommend({ ...chest, equipmentCategories: ['machine'] }, [
      exercise({
        slug: 'hammer-curl',
        muscles: [
          { slug: 'biceps', name: 'Biceps', role: 'primary' },
          { slug: 'chest', name: 'Chest', role: 'secondary' },
        ],
        equipment: machine,
      }),
    ]);

    expect(result.exercises).toEqual([]);
    expect(result.rationale).toContain('No Chest exercises use only machines');
    expect(result.rationale).toContain('general training rules');
  });

  it('names the muscle, goal, experience, and equipment in the rationale', () => {
    const result = recommend(
      {
        ...chest,
        goal: 'hypertrophy',
        equipmentCategories: ['bodyweight', 'machine', 'free_weight'],
      },
      [exercise({ slug: 'push-up', name: 'Push-up', equipment: bodyweight })],
    );

    expect(result.rationale).toContain(
      'This workout targets Chest for muscle growth',
    );
    expect(result.rationale).toContain(
      'free weights, machines, and bodyweight',
    );
    expect(result.rationale).toContain('Beginner exercises are used for each part');
    expect(result.rationale).toContain(guidanceSentence());
    expect(result.exercises[0]?.reason).toBe(
      'Push-up is a beginner muscle growth compound for Chest and matches your bodyweight.',
    );
  });

  it('explains an unknown muscle without inventing exercises', () => {
    expect(unknownMuscleRationale()).toContain('No muscle group matches');
    expect(unknownMuscleRationale()).toContain('general training rules');
  });

  it('picks one exercise for each region and names a part the equipment leaves out', () => {
    const pool = exercises.map((item) => catalogueCandidate(item));
    const full = {
      goal: 'general_fitness' as const,
      experience: 'advanced' as const,
      equipmentCategories: ['free_weight', 'machine', 'bodyweight'] as const,
    };

    const expected: Record<string, string[]> = {
      chest: ['mid', 'upper', 'lower', 'pecs'],
      back: ['lats', 'mid-back', 'upper-back', 'lower-back'],
      biceps: ['overall', 'short-head', 'long-head', 'brachialis'],
      triceps: ['long-head', 'lateral-head', 'medial-head'],
      forearms: ['flexors', 'extensors'],
    };

    for (const [slug, regions] of Object.entries(expected)) {
      const result = recommend(
        {
          ...full,
          muscleSlug: slug,
          muscleName: slug,
          equipmentCategories: [...full.equipmentCategories],
        },
        pool,
      );
      expect(result.exercises.map((item) => item.exercise.region).sort()).toEqual(
        [...regions].sort(),
      );
      expect(result.rationale).toContain('fully developed');
      for (const slot of result.exercises) {
        const otherRegions = new Set(
          slot.alternatives.map((alternative) => alternative.exercise.region),
        );
        expect([...otherRegions].every((region) => region === slot.exercise.region)).toBe(
          true,
        );
      }
    }

    const homeChest = recommend(
      {
        muscleSlug: 'chest',
        muscleName: 'Chest',
        goal: 'general_fitness',
        experience: 'advanced',
        equipmentCategories: ['free_weight', 'bodyweight'],
      },
      pool,
    );
    expect(homeChest.exercises.map((item) => item.exercise.region).sort()).toEqual([
      'lower',
      'mid',
      'pecs',
      'upper',
    ]);
    expect(homeChest.rationale).not.toContain('has no match');

    const homeQuads = recommend(
      {
        muscleSlug: 'quadriceps',
        muscleName: 'Quadriceps',
        goal: 'general_fitness',
        experience: 'advanced',
        equipmentCategories: ['free_weight', 'bodyweight'],
      },
      pool,
    );
    expect(homeQuads.exercises.map((item) => item.exercise.region)).toContain(
      'knee-extension',
    );
    expect(homeQuads.rationale).not.toContain('has no match');
  });

  it('keeps every region for each equipment category, experience, and goal', () => {
    const pool = exercises.map((item) => catalogueCandidate(item));
    const regionsByMuscle: Record<string, string[]> = {
      chest: ['mid', 'upper', 'lower', 'pecs'],
      back: ['lats', 'mid-back', 'upper-back', 'lower-back'],
      shoulders: ['front-delt', 'side-delt', 'rear-delt'],
      biceps: ['overall', 'short-head', 'long-head', 'brachialis'],
      triceps: ['long-head', 'lateral-head', 'medial-head'],
      forearms: ['flexors', 'extensors'],
      quadriceps: ['squat', 'single-leg', 'knee-extension'],
      hamstrings: ['hip-hinge', 'knee-flexion'],
      glutes: ['thrust', 'kickback'],
      calves: ['standing', 'seated'],
      abdominals: ['abdominals', 'obliques', 'brace'],
    };
    const categories = ['free_weight', 'machine', 'bodyweight'] as const;
    const experiences = ['beginner', 'intermediate', 'advanced'] as const;
    const goals = ['strength', 'hypertrophy', 'general_fitness', 'endurance'] as const;

    for (const [slug, regions] of Object.entries(regionsByMuscle)) {
      for (const category of categories) {
        for (const experience of experiences) {
          const regionSets = goals.map((goal) =>
            recommend(
              {
                muscleSlug: slug,
                muscleName: slug,
                goal,
                experience,
                equipmentCategories: [category],
              },
              pool,
            )
              .exercises.map((item) => item.exercise.region)
              .sort(),
          );
          for (const found of regionSets) {
            expect(found, `${slug} ${category} ${experience}`).toEqual(
              [...regions].sort(),
            );
          }
          expect(new Set(regionSets.map((found) => found.join(','))).size).toBe(1);
        }
      }
    }
  });

  it('keeps the exercise that matches the experience and the goal', () => {
    const result = recommend(
      { ...chest, goal: 'strength', experience: 'intermediate' },
      [
        exercise({
          slug: 'easy',
          region: 'mid',
          difficulty: 'beginner',
          goals: ['strength'],
        }),
        exercise({
          slug: 'match',
          region: 'mid',
          difficulty: 'intermediate',
          goals: ['strength'],
        }),
        exercise({
          slug: 'grow',
          region: 'mid',
          difficulty: 'intermediate',
          goals: ['hypertrophy'],
        }),
      ],
    );

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual(['match']);
    expect(result.rationale).not.toContain('no exercise written');
    expect(result.rationale).not.toContain('harder exercise');
    expect(result.rationale).not.toContain('easier exercise');
    expect(result.exercises[0]?.reason).toContain('intermediate strength');
  });

  it('names a part that has no exercise for the goal', () => {
    const result = recommend(chest, [
      exercise({ slug: 'press', region: 'mid', goals: ['strength'] }),
    ]);

    expect(result.exercises.map((item) => item.exercise.slug)).toEqual(['press']);
    expect(result.rationale).toContain(
      'Middle chest has no exercise written for muscle growth.',
    );
  });

  it('names a part that uses an easier exercise for this experience', () => {
    const result = recommend({ ...chest, experience: 'advanced' }, [
      exercise({
        slug: 'press',
        region: 'mid',
        difficulty: 'beginner',
        goals: ['hypertrophy'],
      }),
    ]);

    expect(result.rationale).toContain(
      'Middle chest uses an easier exercise so this experience still covers that part.',
    );
  });

  it('picks a different exercise for each experience and each goal', () => {
    const pool = exercises.map((item) => catalogueCandidate(item));
    const regionsByMuscle: Record<string, string[]> = {
      chest: ['mid', 'upper', 'lower', 'pecs'],
      back: ['lats', 'mid-back', 'upper-back', 'lower-back'],
      shoulders: ['front-delt', 'side-delt', 'rear-delt'],
      biceps: ['overall', 'short-head', 'long-head', 'brachialis'],
      triceps: ['long-head', 'lateral-head', 'medial-head'],
      forearms: ['flexors', 'extensors'],
      quadriceps: ['squat', 'single-leg', 'knee-extension'],
      hamstrings: ['hip-hinge', 'knee-flexion'],
      glutes: ['thrust', 'kickback'],
      calves: ['standing', 'seated'],
      abdominals: ['abdominals', 'obliques', 'brace'],
    };
    const experiences = ['beginner', 'intermediate', 'advanced'] as const;
    const goals = ['strength', 'hypertrophy', 'general_fitness', 'endurance'] as const;
    const equipmentCategories = ['free_weight', 'machine', 'bodyweight'] as const;

    for (const [slug, regions] of Object.entries(regionsByMuscle)) {
      for (const region of regions) {
        const byExperience = experiences.map((experience) => {
          const result = recommend(
            {
              muscleSlug: slug,
              muscleName: slug,
              goal: 'strength',
              experience,
              equipmentCategories: [...equipmentCategories],
            },
            pool,
          );
          return result.exercises.find((item) => item.exercise.region === region)
            ?.exercise.slug;
        });
        expect(new Set(byExperience).size, `${slug} ${region} experience`).toBe(3);

        const byGoal = goals.map((goal) => {
          const result = recommend(
            {
              muscleSlug: slug,
              muscleName: slug,
              goal,
              experience: 'beginner',
              equipmentCategories: [...equipmentCategories],
            },
            pool,
          );
          return result.exercises.find((item) => item.exercise.region === region)
            ?.exercise.slug;
        });
        expect(new Set(byGoal).size, `${slug} ${region} goal`).toBe(4);
      }
    }
  });

  it('names a part that uses a harder exercise for this experience', () => {
    const result = recommend(chest, [
      exercise({ slug: 'push-up', region: 'mid', equipment: bodyweight }),
      exercise({
        slug: 'incline',
        region: 'upper',
        difficulty: 'advanced',
        equipment: bodyweight,
      }),
    ]);

    expect(result.exercises.map((item) => item.exercise.region).sort()).toEqual([
      'mid',
      'upper',
    ]);
    expect(result.rationale).toContain(
      'Upper chest uses a harder exercise so this experience still covers that part.',
    );
  });
});

function guidanceSentence() {
  return 'These are general training rules, not a claim that this session is best for every person, and not a claim that every part of the muscle is fully developed.';
}

function catalogueCandidate(
  item: (typeof exercises)[number],
): Candidate {
  return {
    id: item.slug,
    slug: item.slug,
    name: item.name,
    description: item.description,
    instructions: item.instructions,
    difficulty: item.difficulty,
    movementType: item.movementType,
    region: item.region,
    goals: [item.goal],
    muscles: item.muscles.map((muscle) => ({
      slug: muscle.slug,
      name: muscle.slug,
      role: muscle.role,
    })),
    equipment: item.equipment.map((slug) => {
      const match = equipment.find((piece) => piece.slug === slug);
      if (!match) {
        throw new Error(`Unknown equipment ${slug}`);
      }
      return { slug, name: match.name, category: match.category };
    }),
  };
}
