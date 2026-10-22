import type { Difficulty, EquipmentCategory, MovementType, MuscleRole } from './types';

const difficultyLabels: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const movementLabels: Record<MovementType, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  isometric: 'Isometric',
};

const categoryLabels: Record<EquipmentCategory, string> = {
  free_weight: 'Free weight',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
};

const roleLabels: Record<MuscleRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
};

export function labelDifficulty(value: Difficulty) {
  return difficultyLabels[value];
}

export function labelMovement(value: MovementType) {
  return movementLabels[value];
}

export function labelEquipmentCategory(value: EquipmentCategory) {
  return categoryLabels[value];
}

export function labelRole(value: MuscleRole) {
  return roleLabels[value];
}
