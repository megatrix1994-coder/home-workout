import {
  experienceLevels,
  type ExperienceLevel,
  type MovementType,
  type TrainingGoal,
} from './recommend.js';

const cleanReps: Record<ExperienceLevel, Record<TrainingGoal, number>> = {
  beginner: {
    strength: 5,
    hypertrophy: 8,
    general_fitness: 8,
    endurance: 12,
  },
  intermediate: {
    strength: 5,
    hypertrophy: 10,
    general_fitness: 10,
    endurance: 15,
  },
  advanced: {
    strength: 5,
    hypertrophy: 12,
    general_fitness: 12,
    endurance: 15,
  },
};

const baseJumpKg: Record<ExperienceLevel, number> = {
  beginner: 1,
  intermediate: 2.5,
  advanced: 5,
};

export type LoggedSet = {
  repsCompleted: number;
  weightKg: number | null;
};

export type ProgressionStep = {
  experience: ExperienceLevel;
  cleanReps: number;
  jumpKg: number;
  summary: string;
};

export type ExerciseProgression = {
  cleanReps: number;
  jumpKg: number;
  suggestedWeightKg: number | null;
  earned: boolean | null;
  summary: string;
  outcome: string | null;
};

export function cleanRepTarget(experience: ExperienceLevel, goal: TrainingGoal) {
  return cleanReps[experience][goal];
}

export function loadJumpKg(experience: ExperienceLevel, movementType: MovementType) {
  if (experience === 'advanced' && movementType !== 'compound') {
    return 2.5;
  }
  return baseJumpKg[experience];
}

function roundKg(kg: number) {
  return Math.round(kg * 10) / 10;
}

export function formatKg(kg: number) {
  return `${roundKg(kg)} kg`;
}

function repBump(experience: ExperienceLevel) {
  if (experience === 'beginner') return 1;
  if (experience === 'intermediate') return 2;
  return 0;
}

function nextRepAim(experience: ExperienceLevel, goal: TrainingGoal) {
  const target = cleanRepTarget(experience, goal);
  const cap = cleanRepTarget('advanced', goal);
  return Math.min(cap, target + repBump(experience));
}

export function progressionSummary(input: {
  experience: ExperienceLevel;
  goal: TrainingGoal;
  movementType: MovementType;
  bodyweightOnly: boolean;
}) {
  const clean = cleanRepTarget(input.experience, input.goal);
  const jump = formatKg(loadJumpKg(input.experience, input.movementType));
  if (!input.bodyweightOnly) {
    return `When every set reaches ${clean} clean reps, add ${jump} next time.`;
  }
  const aim = nextRepAim(input.experience, input.goal);
  if (input.experience === 'advanced' || aim <= clean) {
    return `When every set reaches ${clean} clean reps, use a harder version next time. Add ${jump} instead if you use a weight.`;
  }
  const bump = repBump(input.experience);
  const cap = cleanRepTarget('advanced', input.goal);
  const repWord = bump === 1 ? 'rep' : 'reps';
  return `When every set reaches ${clean} clean reps, aim for ${bump} more clean ${repWord} next time, up to ${cap}. Add ${jump} instead if you use a weight.`;
}

export function progressionCycle(input: {
  goal: TrainingGoal;
  movementType: MovementType;
  bodyweightOnly: boolean;
}): ProgressionStep[] {
  return experienceLevels.map((experience) => ({
    experience,
    cleanReps: cleanRepTarget(experience, input.goal),
    jumpKg: loadJumpKg(experience, input.movementType),
    summary: progressionSummary({ ...input, experience }),
  }));
}

function lastWeightKg(logs: LoggedSet[]) {
  let weight: number | null = null;
  for (const log of logs) {
    if (log.weightKg != null && log.weightKg > 0) {
      weight = log.weightKg;
    }
  }
  return weight;
}

function everySetClean(logs: LoggedSet[], target: number) {
  return logs.length > 0 && logs.every((log) => log.repsCompleted >= target);
}

function outcomeMessage(input: {
  experience: ExperienceLevel;
  goal: TrainingGoal;
  movementType: MovementType;
  clean: number;
  jumpKg: number;
  logs: LoggedSet[];
}) {
  const weight = lastWeightKg(input.logs);
  const earned = everySetClean(input.logs, input.clean);
  if (weight != null) {
    if (earned) {
      return `Next time use ${formatKg(weight + input.jumpKg)}.`;
    }
    return `Repeat ${formatKg(weight)} next time. Not every set reached ${input.clean} clean reps.`;
  }
  if (!earned) {
    return `Repeat this exercise until every set reaches ${input.clean} clean reps.`;
  }
  const aim = nextRepAim(input.experience, input.goal);
  if (input.experience === 'advanced' || aim <= input.clean) {
    return 'Next time use a harder version of this exercise.';
  }
  return `Next time aim for ${aim} clean reps.`;
}

export function exerciseProgression(input: {
  experience: ExperienceLevel;
  goal: TrainingGoal;
  movementType: MovementType;
  bodyweightOnly: boolean;
  expectedSets: number;
  currentLogs: LoggedSet[];
  previousLogs: LoggedSet[] | null;
  previousExpectedSets?: number;
}): ExerciseProgression {
  const clean = cleanRepTarget(input.experience, input.goal);
  const jumpKg = loadJumpKg(input.experience, input.movementType);
  const summary = progressionSummary(input);
  const previous = input.previousLogs;
  const previousExpected = input.previousExpectedSets ?? 0;
  const previousFinished =
    previous != null &&
    previous.length > 0 &&
    previousExpected > 0 &&
    previous.length >= previousExpected;
  const earned =
    previous == null || previous.length === 0
      ? null
      : previousFinished && everySetClean(previous, clean);
  const previousWeight = previous == null ? null : lastWeightKg(previous);
  const suggestedWeightKg =
    previousWeight == null ? null : roundKg(earned ? previousWeight + jumpKg : previousWeight);
  const outcome =
    input.currentLogs.length >= input.expectedSets && input.expectedSets > 0
      ? outcomeMessage({
          experience: input.experience,
          goal: input.goal,
          movementType: input.movementType,
          clean,
          jumpKg,
          logs: input.currentLogs,
        })
      : null;

  return {
    cleanReps: clean,
    jumpKg,
    suggestedWeightKg,
    earned,
    summary,
    outcome,
  };
}
