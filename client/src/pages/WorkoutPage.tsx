import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, useApi } from '../api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
} from '../components/Status';
import { GuidedSession } from '../components/GuidedSession';
import { PageNav } from '../components/PageNav';
import { WorkoutSummary } from '../components/WorkoutSummary';
import { labelEquipmentCategory, labelExperience, labelGoal } from '../labels';
import type {
  ItemResponse,
  WorkoutPlan,
  WorkoutSlot,
  WorkoutStatus,
} from '../types';
import { prescriptionError, toExercisePayload } from '../workout';

export function WorkoutPage() {
  const { id = '' } = useParams();
  const remote = useApi<ItemResponse<WorkoutPlan>>(`/api/v1/workouts/${id}`);
  const workout = remote.status === 'ready' ? remote.data.data : null;
  const [local, setLocal] = useState<{
    id: string;
    status: WorkoutStatus;
    slots: WorkoutSlot[];
    plan: WorkoutPlan;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!workout) {
      return;
    }
    setLocal({
      id: workout.id,
      status: workout.status,
      slots: workout.exercises,
      plan: workout,
    });
  }, [workout]);

  async function persist(andStart: boolean) {
    if (!workout || !local) {
      return;
    }
    const message = prescriptionError(local.slots);
    if (message) {
      setActionError(message);
      return;
    }
    setPending(true);
    setActionError(null);
    try {
      const saved = await apiRequest<ItemResponse<WorkoutPlan>>(
        `/api/v1/workouts/${workout.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ exercises: toExercisePayload(local.slots) }),
        },
      );
      const next = andStart
        ? await apiRequest<ItemResponse<WorkoutPlan>>(
            `/api/v1/workouts/${workout.id}/start`,
            {
              method: 'POST',
            },
          )
        : saved;
      setLocal({
        id: next.data.id,
        status: next.data.status,
        slots: next.data.exercises,
        plan: next.data,
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could not update this workout.',
      );
    } finally {
      setPending(false);
    }
  }

  if (
    remote.status === 'loading' ||
    (remote.status === 'ready' && local?.id !== workout?.id)
  ) {
    return <LoadingState label="Loading workout…" />;
  }

  if (remote.status === 'error') {
    return (
      <ErrorState
        title={
          remote.statusCode === 404
            ? 'Workout not found'
            : 'Could not load this workout'
        }
        message={remote.message}
        onRetry={remote.retry}
      />
    );
  }

  if (!workout || !local) {
    return <LoadingState label="Loading workout…" />;
  }

  const started = local.status === 'started' || local.status === 'completed';
  const warmups = workout.warmups.map((item) => item.stretch);

  return (
    <>
      <PageNav
        fallbackTo="/"
        links={[
          { to: `/exercises?muscle=${workout.muscle.slug}`, label: `${workout.muscle.name} exercises` },
          { to: '/workouts/new', label: 'Build another' },
          { to: '/nutrition', label: 'Meal ideas' },
        ]}
      />
      <PageIntro
        eyebrow={
          local.status === 'completed'
            ? 'Completed workout'
            : started
              ? 'Started workout'
              : 'Saved workout'
        }
        title={`${workout.muscle.name} workout`}
      >
        <p>
          {labelGoal(workout.goal)} · {labelExperience(workout.experience)} ·{' '}
          {workout.equipmentCategories
            .map((category) => labelEquipmentCategory(category))
            .join(', ')}
        </p>
      </PageIntro>
      {local.slots.length === 0 ? (
        <EmptyState
          title="This workout has no exercises"
          body={workout.rationale}
        />
      ) : (
        <>
          {started ? (
            <GuidedSession
              workout={local.plan}
              onChange={(plan) =>
                setLocal({
                  id: plan.id,
                  status: plan.status,
                  slots: plan.exercises,
                  plan,
                })
              }
            />
          ) : (
            <WorkoutSummary
              rationale={workout.rationale}
              estimatedMinutes={workout.estimatedMinutes}
              rounds={workout.rounds}
              warmups={warmups}
              slots={local.slots}
              editable
              onChange={(slots) => setLocal({ ...local, slots })}
            />
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {local.status === 'completed' ? (
              <Link
                to="/history"
                className="rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent"
              >
                View history
              </Link>
            ) : null}
            {started ? null : (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void persist(false)}
                  className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold disabled:opacity-50"
                >
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void persist(true)}
                  className="rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent disabled:opacity-50"
                >
                  Start workout
                </button>
              </>
            )}
            {actionError ? (
              <p role="alert" className="text-sm text-danger">
                {actionError}
              </p>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
