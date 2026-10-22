import { describe, expect, it } from 'vitest';
import {
  cleanRepTarget,
  exerciseProgression,
  loadJumpKg,
  progressionCycle,
} from './progression.js';

describe('progression', () => {
  it('sets a lower clean-rep bar and a smaller jump for beginners', () => {
    expect(cleanRepTarget('beginner', 'hypertrophy')).toBe(8);
    expect(cleanRepTarget('intermediate', 'hypertrophy')).toBe(10);
    expect(cleanRepTarget('advanced', 'hypertrophy')).toBe(12);
    expect(cleanRepTarget('beginner', 'strength')).toBe(5);
    expect(cleanRepTarget('advanced', 'endurance')).toBe(15);
    expect(loadJumpKg('beginner', 'compound')).toBe(1);
    expect(loadJumpKg('intermediate', 'isolation')).toBe(2.5);
    expect(loadJumpKg('advanced', 'compound')).toBe(5);
    expect(loadJumpKg('advanced', 'isolation')).toBe(2.5);
    expect(loadJumpKg('advanced', 'isometric')).toBe(2.5);
  });

  it('describes every experience on an exercise', () => {
    const cycle = progressionCycle({
      goal: 'general_fitness',
      movementType: 'compound',
      bodyweightOnly: false,
    });

    expect(cycle.map((step) => step.experience)).toEqual([
      'beginner',
      'intermediate',
      'advanced',
    ]);
    expect(cycle[0]?.summary).toBe(
      'When every set reaches 8 clean reps, add 1 kg next time.',
    );
    expect(cycle[2]?.summary).toBe(
      'When every set reaches 12 clean reps, add 5 kg next time.',
    );
  });

  it('raises bodyweight reps until the advanced target, then asks for a harder version', () => {
    const beginner = progressionCycle({
      goal: 'general_fitness',
      movementType: 'compound',
      bodyweightOnly: true,
    })[0];
    const strength = progressionCycle({
      goal: 'strength',
      movementType: 'compound',
      bodyweightOnly: true,
    }).find((step) => step.experience === 'beginner');

    expect(beginner?.summary).toContain('aim for 1 more clean rep next time, up to 12');
    expect(strength?.summary).toContain('use a harder version next time');
  });

  it('adds the earned jump to the last logged weight', () => {
    const earned = exerciseProgression({
      experience: 'intermediate',
      goal: 'general_fitness',
      movementType: 'compound',
      bodyweightOnly: false,
      expectedSets: 1,
      currentLogs: [],
      previousLogs: [{ repsCompleted: 10, weightKg: 10 }],
      previousExpectedSets: 1,
    });

    expect(earned.earned).toBe(true);
    expect(earned.suggestedWeightKg).toBe(12.5);
    expect(earned.outcome).toBeNull();
  });

  it('repeats the same weight when a set misses the clean-rep target', () => {
    const missed = exerciseProgression({
      experience: 'beginner',
      goal: 'hypertrophy',
      movementType: 'isolation',
      bodyweightOnly: false,
      expectedSets: 2,
      currentLogs: [
        { repsCompleted: 8, weightKg: 6 },
        { repsCompleted: 6, weightKg: 6 },
      ],
      previousLogs: [
        { repsCompleted: 8, weightKg: 4 },
        { repsCompleted: 7, weightKg: 4 },
      ],
      previousExpectedSets: 2,
    });

    expect(missed.earned).toBe(false);
    expect(missed.suggestedWeightKg).toBe(4);
    expect(missed.outcome).toBe(
      'Repeat 6 kg next time. Not every set reached 8 clean reps.',
    );
  });

  it('repeats the same weight when the previous exercise was left unfinished', () => {
    const unfinished = exerciseProgression({
      experience: 'beginner',
      goal: 'general_fitness',
      movementType: 'compound',
      bodyweightOnly: false,
      expectedSets: 9,
      currentLogs: [],
      previousLogs: [{ repsCompleted: 10, weightKg: 5 }],
      previousExpectedSets: 9,
    });

    expect(unfinished.earned).toBe(false);
    expect(unfinished.suggestedWeightKg).toBe(5);
  });

  it('does not invent a weight the first time, and raises the bodyweight aim after a clean session', () => {
    const first = exerciseProgression({
      experience: 'beginner',
      goal: 'general_fitness',
      movementType: 'compound',
      bodyweightOnly: true,
      expectedSets: 1,
      currentLogs: [{ repsCompleted: 8, weightKg: null }],
      previousLogs: null,
    });

    expect(first.suggestedWeightKg).toBeNull();
    expect(first.earned).toBeNull();
    expect(first.outcome).toBe('Next time aim for 9 clean reps.');

    const advanced = exerciseProgression({
      experience: 'advanced',
      goal: 'hypertrophy',
      movementType: 'isolation',
      bodyweightOnly: true,
      expectedSets: 1,
      currentLogs: [{ repsCompleted: 12, weightKg: 20 }],
      previousLogs: null,
    });

    expect(advanced.outcome).toBe('Next time use 22.5 kg.');
  });
});
