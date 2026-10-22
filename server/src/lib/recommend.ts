import { equipmentCategories } from './exercise-query.js';

export const trainingGoals = [
  'strength',
  'hypertrophy',
  'general_fitness',
  'endurance',
] as const;
export const experienceLevels = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

export type TrainingGoal = (typeof trainingGoals)[number];
export const sessionLengths = ['full', 'standard'] as const;
export type SessionLength = (typeof sessionLengths)[number];
export type ExperienceLevel = (typeof experienceLevels)[number];
export type EquipmentCategory = (typeof equipmentCategories)[number];
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MovementType = 'compound' | 'isolation' | 'isometric';
export type MuscleRole = 'primary' | 'secondary';

export type Candidate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  instructions: string;
  difficulty: Difficulty;
  movementType: MovementType;
  region: string;
  goals: TrainingGoal[];
  muscles: { slug: string; name: string; role: MuscleRole }[];
  equipment: { slug: string; name: string; category: EquipmentCategory }[];
};

export type RecommendationInput = {
  muscleSlug: string;
  muscleName: string;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  equipmentCategories: EquipmentCategory[];
};

export type Alternative = {
  exercise: Candidate;
  reason: string;
};

export type RecommendedExercise = {
  exercise: Candidate;
  sets: number;
  reps: string;
  restSeconds: number;
  reason: string;
  alternatives: Alternative[];
};

export type Recommendation = {
  rationale: string;
  rounds: number;
  estimatedMinutes: number;
  exercises: RecommendedExercise[];
};

const ALTERNATIVE_LIMIT = 5;
const SESSION_MIN_SECONDS = 90 * 60;
const SESSION_MAX_SECONDS = 120 * 60;
const WORK_SECONDS = 45;
const EXERCISE_TRANSITION_SECONDS = 60;
const ROUND_BREAK_SECONDS = 180;
const MAX_ROUNDS = 3;
const MAX_REST_SECONDS = 180;
const MIN_SETS = 2;
const REST_STEP_SECONDS = 15;

const difficultyRank: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const movementOrder: Record<MovementType, number> = {
  compound: 0,
  isolation: 1,
  isometric: 2,
};

const movementScore: Record<TrainingGoal, Record<MovementType, number>> = {
  strength: { compound: 3, isolation: 0, isometric: 1 },
  hypertrophy: { compound: 2, isolation: 2, isometric: 1 },
  general_fitness: { compound: 2, isolation: 1, isometric: 1 },
  endurance: { compound: 1, isolation: 2, isometric: 2 },
};

const prescription: Record<
  TrainingGoal,
  { sets: number; reps: string; restSeconds: number }
> = {
  strength: { sets: 4, reps: '5', restSeconds: 150 },
  hypertrophy: { sets: 3, reps: '8-12', restSeconds: 75 },
  general_fitness: { sets: 3, reps: '10', restSeconds: 60 },
  endurance: { sets: 3, reps: '15', restSeconds: 45 },
};

const goalPhrase: Record<TrainingGoal, string> = {
  strength: 'strength',
  hypertrophy: 'muscle growth',
  general_fitness: 'general fitness',
  endurance: 'endurance',
};

const experiencePhrase: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const equipmentPhrase: Record<EquipmentCategory, string> = {
  free_weight: 'free weights',
  machine: 'machines',
  bodyweight: 'bodyweight',
};

const difficultyPhrase: Record<Difficulty, string> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

const movementPhrase: Record<MovementType, string> = {
  compound: 'compound',
  isolation: 'isolation',
  isometric: 'isometric',
};

const guidance =
  'These are general training rules, not a claim that this session is best for every person, and not a claim that every part of the muscle is fully developed.';

