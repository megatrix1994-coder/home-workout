import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { labelDifficulty, labelEquipmentCategory, labelMovement, labelRole } from '../labels';
import { ErrorState, LoadingState } from '../components/Status';
import type { ExerciseDetail, ItemResponse } from '../types';

export function ExerciseDetailPage() {
  const { slug = '' } = useParams();
  const state = useApi<ItemResponse<ExerciseDetail>>(`/api/v1/exercises/${slug}`);

  if (state.status === 'loading') {
    return <LoadingState label="Loading exercise…" />;
  }

  if (state.status === 'error') {
    return (
      <ErrorState
        title={state.statusCode === 404 ? 'Exercise not found' : 'Could not load this exercise'}
        message={state.message}
        onRetry={state.retry}
      />
    );
  }

  const exercise = state.data.data;

  return (
    <article>
      <Link to="/exercises" className="text-sm font-semibold text-accent">
        All exercises
      </Link>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
        {labelDifficulty(exercise.difficulty)} · {labelMovement(exercise.movementType)}
      </p>
      <h1 className="mt-2 font-display text-5xl font-semibold leading-none">{exercise.name}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{exercise.description}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Equipment</h2>
          <ul className="mt-3 space-y-2">
            {exercise.equipment.map((item) => (
              <li key={item.slug}>
                {item.name}{' '}
                <span className="text-muted">({labelEquipmentCategory(item.category)})</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Target muscles</h2>
          <ul className="mt-3 space-y-2">
            {exercise.muscles.map((muscle) => (
              <li key={muscle.slug}>
                <Link to={`/exercises?muscle=${muscle.slug}`} className="font-semibold">
                  {muscle.name}
                </Link>{' '}
                <span className="text-muted">({labelRole(muscle.role)})</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-line bg-card p-5">
        <h2 className="font-display text-2xl font-semibold">Instructions</h2>
        <p className="mt-3 whitespace-pre-line leading-7">{exercise.instructions}</p>
        <p className="mt-4 text-sm text-muted">
          These instructions are general fitness education, not a medical assessment. Stop if a
          movement causes pain.
        </p>
      </section>
    </article>
  );
}
