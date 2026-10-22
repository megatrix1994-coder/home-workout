export type MuscleRole = 'primary' | 'secondary';
export type EquipmentCategory = 'free_weight' | 'machine' | 'bodyweight';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MovementType = 'compound' | 'isolation' | 'isometric';

export type MuscleGroup = {
  id: string;
  slug: string;
  name: string;
  anatomicalRegion: string;
  exerciseCount: number;
};

export type ExerciseMuscle = {
  slug: string;
  name: string;
  role: MuscleRole;
};

export type ExerciseEquipment = {
  slug: string;
  name: string;
  category: EquipmentCategory;
};

export type ExerciseSummary = {
  id: string;
  slug: string;
  name: string;
  difficulty: Difficulty;
  movementType: MovementType;
  muscles: ExerciseMuscle[];
  equipment: ExerciseEquipment[];
};

export type ExerciseDetail = ExerciseSummary & {
  description: string;
  instructions: string;
};

export type ListResponse<T> = {
  data: T[];
  meta?: { total: number; limit: number; offset: number };
};

export type ItemResponse<T> = {
  data: T;
};
