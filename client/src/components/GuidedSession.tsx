import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { ItemResponse, WorkoutPlan } from '../types';

type OpenSet = {
  round: number;
  exerciseIndex: number;
  setNumber: number;
};

function defaultReps(reps: string) {
  const match = /^(\d+)/.exec(reps);
  return match ? Number(match[1]) : 1;
}

function openSet(workout: WorkoutPlan): OpenSet | null {
  for (let round = 1; round <= workout.rounds; round += 1) {
    for (const [exerciseIndex, exercise] of workout.exercises.entries()) {
      for (let setNumber = 1; setNumber <= exercise.sets; setNumber += 1) {
        const done = (exercise.setLogs ?? []).some(
          (log) => log.round === round && log.setNumber === setNumber,
        );
        if (!done) {
          return { round, exerciseIndex, setNumber };
        }
      }
    }
  }
  return null;
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function GuidedSession({
  workout,
  onChange,
}: {
  workout: WorkoutPlan;
  onChange: (workout: WorkoutPlan) => void;
}) {
  const hasLogs = workout.exercises.some((exercise) => (exercise.setLogs ?? []).length > 0);
  const [warmupIndex, setWarmupIndex] = useState(0);
  const [pastWarmup, setPastWarmup] = useState(hasLogs || workout.warmups.length === 0);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [reps, setReps] = useState(1);
  const [weight, setWeight] = useState('');
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = openSet(workout);
  const exercise = current ? workout.exercises[current.exerciseIndex] : null;
  const suggestedWeight = exercise?.progression?.suggestedWeightKg;
  const exerciseId = exercise?.id;
  const exerciseReps = exercise?.reps;
  const round = current?.round;
  const setNumber = current?.setNumber;

  useEffect(() => {
    if (!exerciseId || round == null || setNumber == null) {
      return;
    }
    setReps(defaultReps(exerciseReps ?? '1'));
    setWeight(suggestedWeight == null ? '' : String(suggestedWeight));
  }, [exerciseId, exerciseReps, suggestedWeight, round, setNumber]);

  useEffect(() => {
    if (restSeconds === null) {
      return;
    }
    if (restSeconds <= 0) {
      setRestSeconds(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setRestSeconds((value) => (value === null ? null : value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [restSeconds]);

  if (workout.status === 'completed' || !current || !exercise) {
    const logs = workout.exercises.flatMap((item) => item.setLogs ?? []);
    return (
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-3xl font-semibold">Workout complete</h2>
        <p className="mt-3 leading-7">
          {logs.length === 1 ? '1 set is saved on this workout.' : `${logs.length} sets are saved on this workout.`}
        </p>
        <ul className="mt-4 space-y-2">
          {workout.exercises.map((item) =>
            item.progression?.outcome ? (
              <li key={item.id}>
                <span className="font-semibold">{item.exercise.name}. </span>
                {item.progression.outcome}
              </li>
            ) : null,
          )}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Stop if a movement caused pain. This session is general fitness education, not a medical assessment.
        </p>
      </section>
    );
  }

  if (!pastWarmup) {
    const warmup = workout.warmups[warmupIndex];
    if (!warmup) {
      return null;
    }
    const last = warmupIndex >= workout.warmups.length - 1;
    return (
      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="text-sm font-semibold text-accent">
          Warm-up {warmupIndex + 1} of {workout.warmups.length}
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold">{warmup.stretch.name}</h2>
        <p className="mt-3 text-sm font-semibold">{warmup.durationSeconds} seconds</p>
        <p className="mt-4 whitespace-pre-line leading-7">{warmup.stretch.instructions}</p>
        <button
          type="button"
          onClick={() => {
            if (last) {
              setPastWarmup(true);
              return;
            }
            setWarmupIndex((index) => index + 1);
          }}
          className="mt-6 rounded-full bg-accent px-5 py-2.5 font-semibold text-white"
        >
          {last ? 'Start exercises' : 'Next warm-up'}
        </button>
      </section>
    );
  }

  async function completeSet() {
    if (!current || !exercise) {
      return;
    }
    const weightKg = weight.trim() === '' ? null : Number(weight);
    if (weight.trim() !== '' && (!Number.isFinite(weightKg) || (weightKg ?? 0) <= 0)) {
      setError('Enter a weight in kilograms, or leave it blank.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const saved = await apiRequest<ItemResponse<WorkoutPlan>>(
        `/api/v1/workouts/${workout.id}/sets`,
        {
          method: 'POST',
          body: JSON.stringify({
            workoutExerciseId: exercise.id,
            round: current.round,
            setNumber: current.setNumber,
            repsCompleted: reps,
            weightKg,
          }),
        },
      );
      onChange(saved.data);
      const savedLine = saved.data.exercises.find((item) => item.id === exercise.id);
      setLastOutcome(savedLine?.progression?.outcome ?? null);
      if (saved.data.status !== 'completed') {
        setRestSeconds(exercise.restSeconds);
      }
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Could not save this set.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm font-semibold text-accent">
        Round {current.round} of {workout.rounds} · Set {current.setNumber} of {exercise.sets}
      </p>
      <h2 className="mt-2 font-display text-4xl font-semibold">{exercise.exercise.name}</h2>
      <p className="mt-3 text-sm">{exercise.reason}</p>
      <p className="mt-4 whitespace-pre-line leading-7">{exercise.exercise.instructions}</p>
      <p className="mt-4 text-sm text-muted">
        These instructions are the demonstration until a reviewed animation is available. Stop if the
        movement hurts.
      </p>
      {exercise.progression?.summary ? (
        <p className="mt-4 text-sm leading-6">{exercise.progression.summary}</p>
      ) : null}
      {lastOutcome ? <p className="mt-3 text-sm font-semibold">{lastOutcome}</p> : null}
      {restSeconds !== null ? (
        <div className="mt-6">
          <p className="font-display text-5xl font-semibold">{formatClock(restSeconds)}</p>
          <p className="mt-2 text-sm font-semibold">Rest before the next set.</p>
          <button
            type="button"
            onClick={() => setRestSeconds(null)}
            className="mt-4 rounded-full border border-line bg-paper px-5 py-2.5 font-semibold"
          >
            Skip rest
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-[10rem_10rem_auto] sm:items-end">
          <label className="block text-sm font-semibold">
            Clean reps
            <input
              type="number"
              min={0}
              max={100}
              value={reps}
              onChange={(event) => setReps(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Weight (kg)
            <input
              type="number"
              min={0}
              step="0.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => void completeSet()}
            className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Complete set'}
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
