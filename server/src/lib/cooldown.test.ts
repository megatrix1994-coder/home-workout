import { describe, expect, it } from 'vitest';
import { cooldowns } from '../cooldowns.js';
import { muscleGroups } from '../catalogue.js';
import { trainedMuscleSlugs } from './cooldown.js';

describe('cooldown muscles', () => {
  it('puts the session muscle first and drops duplicates', () => {
    expect(
      trainedMuscleSlugs(
        { slug: 'chest', sortOrder: 1 },
        [
          { slug: 'triceps', sortOrder: 5 },
          { slug: 'chest', sortOrder: 1 },
          { slug: 'shoulders', sortOrder: 3 },
          { slug: 'triceps', sortOrder: 5 },
        ],
      ),
    ).toEqual(['chest', 'shoulders', 'triceps']);
  });

  it('gives every muscle a gentle stretch and an easier stretch', () => {
    for (const muscle of muscleGroups) {
      const stretches = cooldowns.filter((stretch) => stretch.muscle === muscle.slug);
      expect(stretches.map((stretch) => stretch.ease).sort()).toEqual(['easier', 'gentle']);
      for (const stretch of stretches) {
        expect(stretch.instructions).toContain('Setup:');
        expect(stretch.instructions).toContain('Breathing:');
        expect(stretch.instructions).toContain('Common mistakes:');
      }
    }
  });
});
