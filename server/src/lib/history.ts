export type HistoryLog = {
  repsCompleted: number;
  weightKg: number | null;
};

export type HistoryExercise = {
  slug: string;
  name: string;
  bodyweightOnly: boolean;
  plannedSets: number;
  logs: HistoryLog[];
};

export type HistoryWorkout = {
  id: string;
  status: 'draft' | 'started' | 'completed';
  muscle: { slug: string; name: string };
  createdAt: Date;
  completedAt: Date | null;
  exercises: HistoryExercise[];
};

export type ExerciseSummary = {
  slug: string;
  name: string;
  bestWeightKg: number | null;
  totalReps: number;
};

export type TrendPoint = {
  workoutId: string;
  completedAt: string;
  value: number;
};

export type ExerciseTrend = {
  slug: string;
  name: string;
  unit: 'kg' | 'reps';
  points: TrendPoint[];
  improved: boolean;
};

export type Progress = {
  completedLast7Days: number;
  completedLast28Days: number;
  weekStreak: number;
  muscles: Array<{ slug: string; name: string; completed: number }>;
  trends: ExerciseTrend[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function summarizeExercise(exercise: HistoryExercise): ExerciseSummary {
  const weights = exercise.logs
    .map((log) => log.weightKg)
    .filter((weight): weight is number => weight !== null);
  return {
    slug: exercise.slug,
    name: exercise.name,
    bestWeightKg: weights.length > 0 ? Math.max(...weights) : null,
    totalReps: exercise.logs.reduce((sum, log) => sum + log.repsCompleted, 0),
  };
}

export function weekStart(date: Date): number {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  return day.getTime() - offset * DAY_MS;
}

export function weekStreak(completedDates: Date[], now: Date): number {
  const weeks = new Set(completedDates.map((date) => weekStart(date)));
  let cursor = weekStart(now);
  if (!weeks.has(cursor)) {
    cursor -= 7 * DAY_MS;
  }
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor -= 7 * DAY_MS;
  }
  return streak;
}

function bestValue(exercise: HistoryExercise): { unit: 'kg' | 'reps'; value: number } | null {
  if (exercise.logs.length === 0) {
    return null;
  }
  const summary = summarizeExercise(exercise);
  if (!exercise.bodyweightOnly && summary.bestWeightKg !== null) {
    return { unit: 'kg', value: summary.bestWeightKg };
  }
  return { unit: 'reps', value: Math.max(...exercise.logs.map((log) => log.repsCompleted)) };
}

function exerciseTrends(completed: HistoryWorkout[]): ExerciseTrend[] {
  const ordered = [...completed].sort(
    (left, right) => left.completedAt!.getTime() - right.completedAt!.getTime(),
  );
  const bySlug = new Map<string, ExerciseTrend & { mixed: boolean }>();
  for (const workout of ordered) {
    for (const exercise of workout.exercises) {
      const best = bestValue(exercise);
      if (!best) {
        continue;
      }
      const trend = bySlug.get(exercise.slug) ?? {
        slug: exercise.slug,
        name: exercise.name,
        unit: best.unit,
        points: [],
        improved: false,
        mixed: false,
      };
      if (trend.unit !== best.unit) {
        trend.mixed = true;
      }
      trend.points.push({
        workoutId: workout.id,
        completedAt: workout.completedAt!.toISOString(),
        value: best.value,
      });
      bySlug.set(exercise.slug, trend);
    }
  }
  return [...bySlug.values()]
    .filter((trend) => trend.points.length >= 2 && !trend.mixed)
    .map(({ mixed: _mixed, ...trend }) => ({
      ...trend,
      improved: trend.points[trend.points.length - 1]!.value > trend.points[0]!.value,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildProgress(workouts: HistoryWorkout[], now: Date): Progress {
  const completed = workouts.filter(
    (workout): workout is HistoryWorkout & { completedAt: Date } =>
      workout.status === 'completed' && workout.completedAt !== null,
  );
  const within = (days: number) =>
    completed.filter((workout) => now.getTime() - workout.completedAt.getTime() < days * DAY_MS)
      .length;

  const muscles = new Map<string, { slug: string; name: string; completed: number }>();
  for (const workout of completed) {
    const entry = muscles.get(workout.muscle.slug) ?? { ...workout.muscle, completed: 0 };
    entry.completed += 1;
    muscles.set(workout.muscle.slug, entry);
  }

  return {
    completedLast7Days: within(7),
    completedLast28Days: within(28),
    weekStreak: weekStreak(
      completed.map((workout) => workout.completedAt),
      now,
    ),
    muscles: [...muscles.values()].sort(
      (left, right) => right.completed - left.completed || left.name.localeCompare(right.name),
    ),
    trends: exerciseTrends(completed),
  };
}
