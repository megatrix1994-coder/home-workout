export type MuscleRole = 'primary' | 'secondary';
export type EquipmentCategory = 'free_weight' | 'machine' | 'bodyweight';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MovementType = 'compound' | 'isolation' | 'isometric';
export type TrainingGoal =
  'strength' | 'hypertrophy' | 'general_fitness' | 'endurance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type BodyIntent = 'cut' | 'bulk';
export type WorkoutStatus = 'draft' | 'started' | 'completed';

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
  region?: string;
  goals: TrainingGoal[];
  muscles: ExerciseMuscle[];
  equipment: ExerciseEquipment[];
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

export type AnimationFormat = 'lottie' | 'video' | 'image';

export type AnimationAsset = {
  id: string;
  format: AnimationFormat;
  assetUrl: string;
};

export type ExerciseNeighbor = {
  slug: string;
  name: string;
};

export type ExerciseDetail = ExerciseSummary & {
  description: string;
  instructions: string;
  progression?: ProgressionStep[];
  animations?: AnimationAsset[];
  navigation?: {
    previous: ExerciseNeighbor | null;
    next: ExerciseNeighbor | null;
  };
  prerequisite?: {
    slug: string;
    name: string;
    difficulty: Difficulty;
  } | null;
};

export type ListResponse<T> = {
  data: T[];
  meta?: { total: number; limit: number; offset: number; regions?: string[] };
};

export type ItemResponse<T> = {
  data: T;
};

export type WorkoutAlternative = {
  exercise: ExerciseDetail;
  reason: string;
};

export type WorkoutSlot = {
  exercise: ExerciseDetail;
  sets: number;
  reps: string;
  restSeconds: number;
  reason: string;
  alternatives: WorkoutAlternative[];
  progression?: ExerciseProgression;
};

export type WarmupStretch = {
  id: string;
  slug: string;
  name: string;
  instructions: string;
  durationSeconds: number;
};

export type WorkoutCooldown = {
  id: string;
  order: number;
  durationSeconds: number;
  status: 'pending' | 'completed' | 'skipped';
  muscle: { id: string; slug: string; name: string };
  stretch: WarmupStretch & { animations?: AnimationAsset[] };
};

export type WorkoutRecommendation = {
  rationale: string;
  estimatedMinutes: number;
  rounds: number;
  muscle: { id: string; slug: string; name: string } | null;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  equipmentCategories: EquipmentCategory[];
  warmups: WarmupStretch[];
  exercises: WorkoutSlot[];
};

export type WorkoutSetLog = {
  id: string;
  round: number;
  setNumber: number;
  repsCompleted: number;
  weightKg: number | null;
};

export type NutrientName = 'energy' | 'protein' | 'carbohydrate' | 'fat';
export type FoodRegion = 'local' | 'international';
export type BudgetBand = 'low' | 'moderate';
export type MealTiming = 'pre' | 'post';
export type MealEmphasis = 'carbohydrate' | 'protein' | 'mixed';

export type FoodNutrient = {
  nutrient: NutrientName;
  amount: number;
  unit: string;
  sourceName: string;
};

export type MealFood = {
  slug: string;
  name: string;
  region: FoodRegion;
  servingSize: string;
  preparation: string;
  nutrients: FoodNutrient[];
};

export type MealSuggestion = {
  slug: string;
  name: string;
  timing: MealTiming;
  region: FoodRegion;
  rationale: string;
  prepMinutes: number;
  budget: BudgetBand;
  emphasis: MealEmphasis;
  foods: MealFood[];
};

export type MealSuggestionPick = {
  slug: string;
  name: string;
  timing: MealTiming;
  emphasis: MealEmphasis;
  reason: string;
};

export type NutritionRecommendation = {
  guidance: string;
  goal: TrainingGoal | null;
  intent: BodyIntent | null;
  suggestions: MealSuggestionPick[];
  meals: MealSuggestion[];
};

export type WorkoutHistoryItem = {
  id: string;
  status: WorkoutStatus;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  muscle: { slug: string; name: string };
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedMinutes: number;
  setsLogged: number;
  setsPlanned: number;
  exercises: Array<{
    slug: string;
    name: string;
    bestWeightKg: number | null;
    totalReps: number;
  }>;
};

export type ExerciseTrend = {
  slug: string;
  name: string;
  unit: 'kg' | 'reps';
  points: Array<{ workoutId: string; completedAt: string; value: number }>;
  improved: boolean;
};

export type WorkoutProgress = {
  completedLast7Days: number;
  completedLast28Days: number;
  weekStreak: number;
  muscles: Array<{ slug: string; name: string; completed: number }>;
  trends: ExerciseTrend[];
};

export type WorkoutHistoryResponse = {
  data: WorkoutHistoryItem[];
  meta: { progress: WorkoutProgress };
};

export type UserRole = 'admin' | 'member';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type UserStatus = 'active' | 'pending' | 'removed';

export type AdminUser = AuthUser & {
  status: UserStatus;
  createdAt: string;
  removedAt: string | null;
  workoutCount: number;
  lastSeenAt: string | null;
};

export type PendingInvite = {
  id: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
  createdBy: string | null;
};

export type CreatedLink = {
  id: string;
  url: string;
  mobileUrl?: string | null;
  expiresAt: string;
  email?: string | null;
  role?: UserRole;
};

export type AccessLink = {
  kind: 'invite' | 'reset';
  email: string | null;
  expiresAt: string;
};

export type WorkoutPlan = {
  id: string;
  status: WorkoutStatus;
  startedAt: string | null;
  completedAt: string | null;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  equipmentCategories: EquipmentCategory[];
  rationale: string;
  estimatedMinutes: number;
  rounds: number;
  muscle: { id: string; slug: string; name: string };
  warmups: Array<{
    id: string;
    order: number;
    durationSeconds: number;
    stretch: WarmupStretch;
  }>;
  cooldowns?: WorkoutCooldown[];
  exercises: Array<
    WorkoutSlot & {
      id: string;
      order: number;
      setLogs: WorkoutSetLog[];
      progression?: ExerciseProgression;
    }
  >;
};
