import type {
  Difficulty,
  ExperienceLevel,
  MovementType,
  SessionLength,
  TrainingGoal,
} from './recommend.js';

export const bodyIntents = ['cut', 'bulk'] as const;
export type BodyIntent = (typeof bodyIntents)[number];

export type PrerequisiteCandidate = {
  slug: string;
  name: string;
  difficulty: Difficulty;
  movementType: MovementType;
  region: string;
  goals: TrainingGoal[];
  muscles: { slug: string; role: 'primary' | 'secondary' }[];
};

export type PrerequisiteExercise = {
  slug: string;
  name: string;
  difficulty: Difficulty;
  region: string;
  movementType: MovementType;
};

const movementOrder: Record<MovementType, number> = {
  compound: 0,
  isolation: 1,
  isometric: 2,
};

export function trainingForIntent(intent: BodyIntent): {
  goal: TrainingGoal;
  length: SessionLength;
} {
  if (intent === 'cut') {
    return { goal: 'strength', length: 'standard' };
  }
  return { goal: 'hypertrophy', length: 'full' };
}

export function easierDifficulty(difficulty: Difficulty): Difficulty | null {
  if (difficulty === 'intermediate') return 'beginner';
  if (difficulty === 'advanced') return 'intermediate';
  return null;
}

function primarySlug(exercise: PrerequisiteCandidate) {
  return exercise.muscles.find((muscle) => muscle.role === 'primary')?.slug;
}

function byPreference(left: PrerequisiteCandidate, right: PrerequisiteCandidate) {
  const movement = movementOrder[left.movementType] - movementOrder[right.movementType];
  if (movement !== 0) return movement;
  return left.slug.localeCompare(right.slug);
}

export function selectEasierExercises(
  candidates: PrerequisiteCandidate[],
  input: { muscleSlug: string; goal: TrainingGoal; difficulty: Difficulty },
): PrerequisiteExercise[] {
  const ranked = candidates
    .filter(
      (exercise) =>
        exercise.difficulty === input.difficulty &&
        exercise.goals.includes(input.goal) &&
        primarySlug(exercise) === input.muscleSlug,
    )
    .sort(byPreference);
  const picked = new Map<string, PrerequisiteCandidate>();
  for (const exercise of ranked) {
    if (!picked.has(exercise.region)) {
      picked.set(exercise.region, exercise);
    }
  }
  return [...picked.values()]
    .sort((left, right) => left.region.localeCompare(right.region) || left.slug.localeCompare(right.slug))
    .map((exercise) => ({
      slug: exercise.slug,
      name: exercise.name,
      difficulty: exercise.difficulty,
      region: exercise.region,
      movementType: exercise.movementType,
    }));
}

export function listPrerequisites(
  input: { muscleSlug: string; goal: TrainingGoal; experience: ExperienceLevel },
  candidates: PrerequisiteCandidate[],
) {
  const prerequisiteDifficulty = easierDifficulty(input.experience);
  return {
    experience: input.experience,
    difficulty: input.experience,
    prerequisiteDifficulty,
    exercises: prerequisiteDifficulty
      ? selectEasierExercises(candidates, {
          muscleSlug: input.muscleSlug,
          goal: input.goal,
          difficulty: prerequisiteDifficulty,
        })
      : [],
  };
}

export function pickPrerequisite(
  current: PrerequisiteCandidate,
  candidates: PrerequisiteCandidate[],
): { slug: string; name: string; difficulty: Difficulty } | null {
  const easier = easierDifficulty(current.difficulty);
  const muscleSlug = primarySlug(current);
  const goal = current.goals[0];
  if (!easier || !muscleSlug || !goal) {
    return null;
  }
  const match = selectEasierExercises(candidates, {
    muscleSlug,
    goal,
    difficulty: easier,
  }).find((exercise) => exercise.region === current.region);
  if (!match) {
    return null;
  }
  return { slug: match.slug, name: match.name, difficulty: match.difficulty };
}
