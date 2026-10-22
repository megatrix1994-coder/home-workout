import type {
  Difficulty,
  EquipmentCategory,
  ExperienceLevel,
  MovementType,
  MuscleRole,
  TrainingGoal,
} from './types';

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

const goalLabels: Record<TrainingGoal, string> = {
  strength: 'Strength',
  hypertrophy: 'Muscle growth',
  general_fitness: 'General fitness',
  endurance: 'Endurance',
};

const experienceLabels: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function labelGoal(value: TrainingGoal) {
  return goalLabels[value];
}

export function labelExperience(value: ExperienceLevel) {
  return experienceLabels[value];
}

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

export function labelRegion(region: string) {
  return regionLabels[region] ?? region;
}
