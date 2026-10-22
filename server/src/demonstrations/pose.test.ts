import { describe, expect, it } from 'vitest';
import { exercises } from '../catalogue.js';
import { FRAME_HEIGHT, FRAME_WIDTH, paintFrame, renderFrame } from './draw.js';
import { poseRecipe } from './pose.js';

const PROP = [90, 98, 104];
const FLOOR = [196, 186, 170];

function matches(pixel: Buffer, offset: number, color: number[]) {
  return pixel[offset] === color[0] && pixel[offset + 1] === color[1] && pixel[offset + 2] === color[2];
}

function countColor(pixels: Buffer, color: number[]) {
  let count = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (matches(pixels, offset, color)) {
      count += 1;
    }
  }
  return count;
}

function floorBands(pixels: Buffer) {
  const rows: number[] = [];
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    let count = 0;
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      if (matches(pixels, (y * FRAME_WIDTH + x) * 4, FLOOR)) {
        count += 1;
      }
    }
    if (count > 80) {
      rows.push(y);
    }
  }
  const bands: number[][] = [];
  for (const row of rows) {
    const current = bands.at(-1);
    if (current && row - current[current.length - 1]! <= 2) {
      current.push(row);
    } else {
      bands.push([row]);
    }
  }
  return bands.length;
}

function propTop(pixels: Buffer) {
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      if (matches(pixels, (y * FRAME_WIDTH + x) * 4, PROP)) {
        return y;
      }
    }
  }
  return FRAME_HEIGHT;
}

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
    expect(first.readUInt32BE(16)).toBe(FRAME_WIDTH);
    expect(first.readUInt32BE(20)).toBe(FRAME_HEIGHT);
    expect(first.equals(later)).toBe(false);
  });

  it('shows bodyweight, a carried dumbbell, and a chest press machine', () => {
    const pushUp = renderFrame(poseRecipe(exercises.find((exercise) => exercise.slug === 'push-up')!), 0);
    expect(floorBands(pushUp)).toBe(1);
    expect(countColor(pushUp, PROP)).toBe(0);

    const curl = exercises.find((exercise) => exercise.slug === 'dumbbell-curl')!;
    const curlStart = renderFrame(poseRecipe(curl), 0);
    const curlMid = renderFrame(poseRecipe(curl), 10);
    expect(countColor(curlStart, PROP)).toBeGreaterThan(40);
    expect(propTop(curlMid)).toBeLessThan(propTop(curlStart) - 8);

    const press = exercises.find((exercise) => exercise.slug === 'machine-chest-press')!;
    const pressStart = renderFrame(poseRecipe(press), 0);
    const pressMid = renderFrame(poseRecipe(press), 10);
    expect(countColor(pressStart, PROP)).toBeGreaterThan(40);
    expect(propTop(pressMid)).toBeLessThan(propTop(pressStart) - 8);
  });
});
