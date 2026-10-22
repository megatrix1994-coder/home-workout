import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../api';
import { labelDifficulty, labelEquipmentCategory, labelGoal, labelRegion, labelRole } from '../labels';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import type {
  Difficulty,
  EquipmentCategory,
  ExerciseSummary,
  ListResponse,
  MuscleGroup,
  TrainingGoal,
} from '../types';

const PAGE_SIZE = 100;

const categories: { value: '' | EquipmentCategory; label: string }[] = [
  { value: '', label: 'All equipment' },
  { value: 'free_weight', label: 'Free weights' },
  { value: 'machine', label: 'Machines' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

const difficulties: { value: '' | Difficulty; label: string }[] = [
  { value: '', label: 'All difficulties' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const goals: { value: '' | TrainingGoal; label: string }[] = [
  { value: '', label: 'All goals' },
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Muscle growth' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'endurance', label: 'Endurance' },
];

function rangeLabel(offset: number, count: number, total: number) {
  const noun = total === 1 ? 'exercise' : 'exercises';
  if (count === 0 || total === 0) {
    return `0 ${noun}`;
  }
  return `${offset + 1}–${offset + count} of ${total} ${noun}`;
}

export function ExercisesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const muscle = params.get('muscle') ?? '';
  const equipment = params.get('equipment') ?? '';
  const difficulty = params.get('difficulty') ?? '';
  const goal = params.get('goal') ?? '';
  const offset = Number(params.get('offset') ?? '0') || 0;
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  const query = new URLSearchParams();
  query.set('limit', String(PAGE_SIZE));
  if (offset > 0) query.set('offset', String(offset));
  if (search) query.set('search', search);
  if (muscle) query.set('muscle', muscle);
  if (equipment) query.set('equipmentCategory', equipment);
  if (difficulty) query.set('difficulty', difficulty);
  if (goal) query.set('goal', goal);
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
    next.delete('offset');
    setParams(next);
  }

  function setOffset(nextOffset: number) {
    const next = new URLSearchParams(params);
    if (nextOffset > 0) {
      next.set('offset', String(nextOffset));
    } else {
      next.delete('offset');
    }
    setParams(next);
  }

  return (
    <>
      <PageIntro eyebrow="Library" title="Exercises">
        <p>
          Search by name, or narrow the list to a muscle group, a goal, a difficulty, and the
          equipment you have.
        </p>
      </PageIntro>
      <form
        className="mb-8 grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-2 xl:grid-cols-3"
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
        <label className="block text-sm font-semibold">
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => updateParam('difficulty', event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
          >
            {difficulties.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Goal
          <select
            value={goal}
            onChange={(event) => updateParam('goal', event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
          >
            {goals.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {rangeLabel(
                offset,
                exercises.data.data.length,
                exercises.data.meta?.total ?? exercises.data.data.length,
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset <= 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  offset + exercises.data.data.length >=
                  (exercises.data.meta?.total ?? exercises.data.data.length)
                }
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
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
                      {exercise.goals[0] ? ` · ${labelGoal(exercise.goals[0])}` : ''}
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
                    {exercise.region ? ` · ${labelRegion(exercise.region)}` : ''}
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
