import { equipment, exercises, muscleGroups, type CatalogueExercise } from '../catalogue.js';
import { warmups } from '../warmups.js';
import type { Candidate } from './recommend.js';
import { approvedAnimations } from './animations.js';
import { easierDifficulty, pickPrerequisite, type PrerequisiteCandidate } from './body-composition.js';
import type { ExerciseListQuery } from './exercise-query.js';
import { progressionCycle } from './progression.js';
import type { TrainingGoal } from './recommend.js';

const equipmentBySlug = new Map(equipment.map((item) => [item.slug, item]));
const muscleBySlug = new Map(muscleGroups.map((muscle) => [muscle.slug, muscle]));

function matches(exercise: CatalogueExercise, query: Omit<ExerciseListQuery, 'limit' | 'offset' | 'region'> & { region?: string }) {
  if (query.search && !exercise.name.toLowerCase().includes(query.search.toLowerCase())) {
    return false;
  }
  if (query.muscle && !exercise.muscles.some((muscle) => muscle.slug === query.muscle)) {
    return false;
  }
  if (query.difficulty && exercise.difficulty !== query.difficulty) {
    return false;
  }
  if (query.goal && exercise.goal !== query.goal) {
    return false;
  }
  if (query.region && exercise.region !== query.region) {
    return false;
  }
  if (
    query.equipmentCategory &&
    !exercise.equipment.some((slug) => equipmentBySlug.get(slug)?.category === query.equipmentCategory)
  ) {
    return false;
  }
  return true;
}

function summarize(exercise: CatalogueExercise, includeInstructions: boolean) {
  return {
    id: exercise.slug,
    slug: exercise.slug,
    name: exercise.name,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    region: exercise.region,
    goals: [exercise.goal],
    ...(includeInstructions
      ? { description: exercise.description, instructions: exercise.instructions }
      : {}),
    muscles: exercise.muscles.map((muscle) => ({
      slug: muscle.slug,
      name: muscleBySlug.get(muscle.slug)?.name ?? muscle.slug,
      role: muscle.role,
    })),
    equipment: exercise.equipment
      .map((slug) => {
        const item = equipmentBySlug.get(slug);
        return item
          ? { slug: item.slug, name: item.name, category: item.category }
          : null;
      })
      .filter((item) => item !== null)
      .sort((left, right) => left.name.localeCompare(right.name)),
    ...(includeInstructions
      ? {
          progression: progressionCycle({
            goal: exercise.goal as TrainingGoal,
            movementType: exercise.movementType,
            bodyweightOnly: exercise.equipment.every(
              (slug) => equipmentBySlug.get(slug)?.category === 'bodyweight',
            ),
          }),
          animations: approvedAnimations([
            {
              id: `${exercise.slug}-demo`,
              format: 'video',
              assetUrl: `/demonstrations/${exercise.slug}.mp4`,
              reviewStatus: 'approved',
            },
          ]),
        }
      : {}),
  };
}

function candidate(exercise: CatalogueExercise): PrerequisiteCandidate {
  return {
    slug: exercise.slug,
    name: exercise.name,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    region: exercise.region,
    goals: [exercise.goal],
    muscles: exercise.muscles.map((muscle) => ({ slug: muscle.slug, role: muscle.role })),
  };
}

export function catalogueCandidates(): Candidate[] {
  return exercises.map((exercise) => ({
    id: exercise.slug,
    slug: exercise.slug,
    name: exercise.name,
    description: exercise.description,
    instructions: exercise.instructions,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    region: exercise.region,
    goals: [exercise.goal],
    muscles: exercise.muscles.map((muscle) => ({
      slug: muscle.slug,
      name: muscleBySlug.get(muscle.slug)?.name ?? muscle.slug,
      role: muscle.role,
    })),
    equipment: exercise.equipment
      .map((slug) => {
        const item = equipmentBySlug.get(slug);
        return item
          ? { slug: item.slug, name: item.name, category: item.category }
          : null;
      })
      .filter((item) => item !== null),
    animations: [
      {
        id: `${exercise.slug}-demo`,
        format: 'video' as const,
        assetUrl: `/demonstrations/${exercise.slug}.mp4`,
      },
    ],
  }));
}

export function catalogueWarmups(muscleSlug: string) {
  return warmups
    .filter((stretch) => stretch.muscles.includes(muscleSlug))
    .map((stretch) => ({
      id: stretch.slug,
      slug: stretch.slug,
      name: stretch.name,
      instructions: stretch.instructions,
      durationSeconds: stretch.durationSeconds,
    }));
}

export function catalogueMuscles() {
  return muscleGroups.map((muscle) => ({
    id: muscle.slug,
    slug: muscle.slug,
    name: muscle.name,
    anatomicalRegion: muscle.anatomicalRegion,
    exerciseCount: exercises.filter((exercise) =>
      exercise.muscles.some((link) => link.slug === muscle.slug),
    ).length,
  }));
}

export function catalogueExercisePage(query: ExerciseListQuery) {
  const filtered = exercises.filter((exercise) => matches(exercise, query));
  const regions = [
    ...new Set(
      exercises.filter((exercise) => matches(exercise, { ...query, region: undefined })).map((exercise) => exercise.region),
    ),
  ].sort();
  const page = [...filtered]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(query.offset, query.offset + query.limit);
  return {
    data: page.map((exercise) => summarize(exercise, false)),
    meta: {
      total: filtered.length,
      limit: query.limit,
      offset: query.offset,
      regions,
    },
  };
}

export function catalogueExerciseDetail(id: string) {
  const exercise = exercises.find((item) => item.slug === id || item.slug === id.trim());
  if (!exercise) {
    return null;
  }
  const ordered = [...exercises].sort(
    (left, right) => left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug),
  );
  const index = ordered.findIndex((item) => item.slug === exercise.slug);
  const previous = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;
  const easier = easierDifficulty(exercise.difficulty);
  const primary = exercise.muscles.find((muscle) => muscle.role === 'primary');
  const prerequisite =
    easier && primary
      ? pickPrerequisite(
          candidate(exercise),
          exercises
            .filter(
              (item) =>
                item.difficulty === easier &&
                item.region === exercise.region &&
                item.goal === exercise.goal &&
                item.muscles.some((muscle) => muscle.role === 'primary' && muscle.slug === primary.slug),
            )
            .map(candidate),
        )
      : null;
  return {
    ...summarize(exercise, true),
    navigation: {
      previous: previous ? { slug: previous.slug, name: previous.name } : null,
      next: next ? { slug: next.slug, name: next.name } : null,
    },
    prerequisite,
  };
}

export function isMissingCatalogueTable(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const code = String(error.code);
  return code === 'P2021' || code === 'P2022';
}