const regionLabels: Record<string, string> = {
  mid: 'Middle chest',
  upper: 'Upper chest',
  lower: 'Lower chest',
  pecs: 'Pecs',
  lats: 'Lats',
  'mid-back': 'Mid-back',
  'upper-back': 'Upper back',
  'lower-back': 'Lower back',
  overall: 'Overall curl',
  'short-head': 'Short head',
  'long-head': 'Long head',
  brachialis: 'Brachialis',
  'lateral-head': 'Lateral head',
  'medial-head': 'Medial head',
  flexors: 'Flexors',
  extensors: 'Extensors',
  squat: 'Squat',
  'single-leg': 'Single-leg',
  'knee-extension': 'Knee extension',
  'hip-hinge': 'Hip hinge',
  'knee-flexion': 'Knee flexion',
  thrust: 'Thrust',
  kickback: 'Kickback',
  standing: 'Standing',
  seated: 'Seated',
  'front-delt': 'Front',
  'side-delt': 'Side',
  'rear-delt': 'Rear',
  abdominals: 'Front',
  obliques: 'Obliques',
  brace: 'Brace',
};

export function labelRegion(region: string): string {
  return regionLabels[region] ?? region;
}

export function canonicalEquipment(
  categories: readonly EquipmentCategory[],
): EquipmentCategory[] {
  return equipmentCategories.filter((category) =>
    categories.includes(category),
  );
}

