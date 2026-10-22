import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, useApi } from '../api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
} from '../components/Status';
import { WorkoutSummary } from '../components/WorkoutSummary';
import { LAST_WORKOUT_KEY } from '../storage';
import type {
  EquipmentCategory,
  ExperienceLevel,
  ItemResponse,
  ListResponse,
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
  const muscles = useApi<ListResponse<MuscleGroup>>('/api/v1/muscles');
  const [muscle, setMuscle] = useState(requestedMuscle);
  const [goal, setGoal] = useState<TrainingGoal>('general_fitness');
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [equipment, setEquipment] = useState<EquipmentCategory[]>([
    'free_weight',
    'machine',
    'bodyweight',
  ]);
  const [length, setLength] = useState<'full' | 'standard'>('full');
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

  function clearBuilt() {
    setBuilt(null);
    setSaveError(null);
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
      localStorage.setItem(LAST_WORKOUT_KEY, response.data.id);
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
                className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {building ? 'Building…' : 'Build workout'}
              </button>
            </div>
          </form>
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
                  className="rounded-full bg-ink px-5 py-2.5 font-semibold text-paper disabled:opacity-50"
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
