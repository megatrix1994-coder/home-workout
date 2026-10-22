import { describe, expect, it } from 'vitest';
import { exercises } from '../catalogue.js';
import { paintFrame } from './draw.js';
import { poseRecipe } from './pose.js';

describe('original demonstration poses', () => {
  it('gives every exercise a different pose recipe', () => {
    const recipes = exercises.map((exercise) => JSON.stringify(poseRecipe(exercise)));
    expect(new Set(recipes).size).toBe(exercises.length);
  });

  it('paints a PNG frame that changes during the movement', () => {
    const recipe = poseRecipe(exercises.find((exercise) => exercise.slug === 'push-up') ?? exercises[0]);
    const first = paintFrame(recipe, 0);
    const later = paintFrame(recipe, 5);
    expect(first.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(first.equals(later)).toBe(false);
  });
});
