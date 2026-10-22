import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Demonstration } from './Demonstration';
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

function FinishedOutcomes({
  workout,
  currentExerciseId,
}: {
  workout: WorkoutPlan;
  currentExerciseId: string;
}) {
  const finished = workout.exercises.filter(
    (item) => item.id !== currentExerciseId && item.progression?.outcome,
  );
  if (finished.length === 0) {
    return null;
  }
  return (
    <ul className="mt-4 space-y-2">
      {finished.map((item) => (
        <li key={item.id}>
          <span className="font-semibold">{item.exercise.name}. </span>
          {item.progression?.outcome}
        </li>
      ))}
    </ul>
  );
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

type StoredRest = {
  endsAt: number;
  exerciseId: string;
  round: number;
  setNumber: number;
};

function restStorageKey(workoutId: string) {
  return `home-workout:rest:${workoutId}`;
}

function readStoredRest(workoutId: string): StoredRest | null {
  const raw = sessionStorage.getItem(restStorageKey(workoutId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredRest;
    if (
      typeof parsed.endsAt !== 'number' ||
      typeof parsed.exerciseId !== 'string' ||
      typeof parsed.round !== 'number' ||
      typeof parsed.setNumber !== 'number'
    ) {
      sessionStorage.removeItem(restStorageKey(workoutId));
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(restStorageKey(workoutId));
    return null;
  }
}

function writeStoredRest(workoutId: string, rest: StoredRest) {
  sessionStorage.setItem(restStorageKey(workoutId), JSON.stringify(rest));
}

function clearStoredRest(workoutId: string) {
  sessionStorage.removeItem(restStorageKey(workoutId));
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
  const [warmupSeconds, setWarmupSeconds] = useState(
    () => workout.warmups[0]?.durationSeconds ?? 0,
  );
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [reps, setReps] = useState(1);
  const [weight, setWeight] = useState('');
  const [lastOutcome, setLastOutcome] = useState<{ id: string; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = openSet(workout);
  const exercise = current ? workout.exercises[current.exerciseIndex] : null;
  const suggestedWeight = exercise?.progression?.suggestedWeightKg;
  const exerciseId = exercise?.id;
  const exerciseReps = exercise?.reps;
  const round = current?.round;
  const setNumber = current?.setNumber;
  const warmupDuration = workout.warmups[warmupIndex]?.durationSeconds ?? 0;
  const pendingCooldown =
    workout.status === 'completed'
      ? (workout.cooldowns ?? []).find((item) => item.status === 'pending') ?? null
      : null;
  const cooldownId = pendingCooldown?.id;
  const cooldownStretchId = pendingCooldown?.stretch.id;
  const cooldownDuration = pendingCooldown?.durationSeconds ?? 0;
  const [cooldownSeconds, setCooldownSeconds] = useState(cooldownDuration);

  useEffect(() => {
    if (pastWarmup) {
      return;
    }
    setWarmupSeconds(warmupDuration);
  }, [pastWarmup, warmupIndex, warmupDuration]);

  useEffect(() => {
    if (pastWarmup || warmupSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setWarmupSeconds((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [pastWarmup, warmupSeconds]);

  useEffect(() => {
    if (!exerciseId || round == null || setNumber == null) {
      return;
    }
    setReps(defaultReps(exerciseReps ?? '1'));
    setWeight(suggestedWeight == null ? '' : String(suggestedWeight));
  }, [exerciseId, exerciseReps, suggestedWeight, round, setNumber]);

  useEffect(() => {
    setLastOutcome((currentOutcome) =>
      currentOutcome?.id === exerciseId ? currentOutcome : null,
    );
  }, [exerciseId]);

  useEffect(() => {
    if (!exerciseId || round == null || setNumber == null) {
      return;
    }
    const stored = readStoredRest(workout.id);
    if (
      !stored ||
      stored.exerciseId !== exerciseId ||
      stored.round !== round ||
      stored.setNumber !== setNumber
    ) {
      return;
    }
    const remaining = Math.ceil((stored.endsAt - Date.now()) / 1000);
    if (remaining > 0) {
      setRestSeconds(remaining);
      return;
    }
    clearStoredRest(workout.id);
  }, [workout.id, exerciseId, round, setNumber]);

  useEffect(() => {
    if (restSeconds === null) {
      return;
    }
    if (restSeconds <= 0) {
      clearStoredRest(workout.id);
      setRestSeconds(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setRestSeconds((value) => (value === null ? null : value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [restSeconds, workout.id]);

  useEffect(() => {
    setCooldownSeconds(cooldownDuration);
  }, [cooldownId, cooldownStretchId, cooldownDuration]);

  useEffect(() => {
    if (!cooldownId || cooldownSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldownSeconds((value) => (value <= 0 ? 0 : value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownId, cooldownSeconds]);

  async function updateCooldown(body: {
    durationSeconds?: number;
    status?: 'completed' | 'skipped';
    replace?: true;
  }) {
    if (!pendingCooldown) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const saved = await apiRequest<ItemResponse<WorkoutPlan>>(
        `/api/v1/workouts/${workout.id}/cooldowns/${pendingCooldown.id}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      );
      onChange(saved.data);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Could not update this stretch.');
    } finally {
      setPending(false);
    }
  }

  if (pendingCooldown) {
    const easier = pendingCooldown.stretch.slug.endsWith('-gentle');
    return (
      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="text-sm font-semibold text-accent">Cooldown · {pendingCooldown.muscle.name}</p>
        <h2 className="mt-2 font-display text-4xl font-semibold">{pendingCooldown.stretch.name}</h2>
        <p className="mt-3 font-display text-5xl font-semibold">{formatClock(cooldownSeconds)}</p>
        <Demonstration
          instructions={pendingCooldown.stretch.instructions}
          animations={pendingCooldown.stretch.animations}
        />
        <p className="mt-4 text-sm text-muted">Stop if the stretch hurts.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending || pendingCooldown.durationSeconds <= 20}
            onClick={() =>
              void updateCooldown({
                durationSeconds: Math.max(20, pendingCooldown.durationSeconds - 10),
              })
            }
            className="rounded-full border border-line bg-paper px-5 py-2.5 font-semibold disabled:opacity-50"
          >
            Shorter hold
          </button>
          <button
            type="button"
            disabled={pending || pendingCooldown.durationSeconds >= 90}
            onClick={() =>
              void updateCooldown({
                durationSeconds: Math.min(90, pendingCooldown.durationSeconds + 10),
              })
            }
            className="rounded-full border border-line bg-paper px-5 py-2.5 font-semibold disabled:opacity-50"
          >
            Longer hold
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void updateCooldown({ replace: true })}
            className="rounded-full border border-line bg-paper px-5 py-2.5 font-semibold disabled:opacity-50"
          >
            {easier ? 'Use an easier stretch' : 'Use the first stretch'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void updateCooldown({ status: 'skipped' })}
            className="rounded-full border border-line bg-paper px-5 py-2.5 font-semibold disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void updateCooldown({ status: 'completed' })}
            className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            Done
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

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
        {workout.status === 'completed' ? (
          <p className="mt-3 text-sm text-muted">
            Stretching is one part of recovery. It does not prevent injury or remove soreness.
          </p>
        ) : null}
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
        <p className="mt-3 font-display text-5xl font-semibold">{formatClock(warmupSeconds)}</p>
        <p className="mt-4 whitespace-pre-line leading-7">{warmup.stretch.instructions}</p>
        <button
          type="button"
          onClick={() => {
            if (last) {
              setPastWarmup(true);
              return;
            }
            const next = warmupIndex + 1;
            setWarmupIndex(next);
            setWarmupSeconds(workout.warmups[next]?.durationSeconds ?? 0);
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
      const outcome = savedLine?.progression?.outcome;
      setLastOutcome(outcome ? { id: exercise.id, text: outcome } : null);
      const next = saved.data.status === 'completed' ? null : openSet(saved.data);
      if (next) {
        const nextExercise = saved.data.exercises[next.exerciseIndex];
        writeStoredRest(workout.id, {
          endsAt: Date.now() + exercise.restSeconds * 1000,
          exerciseId: nextExercise?.id ?? exercise.id,
          round: next.round,
          setNumber: next.setNumber,
        });
        setRestSeconds(exercise.restSeconds);
      } else {
        clearStoredRest(workout.id);
      }
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Could not save this set.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <section className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm font-semibold text-accent">
        Round {current.round} of {workout.rounds} · Set {current.setNumber} of {exercise.sets}
      </p>
      <h2 className="mt-2 font-display text-4xl font-semibold">{exercise.exercise.name}</h2>
      <p className="mt-3 text-sm">{exercise.reason}</p>
      <Demonstration
        instructions={exercise.exercise.instructions}
        animations={exercise.exercise.animations}
      />
      <p className="mt-4 text-sm text-muted">Stop if the movement hurts.</p>
      {exercise.progression?.summary ? (
        <p className="mt-4 text-sm leading-6">{exercise.progression.summary}</p>
      ) : null}
      {lastOutcome?.id === exercise.id ? (
        <p className="mt-3 text-sm font-semibold">{lastOutcome.text}</p>
      ) : null}
      {restSeconds !== null ? (
        <div className="mt-6">
          <p className="font-display text-5xl font-semibold">{formatClock(restSeconds)}</p>
          <p className="mt-2 text-sm font-semibold">Rest before the next set.</p>
          <button
            type="button"
            onClick={() => {
              clearStoredRest(workout.id);
              setRestSeconds(null);
            }}
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
    <FinishedOutcomes workout={workout} currentExerciseId={exercise.id} />
  </>
  );
}