export function unknownMuscleRationale(): string {
  return `No muscle group matches this request. Choose a muscle from the catalogue. ${guidance}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function equipmentList(categories: readonly EquipmentCategory[]): string {
  return joinList(
    canonicalEquipment(categories).map((category) => equipmentPhrase[category]),
  );
}

export function isEligible(
  exercise: Candidate,
  muscleSlug: string,
  allowed: readonly EquipmentCategory[],
): boolean {
  const trainsMuscle = exercise.muscles.some(
    (muscle) => muscle.role === 'primary' && muscle.slug === muscleSlug,
  );
  if (!trainsMuscle || exercise.equipment.length === 0) {
    return false;
  }
  const permitted = new Set(allowed);
  return exercise.equipment.every((item) => permitted.has(item.category));
}

export function exerciseReason(
  exercise: Candidate,
  muscleName: string,
): string {
  const categories = exercise.equipment.map((item) => item.category);
  const article = exercise.difficulty === 'beginner' ? 'a' : 'an';
  const goal = exercise.goals[0];
  const goalText = goal ? `${goalPhrase[goal]} ` : '';
  return `${exercise.name} is ${article} ${difficultyPhrase[exercise.difficulty]} ${goalText}${movementPhrase[exercise.movementType]} for ${muscleName} and matches your ${equipmentList(categories)}.`;
}

function difficultyBonus(
  difficulty: Difficulty,
  experience: ExperienceLevel,
): number {
  const gap = difficultyRank[experience] - difficultyRank[difficulty];
  if (gap === 0) {
    return 2;
  }
  if (gap === 1) {
    return 1;
  }
  return 0;
}

function score(exercise: Candidate, input: RecommendationInput): number {
  return (
    movementScore[input.goal][exercise.movementType] +
    difficultyBonus(exercise.difficulty, input.experience)
  );
}

function byRank(input: RecommendationInput) {
  return (left: Candidate, right: Candidate) => {
    const delta = score(right, input) - score(left, input);
    if (delta !== 0) {
      return delta;
    }
    return left.slug.localeCompare(right.slug);
  };
}

function byDisplay(left: Candidate, right: Candidate) {
  const delta =
    movementOrder[left.movementType] - movementOrder[right.movementType];
  if (delta !== 0) {
    return delta;
  }
  return left.slug.localeCompare(right.slug);
}

function selectByRegion(ranked: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const exercise of ranked) {
    if (!best.has(exercise.region)) {
      best.set(exercise.region, exercise);
    }
  }
  return [...best.values()].sort(byDisplay);
}

function knownRegions(candidates: Candidate[], muscleSlug: string): string[] {
  const regions = new Set<string>();
  for (const exercise of candidates) {
    const trainsMuscle = exercise.muscles.some(
      (muscle) => muscle.role === 'primary' && muscle.slug === muscleSlug,
    );
    if (trainsMuscle && exercise.region) {
      regions.add(exercise.region);
    }
  }
  return [...regions].sort((left, right) =>
    labelRegion(left).localeCompare(labelRegion(right)),
  );
}

function coverageNote(selected: Candidate[], missing: string[]): string {
  const included = joinList(selected.map((exercise) => labelRegion(exercise.region)));
  const covered = included ? `It includes ${included}.` : '';
  const leftOut =
    missing.length > 0
      ? `${joinList(missing.map((region) => labelRegion(region)))} ${missing.length === 1 ? 'has' : 'have'} no match for this equipment.`
      : '';
  return [covered, leftOut].filter(Boolean).join(' ');
}

type RegionShift = 'harder' | 'easier' | null;

type RegionPick = {
  exercise: Candidate;
  goalGap: boolean;
  shift: RegionShift;
};

function pickRegion(options: Candidate[], input: RecommendationInput): RegionPick {
  const ceiling = difficultyRank[input.experience];
  const exact = options.filter(
    (exercise) =>
      exercise.difficulty === input.experience && exercise.goals.includes(input.goal),
  );
  if (exact.length > 0) {
    return {
      exercise: [...exact].sort(byRank(input))[0]!,
      goalGap: false,
      shift: null,
    };
  }

  const sameDifficulty = options.filter(
    (exercise) => exercise.difficulty === input.experience,
  );
  if (sameDifficulty.length > 0) {
    return {
      exercise: [...sameDifficulty].sort(byRank(input))[0]!,
      goalGap: true,
      shift: null,
    };
  }

  const sameGoal = options.filter((exercise) => exercise.goals.includes(input.goal));
  if (sameGoal.length > 0) {
    const nearest = [...sameGoal].sort((left, right) => {
      const gap =
        Math.abs(difficultyRank[left.difficulty] - ceiling) -
        Math.abs(difficultyRank[right.difficulty] - ceiling);
      if (gap !== 0) {
        return gap;
      }
      const easier = difficultyRank[left.difficulty] - difficultyRank[right.difficulty];
      if (easier !== 0) {
        return easier;
      }
      return left.slug.localeCompare(right.slug);
    })[0]!;
    return {
      exercise: nearest,
      goalGap: false,
      shift: difficultyRank[nearest.difficulty] > ceiling ? 'harder' : 'easier',
    };
  }

  const any = [...options].sort((left, right) => {
    const gap =
      Math.abs(difficultyRank[left.difficulty] - ceiling) -
      Math.abs(difficultyRank[right.difficulty] - ceiling);
    if (gap !== 0) {
      return gap;
    }
    return byRank(input)(left, right);
  })[0]!;
  return {
    exercise: any,
    goalGap: !any.goals.includes(input.goal),
    shift:
      difficultyRank[any.difficulty] === ceiling
        ? null
        : difficultyRank[any.difficulty] > ceiling
          ? 'harder'
          : 'easier',
  };
}

function partList(regions: string[]): string {
  return joinList(
    [...regions]
      .sort((left, right) => labelRegion(left).localeCompare(labelRegion(right)))
      .map((region) => labelRegion(region)),
  );
}

function shiftSentence(regions: string[], shift: Exclude<RegionShift, null>): string {
  if (regions.length === 0) {
    return '';
  }
  const word = shift === 'harder' ? 'a harder' : 'an easier';
  const verb = regions.length === 1 ? 'uses' : 'use';
  const target = regions.length === 1 ? 'that part' : 'those parts';
  return ` ${partList(regions)} ${verb} ${word} exercise so this experience still covers ${target}.`;
}

export function evaluate(
  input: RecommendationInput,
  candidates: Candidate[],
): { rationale: string; ranked: Candidate[] } {
  const allowed = canonicalEquipment(input.equipmentCategories);
  const equipmentMatches = candidates.filter((exercise) =>
    isEligible(exercise, input.muscleSlug, allowed),
  );
  const equipmentText = equipmentList(allowed);
  if (equipmentMatches.length === 0) {
    return {
      rationale: `No ${input.muscleName} exercises use only ${equipmentText}. Add another equipment type or choose a different muscle. ${guidance}`,
      ranked: [],
    };
  }

  const regions = [...new Set(equipmentMatches.map((exercise) => exercise.region))].sort(
    (left, right) => labelRegion(left).localeCompare(labelRegion(right)),
  );
  const picks = regions.map((region) =>
    pickRegion(
      equipmentMatches.filter((exercise) => exercise.region === region),
      input,
    ),
  );
  const pickedIds = new Set(picks.map((pick) => pick.exercise.id));
  const ranked = [
    ...picks.map((pick) => pick.exercise),
    ...equipmentMatches
      .filter((exercise) => !pickedIds.has(exercise.id))
      .sort(byRank(input)),
  ];
  const goalGaps = picks
    .filter((pick) => pick.goalGap)
    .map((pick) => pick.exercise.region);
  const goalSentence =
    goalGaps.length > 0
      ? ` ${partList(goalGaps)} ${goalGaps.length === 1 ? 'has' : 'have'} no exercise written for ${goalPhrase[input.goal]}.`
      : '';

  return {
    rationale: `This workout targets ${input.muscleName} for ${goalPhrase[input.goal]}. It uses only ${equipmentText}. ${experiencePhrase[input.experience]} exercises are used for each part.${goalSentence}${shiftSentence(
      picks.filter((pick) => pick.shift === 'harder').map((pick) => pick.exercise.region),
      'harder',
    )}${shiftSentence(
      picks.filter((pick) => pick.shift === 'easier').map((pick) => pick.exercise.region),
      'easier',
    )} ${guidance}`,
    ranked,
  };
}

function present(exercise: Candidate): Candidate {
  return {
    ...exercise,
    muscles: [...exercise.muscles].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'primary' ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    }),
    equipment: [...exercise.equipment].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  };
}

export function sessionSeconds(input: {
  exercises: { sets: number; restSeconds: number }[];
  rounds: number;
  warmupSeconds: number;
}): number {
  const count = input.exercises.length;
  if (count === 0 || input.rounds < 1) {
    return input.warmupSeconds;
  }
  const perRound =
    input.exercises.reduce(
      (sum, exercise) =>
        sum + exercise.sets * (WORK_SECONDS + exercise.restSeconds),
      0,
    ) +
    Math.max(0, count - 1) * EXERCISE_TRANSITION_SECONDS;
  return (
    input.warmupSeconds +
    input.rounds * perRound +
    Math.max(0, input.rounds - 1) * ROUND_BREAK_SECONDS
  );
}

function planVolume(
  exerciseCount: number,
  goal: TrainingGoal,
  warmupSeconds: number,
  length: SessionLength,
) {
  const dose = prescription[goal];
  if (length === 'standard') {
    const seconds = sessionSeconds({
      exercises: Array.from({ length: exerciseCount }, () => ({
        sets: dose.sets,
        restSeconds: dose.restSeconds,
      })),
      rounds: 1,
      warmupSeconds,
    });
    return {
      rounds: 1,
      sets: dose.sets,
      reps: dose.reps,
      restSeconds: dose.restSeconds,
      estimatedMinutes: Math.round(seconds / 60),
    };
  }
  let rounds = 1;
  let sets = dose.sets;
  let restSeconds = dose.restSeconds;

  const secondsFor = (nextRounds: number, nextSets: number, nextRest: number) =>
    sessionSeconds({
      exercises: Array.from({ length: exerciseCount }, () => ({
        sets: nextSets,
        restSeconds: nextRest,
      })),
      rounds: nextRounds,
      warmupSeconds,
    });

  while (secondsFor(rounds, sets, restSeconds) < SESSION_MIN_SECONDS) {
    if (
      rounds < MAX_ROUNDS &&
      secondsFor(rounds + 1, sets, restSeconds) <= SESSION_MAX_SECONDS
    ) {
      rounds += 1;
      continue;
    }
    if (restSeconds + REST_STEP_SECONDS <= MAX_REST_SECONDS) {
      restSeconds += REST_STEP_SECONDS;
      continue;
    }
    break;
  }

  while (
    secondsFor(rounds, sets, restSeconds) > SESSION_MAX_SECONDS &&
    restSeconds - REST_STEP_SECONDS >= dose.restSeconds
  ) {
    restSeconds -= REST_STEP_SECONDS;
  }
  while (
    secondsFor(rounds, sets, restSeconds) > SESSION_MAX_SECONDS &&
    rounds > 1
  ) {
    rounds -= 1;
  }
  while (
    secondsFor(rounds, sets, restSeconds) > SESSION_MAX_SECONDS &&
    sets > MIN_SETS
  ) {
    sets -= 1;
  }

  const seconds = secondsFor(rounds, sets, restSeconds);
  return {
    rounds,
    sets,
    reps: dose.reps,
    restSeconds,
    estimatedMinutes: Math.round(seconds / 60),
  };
}

function sessionNote(minutes: number, rounds: number, length: SessionLength) {
  const label = rounds === 1 ? 'round' : 'rounds';
  const pace = length === 'full' ? ' This is a long session.' : '';
  return `Repeat the exercises for ${rounds} ${label}. The session is about ${minutes} minutes, including warm-up and rest.${pace} Stop if your form slips or a movement hurts.`;
}

export function listAlternatives(
  input: RecommendationInput,
  candidates: Candidate[],
  selectedIds: Iterable<string>,
  region: string,
): Alternative[] {
  const selected = new Set(selectedIds);
  return evaluate(input, candidates)
    .ranked.filter(
      (exercise) => exercise.region === region && !selected.has(exercise.id),
    )
    .slice(0, ALTERNATIVE_LIMIT)
    .map((exercise) => ({
      exercise: present(exercise),
      reason: exerciseReason(exercise, input.muscleName),
    }));
}

export function recommend(
  input: RecommendationInput,
  candidates: Candidate[],
  warmupSeconds = 0,
  length: SessionLength = 'full',
): Recommendation {
  const evaluated = evaluate(input, candidates);
  const selected = selectByRegion(evaluated.ranked);
  if (selected.length === 0) {
    return {
      rationale: evaluated.rationale,
      rounds: 1,
      estimatedMinutes: 0,
      exercises: [],
    };
  }

  const covered = new Set(selected.map((exercise) => exercise.region));
  const allowed = canonicalEquipment(input.equipmentCategories);
  const missing = knownRegions(candidates, input.muscleSlug).filter(
    (region) =>
      !covered.has(region) &&
      !candidates.some(
        (exercise) =>
          exercise.region === region &&
          isEligible(exercise, input.muscleSlug, allowed),
      ),
  );
  const dose = planVolume(selected.length, input.goal, warmupSeconds, length);
  const selectedIds = new Set(selected.map((exercise) => exercise.id));
  const alternativesFor = (region: string) =>
    evaluated.ranked
      .filter(
        (exercise) => exercise.region === region && !selectedIds.has(exercise.id),
      )
      .slice(0, ALTERNATIVE_LIMIT)
      .map((exercise) => ({
        exercise: present(exercise),
        reason: exerciseReason(exercise, input.muscleName),
      }));

  return {
    rationale: `${evaluated.rationale} ${coverageNote(selected, missing)} ${sessionNote(dose.estimatedMinutes, dose.rounds, length)}`,
    rounds: dose.rounds,
    estimatedMinutes: dose.estimatedMinutes,
    exercises: selected.map((exercise) => ({
      exercise: present(exercise),
      sets: dose.sets,
      reps: dose.reps,
      restSeconds: dose.restSeconds,
      reason: exerciseReason(exercise, input.muscleName),
      alternatives: alternativesFor(exercise.region),
    })),
  };
}
