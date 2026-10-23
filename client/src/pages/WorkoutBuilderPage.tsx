import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, useApi } from '../api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
} from '../components/Status';
import { PageNav } from '../components/PageNav';
import { WorkoutSummary } from '../components/WorkoutSummary';
import { labelDifficulty } from '../labels';
import { rememberDraft } from '../storage';
import type {
  BodyIntent,
  Difficulty,
  EquipmentCategory,
  ExperienceLevel,
  ItemResponse,
  ListResponse,
  MealSuggestionPick,
  MuscleGroup,
  TrainingGoal,
  WarmupStretch,
  WorkoutRecommendation,
  WorkoutPlan,
  WorkoutSlot,
} from '../types';
import { prescriptionError, toExercisePayload } from '../workout';

const equipmentOptions: { value: EquipmentCategory; label: string }[] = [
  { value: 'free_weight', label: 'Free weights' },
  { value: 'machine', label: 'Machines' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

const goalOptions: { value: TrainingGoal; label: string }[] = [
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'hypertrophy', label: 'Muscle growth' },
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
];

const lengthOptions: { value: 'full' | 'standard'; label: string }[] = [
  { value: 'full', label: 'Full session (90–120 minutes)' },
  { value: 'standard', label: 'Standard session' },
];

const experienceOptions: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const intentOptions: { value: '' | BodyIntent; label: string }[] = [
  { value: '', label: 'Either' },
  { value: 'cut', label: 'Cut' },
  { value: 'bulk', label: 'Bulk' },
];

function readIntent(value: string | null): '' | BodyIntent {
  return value === 'cut' || value === 'bulk' ? value : '';
}

function applyIntent(intent: BodyIntent): {
  goal: TrainingGoal;
  length: 'full' | 'standard';
} {
  if (intent === 'cut') {
    return { goal: 'strength', length: 'standard' };
  }
  return { goal: 'hypertrophy', length: 'full' };
}

type PrerequisiteExercise = {
  slug: string;
  name: string;
  difficulty: Difficulty;
};

type BuiltWorkout = {
  muscle: string;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  equipment: EquipmentCategory[];
  length: 'full' | 'standard';
  rationale: string;
  estimatedMinutes: number;
  rounds: number;
  warmups: WarmupStretch[];
  slots: WorkoutSlot[];
};

export function WorkoutBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMuscle = searchParams.get('muscle') ?? '';
  const initialIntent = readIntent(searchParams.get('intent'));
  const suggested = initialIntent ? applyIntent(initialIntent) : null;
  const muscles = useApi<ListResponse<MuscleGroup>>('/api/v1/muscles');
  const [muscle, setMuscle] = useState(requestedMuscle);
  const [intent, setIntent] = useState<'' | BodyIntent>(initialIntent);
  const [goal, setGoal] = useState<TrainingGoal>(suggested?.goal ?? 'general_fitness');
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [equipment, setEquipment] = useState<EquipmentCategory[]>([
    'free_weight',
    'machine',
    'bodyweight',
  ]);
  const [length, setLength] = useState<'full' | 'standard'>(suggested?.length ?? 'full');
  const [prerequisites, setPrerequisites] = useState<PrerequisiteExercise[] | null>(null);
  const [prerequisiteError, setPrerequisiteError] = useState<string | null>(null);
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestionPick[]>([]);
  const [built, setBuilt] = useState<BuiltWorkout | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const muscleData = muscles.status === 'ready' ? muscles.data : null;

  useEffect(() => {
    if (!muscleData) {
      return;
    }
    if (muscleData.data.some((item) => item.slug === muscle)) {
      return;
    }
    const requested = muscleData.data.find(
      (item) => item.slug === requestedMuscle,
    );
    setMuscle(requested?.slug ?? muscleData.data[0]?.slug ?? '');
  }, [muscle, muscleData, requestedMuscle]);

  useEffect(() => {
    if (!intent || experience === 'beginner' || !muscle) {
      setPrerequisites(null);
      setPrerequisiteError(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setPrerequisites(null);
    setPrerequisiteError(null);
    const params = new URLSearchParams({ muscle, goal, experience });
    fetch(`/api/v1/exercises/prerequisites?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
          data?: { exercises?: PrerequisiteExercise[] };
        } | null;
        if (!response.ok) {
          throw new Error(body?.error?.message ?? 'Could not load easier exercises.');
        }
        return body?.data?.exercises ?? [];
      })
      .then((exercises) => {
        if (active) {
          setPrerequisites(exercises);
        }
      })
      .catch((error: unknown) => {
        if (
          !active ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        setPrerequisiteError(
          error instanceof Error ? error.message : 'Could not load easier exercises.',
        );
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [intent, experience, muscle, goal]);

  useEffect(() => {
    if (!intent) {
      setMealSuggestions([]);
      return;
    }
    if (muscles.status !== 'ready') {
      return;
    }
    const controller = new AbortController();
    let active = true;
    setMealSuggestions([]);
    const loadSuggestions = async () => {
      let response = await fetch(`/api/v1/nutrition/recommendations?intent=${intent}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        response = await fetch(`/api/v1/nutrition/recommendations?intent=${intent}`, {
          signal: controller.signal,
        });
      }
      const body = (await response.json().catch(() => null)) as {
        data?: { suggestions?: MealSuggestionPick[] };
      } | null;
      if (!response.ok) {
        throw new Error('Could not load meal suggestions.');
      }
      return body?.data?.suggestions ?? [];
    };

    loadSuggestions()
      .then((suggestions) => {
        if (active) {
          setMealSuggestions(suggestions);
        }
      })
      .catch((error: unknown) => {
        if (
          !active ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        if (active) {
          setMealSuggestions([]);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [intent, muscles.status]);

  function clearBuilt() {
    setBuilt(null);
    setSaveError(null);
  }

  function chooseIntent(next: '' | BodyIntent) {
    clearBuilt();
    setIntent(next);
    if (next === 'cut' || next === 'bulk') {
      const applied = applyIntent(next);
      setGoal(applied.goal);
      setLength(applied.length);
    }
  }

  function toggleEquipment(category: EquipmentCategory) {
    clearBuilt();
    setEquipment((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : equipmentOptions
            .map((option) => option.value)
            .filter((value) => value === category || current.includes(value)),
    );
  }

  async function build() {
    if (!muscle || equipment.length === 0) {
      return;
    }
    setBuilding(true);
    setBuildError(null);
    setSaveError(null);
    const params = new URLSearchParams({
      muscle,
      goal,
      experience,
      equipment: equipment.join(','),
      length,
    });
    try {
      const response = await apiRequest<ItemResponse<WorkoutRecommendation>>(
        `/api/v1/workouts/recommendations?${params.toString()}`,
      );
      setBuilt({
        muscle,
        goal,
        experience,
        equipment,
        length,
        rationale: response.data.rationale,
        estimatedMinutes: response.data.estimatedMinutes ?? 0,
        rounds: response.data.rounds ?? 1,
        warmups: response.data.warmups ?? [],
        slots: response.data.exercises,
      });
    } catch (error) {
      setBuilt(null);
      setBuildError(
        error instanceof Error ? error.message : 'Could not build a workout.',
      );
    } finally {
      setBuilding(false);
    }
  }

  async function save() {
    if (!built || built.slots.length === 0) {
      return;
    }
    const message = prescriptionError(built.slots);
    if (message) {
      setSaveError(message);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const response = await apiRequest<ItemResponse<WorkoutPlan>>(
        '/api/v1/workouts',
        {
          method: 'POST',
          body: JSON.stringify({
            muscle: built.muscle,
            goal: built.goal,
            experience: built.experience,
            equipmentCategories: built.equipment,
            length: built.length,
            exercises: toExercisePayload(built.slots),
          }),
        },
      );
      rememberDraft(response.data.id);
      navigate(`/workouts/${response.data.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Could not save this workout.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageNav
        fallbackTo="/"
        links={[
          { to: '/muscles', label: 'Muscle groups' },
          { to: '/exercises', label: 'All exercises' },
        ]}
      />
      <PageIntro eyebrow="Workout builder" title="Build a workout">
        <p>
          Choose a muscle, a goal, your experience, and the equipment you have.
          The session trains that muscle, starts with a warm-up, and explains
          why those exercises were picked.
        </p>
      </PageIntro>
      {muscles.status === 'loading' ? (
        <LoadingState label="Loading muscle groups…" />
      ) : null}
      {muscles.status === 'error' ? (
        <ErrorState
          title="Could not load muscle groups"
          message={muscles.message}
          onRetry={muscles.retry}
        />
      ) : null}
      {muscles.status === 'ready' && muscles.data.data.length === 0 ? (
        <EmptyState
          title="No muscle groups yet"
          body="The catalogue has not been seeded. Load the seed data, then refresh this page."
        />
      ) : null}
      {muscles.status === 'ready' && muscles.data.data.length > 0 ? (
        <>
          <form
            className="mb-8 grid gap-4 rounded-2xl border border-line bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void build();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm font-semibold">
                Aim
                <select
                  value={intent}
                  onChange={(event) => chooseIntent(readIntent(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
                >
                  {intentOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Muscle
                <select
                  value={muscle}
                  onChange={(event) => {
                    clearBuilt();
                    setMuscle(event.target.value);
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
                >
                  {muscles.data.data.map((item) => (
                    <option key={item.id} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Goal
                <select
                  value={goal}
                  onChange={(event) => {
                    clearBuilt();
                    setGoal(event.target.value as TrainingGoal);
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
                >
                  {goalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Experience
                <select
                  value={experience}
                  onChange={(event) => {
                    clearBuilt();
                    setExperience(event.target.value as ExperienceLevel);
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
                >
                  {experienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Session length
                <select
                  value={length}
                  onChange={(event) => {
                    clearBuilt();
                    setLength(event.target.value as 'full' | 'standard');
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal"
                >
                  {lengthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold">
                Equipment you have
              </legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {equipmentOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <input
                      type="checkbox"
                      checked={equipment.includes(option.value)}
                      onChange={() => toggleEquipment(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {equipment.length === 0 ? (
                <p className="mt-2 text-sm text-danger">
                  Choose at least one equipment type.
                </p>
              ) : null}
            </fieldset>
            <div>
              <button
                type="submit"
                disabled={building || equipment.length === 0 || !muscle}
                className="rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent disabled:opacity-50"
              >
                {building ? 'Building…' : 'Build workout'}
              </button>
            </div>
          </form>
          {intent ? (
            <section className="mb-8 rounded-2xl border border-line bg-card p-5">
              <h2 className="font-display text-2xl font-semibold">
                {intent === 'cut' ? 'Cut' : 'Bulk'}
              </h2>
              <h3 className="mt-3 font-semibold">Suggestions</h3>
              <p className="mt-2 leading-7">
                {intent === 'cut'
                  ? 'Suggested session: strength, standard length.'
                  : 'Suggested session: muscle growth, full session.'}
              </p>
              <p className="mt-2 leading-7">
                Your experience is the difficulty of the exercises.
                {experience === 'beginner'
                  ? ' Suggested start: the exercises at this experience are the starting point. The warm-up comes first.'
                  : ' Be comfortable with the easier version of each pattern before the harder one.'}
              </p>
              {experience !== 'beginner' && prerequisiteError ? (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {prerequisiteError}
                </p>
              ) : null}
              {experience !== 'beginner' && prerequisites === null && !prerequisiteError ? (
                <p className="mt-3 text-sm text-muted">Loading easier exercises…</p>
              ) : null}
              {prerequisites && prerequisites.length === 0 ? (
                <p className="mt-3 leading-7">
                  No easier exercise is in the catalogue for this muscle and goal.
                </p>
              ) : null}
              {prerequisites && prerequisites.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {prerequisites.map((exercise, index) => (
                    <li key={exercise.slug}>
                      {index === 0 ? (
                        <span className="text-sm font-semibold">Suggested first </span>
                      ) : null}
                      <Link to={`/exercises/${exercise.slug}`} className="font-semibold">
                        {exercise.name}
                      </Link>
                      <span className="text-muted">
                        {' '}
                        · {labelDifficulty(exercise.difficulty)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {mealSuggestions.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {mealSuggestions.map((suggestion) => (
                    <li key={suggestion.slug}>
                      <Link
                        to={`/nutrition?intent=${intent}`}
                        className="font-semibold"
                      >
                        {suggestion.name}
                      </Link>
                      <p className="text-sm leading-6">{suggestion.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link
                to={`/nutrition?intent=${intent}`}
                className="mt-4 inline-block font-semibold"
              >
                {intent === 'cut' ? 'Cut meal ideas' : 'Bulk meal ideas'}
              </Link>
            </section>
          ) : null}
          {building ? <LoadingState label="Building a workout…" /> : null}
          {buildError ? (
            <ErrorState
              title="Could not build a workout"
              message={buildError}
              onRetry={() => void build()}
            />
          ) : null}
          {built && built.slots.length === 0 ? (
            <EmptyState title="No exercises match" body={built.rationale} />
          ) : null}
          {built && built.slots.length > 0 ? (
            <>
              <WorkoutSummary
                rationale={built.rationale}
                estimatedMinutes={built.estimatedMinutes}
                rounds={built.rounds}
                warmups={built.warmups}
                slots={built.slots}
                editable
                onChange={(slots) => setBuilt({ ...built, slots })}
              />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save workout'}
                </button>
                {saveError ? (
                  <p role="alert" className="text-sm text-danger">
                    {saveError}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}
