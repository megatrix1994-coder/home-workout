import type { EquipmentSlug, MovementType, MuscleRole, MuscleSlug } from '../catalogue.js';

export type Posture = 'stand' | 'sit' | 'lie' | 'hinge' | 'plank' | 'squat' | 'bridge' | 'kneel';

export type Action =
  | 'press'
  | 'fly'
  | 'row'
  | 'pulldown'
  | 'curl'
  | 'extend'
  | 'raise'
  | 'squat'
  | 'hinge'
  | 'extend-leg'
  | 'curl-leg'
  | 'bridge'
  | 'kick'
  | 'calf'
  | 'crunch'
  | 'side-bend'
  | 'plank';

export type Prop = 'none' | 'barbell' | 'dumbbell' | 'machine';

export type PoseRecipe = {
  muscle: MuscleSlug;
  region: string;
  movementType: MovementType;
  equipment: string;
  steps: number;
  posture: Posture;
  action: Action;
  prop: Prop;
  lead: 'left' | 'right';
  phase: number;
  cycles: number;
  reach: number;
  nudgeX: number;
  nudgeY: number;
  tint: number;
};

export type PoseInput = {
  slug: string;
  instructions: string;
  movementType: MovementType;
  region: string;
  muscles: { slug: MuscleSlug; role: MuscleRole }[];
  equipment: EquipmentSlug[];
};

export function stepCount(instructions: string) {
  const matches = instructions.match(/^\d+\. /gm);
  return matches && matches.length > 0 ? matches.length : 1;
}

function hashSlug(slug: string) {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function propFor(equipment: EquipmentSlug[]): Prop {
  if (equipment.includes('barbell')) {
    return 'barbell';
  }
  if (equipment.includes('dumbbell')) {
    return 'dumbbell';
  }
  if (equipment.every((slug) => slug === 'bodyweight')) {
    return 'none';
  }
  return 'machine';
}

function postureFor(muscle: MuscleSlug, region: string, equipment: EquipmentSlug[]): Posture {
  const machine = equipment.some(
    (slug) => slug !== 'bodyweight' && slug !== 'dumbbell' && slug !== 'barbell',
  );
  const bodyweight = equipment.every((slug) => slug === 'bodyweight');
  if (region === 'brace') {
    return 'plank';
  }
  if (region === 'thrust') {
    return 'bridge';
  }
  if (region === 'kickback') {
    return 'kneel';
  }
  if (region === 'hip-hinge') {
    return 'hinge';
  }
  if (region === 'squat' || region === 'single-leg') {
    return 'squat';
  }
  if (region === 'knee-extension' || region === 'seated') {
    return 'sit';
  }
  if (region === 'knee-flexion') {
    return machine ? 'lie' : 'hinge';
  }
  if (region === 'abdominals') {
    return 'lie';
  }
  if (muscle === 'chest') {
    if (bodyweight) {
      return 'plank';
    }
    return machine ? 'sit' : 'lie';
  }
  if (muscle === 'back') {
    return machine ? 'sit' : 'hinge';
  }
  if (muscle === 'shoulders' && machine) {
    return 'sit';
  }
  return 'stand';
}

function actionFor(
  muscle: MuscleSlug,
  region: string,
  movementType: MovementType,
  posture: Posture,
): Action {
  if (region === 'brace' || (posture === 'plank' && muscle === 'abdominals')) {
    return 'plank';
  }
  if (region === 'pecs' && movementType === 'isolation') {
    return 'fly';
  }
  if (muscle === 'chest' || (posture === 'plank' && muscle !== 'abdominals')) {
    return 'press';
  }
  if (region === 'lats' && posture === 'sit') {
    return 'pulldown';
  }
  if (muscle === 'back' || region === 'rear-delt') {
    return 'row';
  }
  if (region === 'side-delt') {
    return 'raise';
  }
  if (muscle === 'shoulders') {
    return 'press';
  }
  if (muscle === 'biceps' || region === 'flexors') {
    return 'curl';
  }
  if (muscle === 'triceps' || region === 'extensors') {
    return 'extend';
  }
  if (region === 'squat' || region === 'single-leg') {
    return 'squat';
  }
  if (region === 'knee-extension') {
    return 'extend-leg';
  }
  if (region === 'hip-hinge') {
    return 'hinge';
  }
  if (region === 'knee-flexion') {
    return 'curl-leg';
  }
  if (region === 'thrust') {
    return 'bridge';
  }
  if (region === 'kickback') {
    return 'kick';
  }
  if (muscle === 'calves') {
    return 'calf';
  }
  if (region === 'obliques') {
    return 'side-bend';
  }
  if (region === 'abdominals') {
    return 'crunch';
  }
  return 'press';
}

export function poseRecipe(exercise: PoseInput): PoseRecipe {
  const primary = exercise.muscles.find((muscle) => muscle.role === 'primary');
  if (!primary) {
    throw new Error(`Exercise ${exercise.slug} has no primary muscle`);
  }
  const hash = hashSlug(exercise.slug);
  const motion = hashSlug(`${exercise.slug}:motion`);
  const posture = postureFor(primary.slug, exercise.region, exercise.equipment);
  return {
    muscle: primary.slug,
    region: exercise.region,
    movementType: exercise.movementType,
    equipment: [...exercise.equipment].sort().join(','),
    steps: stepCount(exercise.instructions),
    posture,
    action: actionFor(primary.slug, exercise.region, exercise.movementType, posture),
    prop: propFor(exercise.equipment),
    lead: (hash & 1) === 0 ? 'left' : 'right',
    cycles: 1 + ((hash >>> 1) & 3),
    reach: (hash >>> 3) & 15,
    phase: (hash >>> 7) & 255,
    nudgeX: motion % 11,
    nudgeY: (motion >>> 8) % 7,
    tint: (motion >>> 16) % 24,
  };
}

const stretchMotion: Record<MuscleSlug, { action: Action; posture: Posture; easierPosture: Posture }> = {
  chest: { action: 'fly', posture: 'stand', easierPosture: 'sit' },
  back: { action: 'hinge', posture: 'kneel', easierPosture: 'sit' },
  shoulders: { action: 'raise', posture: 'stand', easierPosture: 'sit' },
  biceps: { action: 'extend', posture: 'stand', easierPosture: 'sit' },
  triceps: { action: 'extend', posture: 'stand', easierPosture: 'stand' },
  forearms: { action: 'curl', posture: 'stand', easierPosture: 'sit' },
  quadriceps: { action: 'curl-leg', posture: 'stand', easierPosture: 'lie' },
  hamstrings: { action: 'hinge', posture: 'lie', easierPosture: 'sit' },
  glutes: { action: 'bridge', posture: 'lie', easierPosture: 'lie' },
  calves: { action: 'calf', posture: 'stand', easierPosture: 'sit' },
  abdominals: { action: 'crunch', posture: 'lie', easierPosture: 'kneel' },
};

export function stretchPose(input: {
  slug: string;
  muscle: MuscleSlug;
  instructions: string;
}): PoseRecipe {
  const recipe = poseRecipe({
    slug: input.slug,
    instructions: input.instructions,
    movementType: 'isometric',
    region: 'overall',
    muscles: [{ slug: input.muscle, role: 'primary' }],
    equipment: ['bodyweight'],
  });
  const motion = stretchMotion[input.muscle];
  return {
    ...recipe,
    posture: input.slug.endsWith('-easier') ? motion.easierPosture : motion.posture,
    action: motion.action,
    prop: 'none',
    equipment: 'bodyweight',
    movementType: 'isometric',
  };
}
