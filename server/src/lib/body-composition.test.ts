import { describe, expect, it } from 'vitest';
import {
  listPrerequisites,
  pickPrerequisite,
  trainingForIntent,
  type PrerequisiteCandidate,
} from './body-composition.js';

function candidate(
  overrides: Partial<PrerequisiteCandidate> & Pick<PrerequisiteCandidate, 'slug'>,
): PrerequisiteCandidate {
  return {
    name: overrides.slug,
    difficulty: 'beginner',
    movementType: 'compound',
    region: 'mid',
    goals: ['strength'],
    muscles: [{ slug: 'chest', role: 'primary' }],
    ...overrides,
  };
}

describe('trainingForIntent', () => {
  it('pairs a cut with strength and a standard session, and a bulk with muscle growth and a full session', () => {
    expect(trainingForIntent('cut')).toEqual({ goal: 'strength', length: 'standard' });
    expect(trainingForIntent('bulk')).toEqual({ goal: 'hypertrophy', length: 'full' });
  });
});

describe('listPrerequisites', () => {
  const catalogue = [
    candidate({ slug: 'press-beginner', region: 'mid' }),
    candidate({
      slug: 'fly-beginner',
      region: 'mid',
      movementType: 'isolation',
    }),
    candidate({ slug: 'raise-beginner', region: 'upper', movementType: 'isolation' }),
    candidate({ slug: 'press-intermediate', difficulty: 'intermediate' }),
    candidate({ slug: 'other-muscle', muscles: [{ slug: 'back', role: 'primary' }] }),
    candidate({ slug: 'other-goal', goals: ['endurance'] }),
  ];

  it('returns no easier exercise for a beginner', () => {
    expect(
      listPrerequisites(
        { muscleSlug: 'chest', goal: 'strength', experience: 'beginner' },
        catalogue,
      ),
    ).toEqual({
      experience: 'beginner',
      difficulty: 'beginner',
      prerequisiteDifficulty: null,
      exercises: [],
    });
  });

  it('keeps one easier exercise per region and prefers a compound', () => {
    expect(
      listPrerequisites(
        { muscleSlug: 'chest', goal: 'strength', experience: 'intermediate' },
        catalogue,
      ).exercises.map((exercise) => exercise.slug),
    ).toEqual(['press-beginner', 'raise-beginner']);
  });
});

describe('pickPrerequisite', () => {
  it('returns the easier exercise in the same region and goal', () => {
    const current = candidate({
      slug: 'press-advanced',
      difficulty: 'advanced',
      region: 'upper',
      goals: ['hypertrophy'],
    });
    const easier = candidate({
      slug: 'press-intermediate',
      difficulty: 'intermediate',
      region: 'upper',
      goals: ['hypertrophy'],
      name: 'Supported press',
    });

    expect(
      pickPrerequisite(current, [
        easier,
        candidate({
          slug: 'other-region',
          difficulty: 'intermediate',
          region: 'mid',
          goals: ['hypertrophy'],
        }),
      ]),
    ).toEqual({
      slug: 'press-intermediate',
      name: 'Supported press',
      difficulty: 'intermediate',
    });
  });
});
