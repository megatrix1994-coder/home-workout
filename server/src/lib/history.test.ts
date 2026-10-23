import { describe, expect, it } from 'vitest';
import { buildProgress, summarizeExercise, weekStreak, type HistoryWorkout } from './history.js';

const chest = { slug: 'chest', name: 'Chest' };
const back = { slug: 'back', name: 'Back' };

function workout(input: {
  id: string;
  completedAt: string | null;
  status?: HistoryWorkout['status'];
  muscle?: { slug: string; name: string };
  exercises?: HistoryWorkout['exercises'];
}): HistoryWorkout {
  return {
    id: input.id,
    status: input.status ?? (input.completedAt ? 'completed' : 'draft'),
    muscle: input.muscle ?? chest,
    createdAt: new Date(input.completedAt ?? '2026-10-01T08:00:00Z'),
    completedAt: input.completedAt ? new Date(input.completedAt) : null,
    exercises: input.exercises ?? [],
  };
}

function press(weights: Array<number | null>, reps = 5) {
  return {
    slug: 'barbell-bench-press',
    name: 'Barbell bench press',
    bodyweightOnly: false,
    plannedSets: weights.length,
    logs: weights.map((weightKg) => ({ repsCompleted: reps, weightKg })),
  };
}

function pushUp(reps: number[]) {
  return {
    slug: 'push-up',
    name: 'Push-up',
    bodyweightOnly: true,
    plannedSets: reps.length,
    logs: reps.map((repsCompleted) => ({ repsCompleted, weightKg: null })),
  };
}

describe('history progress', () => {
  it('summarizes the best weight and total reps of an exercise', () => {
    expect(summarizeExercise(press([40, 42.5, null], 5))).toEqual({
      slug: 'barbell-bench-press',
      name: 'Barbell bench press',
      bestWeightKg: 42.5,
      totalReps: 15,
    });
    expect(summarizeExercise(pushUp([10, 12])).bestWeightKg).toBeNull();
  });

  it('counts a streak of weeks across a week boundary', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    const dates = ['2026-10-19T07:00:00Z', '2026-10-18T20:00:00Z', '2026-09-29T07:00:00Z'].map(
      (value) => new Date(value),
    );
    expect(weekStreak(dates, now)).toBe(2);
  });

  it('keeps last week in the streak when this week has no session yet', () => {
    const now = new Date('2026-10-19T06:00:00Z');
    expect(weekStreak([new Date('2026-10-16T07:00:00Z')], now)).toBe(1);
    expect(weekStreak([new Date('2026-10-05T07:00:00Z')], now)).toBe(0);
  });

  it('counts recent sessions and muscles from completed workouts only', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    const progress = buildProgress(
      [
        workout({ id: 'a', completedAt: '2026-10-22T07:00:00Z' }),
        workout({ id: 'b', completedAt: '2026-10-10T07:00:00Z', muscle: back }),
        workout({ id: 'c', completedAt: '2026-09-01T07:00:00Z' }),
        workout({ id: 'd', completedAt: null, status: 'started' }),
      ],
      now,
    );
    expect(progress.completedLast7Days).toBe(1);
    expect(progress.completedLast28Days).toBe(2);
    expect(progress.muscles).toEqual([
      { slug: 'chest', name: 'Chest', completed: 2 },
      { slug: 'back', name: 'Back', completed: 1 },
    ]);
  });

  it('builds a weight trend and skips sessions with no logged sets', () => {
    const progress = buildProgress(
      [
        workout({ id: 'late', completedAt: '2026-10-20T07:00:00Z', exercises: [press([45, 47.5])] }),
        workout({ id: 'empty', completedAt: '2026-10-13T07:00:00Z', exercises: [press([])] }),
        workout({ id: 'early', completedAt: '2026-10-06T07:00:00Z', exercises: [press([40, null])] }),
      ],
      new Date('2026-10-23T12:00:00Z'),
    );
    expect(progress.trends).toEqual([
      {
        slug: 'barbell-bench-press',
        name: 'Barbell bench press',
        unit: 'kg',
        improved: true,
        points: [
          { workoutId: 'early', completedAt: '2026-10-06T07:00:00.000Z', value: 40 },
          { workoutId: 'late', completedAt: '2026-10-20T07:00:00.000Z', value: 47.5 },
        ],
      },
    ]);
  });

  it('uses best reps for bodyweight work and leaves out single sessions', () => {
    const progress = buildProgress(
      [
        workout({ id: 'one', completedAt: '2026-10-06T07:00:00Z', exercises: [pushUp([12, 10])] }),
        workout({ id: 'two', completedAt: '2026-10-13T07:00:00Z', exercises: [pushUp([11, 9])] }),
        workout({ id: 'solo', completedAt: '2026-10-13T07:00:00Z', muscle: back }),
      ],
      new Date('2026-10-23T12:00:00Z'),
    );
    expect(progress.trends).toHaveLength(1);
    expect(progress.trends[0]).toMatchObject({
      slug: 'push-up',
      unit: 'reps',
      improved: false,
      points: [{ value: 12 }, { value: 11 }],
    });
  });

  it('leaves out a loaded exercise that has no weight logged', () => {
    const progress = buildProgress(
      [
        workout({ id: 'one', completedAt: '2026-10-06T07:00:00Z', exercises: [press([null])] }),
        workout({ id: 'two', completedAt: '2026-10-13T07:00:00Z', exercises: [press([40])] }),
      ],
      new Date('2026-10-23T12:00:00Z'),
    );
    expect(progress.trends).toEqual([]);
  });
});
