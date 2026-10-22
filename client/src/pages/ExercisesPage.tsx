import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../api';
import { labelDifficulty, labelEquipmentCategory, labelRole } from '../labels';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import type { EquipmentCategory, ExerciseSummary, ListResponse, MuscleGroup } from '../types';

const categories: { value: '' | EquipmentCategory; label: string }[] = [
  { value: '', label: 'All equipment' },
  { value: 'free_weight', label: 'Free weights' },
  { value: 'machine', label: 'Machines' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

export function ExercisesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const muscle = params.get('muscle') ?? '';
  const equipment = params.get('equipment') ?? '';
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (muscle) query.set('muscle', muscle);
  if (equipment) query.set('equipmentCategory', equipment);
  const queryString = query.toString();
  const exercisePath = `/api/v1/exercises${queryString ? `?${queryString}` : ''}`;

  const exercises = useApi<ListResponse<ExerciseSummary>>(exercisePath);
  const muscles = useApi<ListResponse<MuscleGroup>>('/api/v1/muscles');

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next);
  }

  return (
    <>
      <PageIntro eyebrow="Library" title="Exercises">
        <p>Search by name, or narrow the list to a muscle group and the equipment you have.</p>
      </PageIntro>
      <form
        className="mb-8 grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-[1fr_14rem_14rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          updateParam('search', searchDraft.trim());
        }}
      >
        <label className="block text-sm font-semibold">
          Search
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
            placeholder="Try row, squat, or press"
          />
        </label>
        <label className="block text-sm font-semibold">
          Muscle
          <select
            value={muscle}
            onChange={(event) => updateParam('muscle', event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
          >
            <option value="">All muscles</option>
            {muscles.status === 'ready'
              ? muscles.data.data.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))
              : null}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Equipment
          <select
            value={equipment}
            onChange={(event) => updateParam('equipment', event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
          >
            {categories.map((category) => (
              <option key={category.label} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      {exercises.status === 'loading' ? <LoadingState label="Loading exercises…" /> : null}
      {exercises.status === 'error' ? (
        <ErrorState
          title="Could not load exercises"
          message={exercises.message}
          onRetry={exercises.retry}
        />
      ) : null}
      {exercises.status === 'ready' && exercises.data.data.length === 0 ? (
        <EmptyState
          title="No exercises match"
          body="Try another muscle, a different equipment type, or a shorter search."
        />
      ) : null}
      {exercises.status === 'ready' && exercises.data.data.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted">
            {exercises.data.meta?.total ?? exercises.data.data.length}{' '}
            {(exercises.data.meta?.total ?? exercises.data.data.length) === 1
              ? 'exercise'
              : 'exercises'}
          </p>
          <ul className="grid gap-3">
            {exercises.data.data.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  to={`/exercises/${exercise.slug}`}
                  className="block rounded-2xl border border-line bg-card p-5 hover:border-accent"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-3xl font-semibold">{exercise.name}</h2>
                    <span className="text-sm font-semibold text-accent">
                      {labelDifficulty(exercise.difficulty)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Equipment: </span>
                    {exercise.equipment
                      .map((item) => `${item.name} (${labelEquipmentCategory(item.category)})`)
                      .join(', ')}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Muscles: </span>
                    {exercise.muscles
                      .map((item) => `${item.name} (${labelRole(item.role)})`)
                      .join(', ')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
