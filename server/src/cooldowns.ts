import type { MuscleSlug } from './catalogue.js';

export type CooldownStretch = {
  slug: string;
  name: string;
  durationSeconds: number;
  muscle: MuscleSlug;
  ease: 'gentle' | 'easier';
  instructions: string;
};

export function gentleSlug(muscle: string) {
  return `cooldown-${muscle}-gentle`;
}

export function easierSlug(muscle: string) {
  return `cooldown-${muscle}-easier`;
}

function guide(setup: string, steps: string[], breathing: string, mistakes: string) {
  const numbered = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  return `Setup: ${setup}\n${numbered}\nBreathing: ${breathing}\nCommon mistakes: ${mistakes}`;
}

function pair(
  muscle: MuscleSlug,
  gentleName: string,
  gentle: [string, string[], string, string],
  easierName: string,
  easier: [string, string[], string, string],
): CooldownStretch[] {
  return [
    {
      slug: gentleSlug(muscle),
      name: gentleName,
      durationSeconds: 30,
      muscle,
      ease: 'gentle',
      instructions: guide(...gentle),
    },
    {
      slug: easierSlug(muscle),
      name: easierName,
      durationSeconds: 30,
      muscle,
      ease: 'easier',
      instructions: guide(...easier),
    },
  ];
}

export const cooldowns: CooldownStretch[] = [
  ...pair(
    'chest',
    'Doorway chest stretch',
    [
      'Stand in a doorway with the forearms on the frame, elbows near shoulder height.',
      ['Step one foot through until the chest feels a mild stretch.', 'Keep the ribs down.', 'Hold without bouncing.'],
      'Breathe slowly. Do not hold the breath.',
      'Shrugging the shoulders, or stepping through until the stretch is sharp.',
    ],
    'Seated chest opener',
    [
      'Sit tall and rest the hands on the chair behind the hips.',
      ['Open the chest a small amount.', 'Keep the shoulders away from the ears.', 'Hold the easy range.'],
      'Breathe slowly. Do not hold the breath.',
      'Leaning far back, or forcing the hands together behind the back.',
    ],
  ),
  ...pair(
    'back',
    'Kneeling lat stretch',
    [
      'Kneel in front of a chair and rest both hands on the seat.',
      ['Sit the hips back until the side of the back feels a mild stretch.', 'Keep the shoulders relaxed.', 'Hold without pulling harder.'],
      'Breathe slowly into the side that feels the stretch.',
      'Rounding the low back hard, or shrugging the shoulders.',
    ],
    'Seated lat reach',
    [
      'Sit tall and hold one wrist with the other hand.',
      ['Reach the arms a short way overhead and lean slightly to one side.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the wrist hard, or leaning until the side pinches.',
    ],
  ),
  ...pair(
    'shoulders',
    'Cross-body shoulder stretch',
    [
      'Stand or sit tall and bring one arm across the chest.',
      ['Support the arm above the elbow with the other hand.', 'Keep the shoulder down.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling on the elbow joint, or lifting the shoulder toward the ear.',
    ],
    'Supported shoulder stretch',
    [
      'Rest the forearm on a table or the back of a chair, across the body.',
      ['Let the table support the arm.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pressing the arm down into the table, or twisting the trunk.',
    ],
  ),
  ...pair(
    'biceps',
    'Wall arm extension',
    [
      'Stand with the palm on a wall beside you, arm straight, thumb pointing down.',
      ['Turn the body slightly away until the front of the arm feels a mild stretch.', 'Keep the elbow soft.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Locking the elbow hard, or turning until the stretch is sharp.',
    ],
    'Seated arm extension',
    [
      'Sit and place one palm on the seat behind the hip, fingers pointing away.',
      ['Slide the hand back only a little until the front of the arm feels a mild stretch.', 'Keep the elbow soft.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Locking the elbow, or leaning the full body weight onto the hand.',
    ],
  ),
  ...pair(
    'triceps',
    'Overhead triceps stretch',
    [
      'Sit or stand tall and bend one elbow so the hand rests behind the head.',
      ['Use the other hand to support the elbow.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the elbow behind the head, or arching the low back.',
    ],
    'Cross-body triceps stretch',
    [
      'Bring one hand to the opposite shoulder.',
      ['Use the other hand to support the arm above the elbow.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the elbow across hard, or shrugging.',
    ],
  ),
  ...pair(
    'forearms',
    'Wrist extensor stretch',
    [
      'Hold one arm in front of you with the elbow soft and the palm facing down.',
      ['Use the other hand to bend the wrist gently downward.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the fingers hard, or locking the elbow.',
    ],
    'Supported wrist stretch',
    [
      'Sit and rest the forearm on the thigh, palm down.',
      ['Let the hand relax over the knee.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pressing the hand down with the other hand, or locking the elbow.',
    ],
  ),
  ...pair(
    'quadriceps',
    'Standing quad stretch',
    [
      'Stand beside a wall and hold it for balance.',
      ['Bend one knee and hold the ankle behind you.', 'Keep the knees close and the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the heel into the hip hard, or leaning the trunk sideways.',
    ],
    'Side-lying quad stretch',
    [
      'Lie on one side with the head supported.',
      ['Bend the top knee and hold the ankle behind you.', 'Keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the heel hard, or letting the low back arch.',
    ],
  ),
  ...pair(
    'hamstrings',
    'Supine hamstring stretch',
    [
      'Lie on your back with one knee bent and the foot on the floor.',
      ['Raise the other leg and hold the thigh.', 'Keep a soft knee and a mild stretch.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the leg straight until the stretch is sharp, or lifting the hips.',
    ],
    'Seated hamstring stretch',
    [
      'Sit on a chair with one heel on the floor and that knee softly bent.',
      ['Hinge forward a short way from the hips.', 'Keep the back long and the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Rounding the back to reach the toes, or locking the knee hard.',
    ],
  ),
  ...pair(
    'glutes',
    'Figure-four stretch',
    [
      'Lie on your back with both knees bent.',
      ['Cross one ankle over the opposite thigh.', 'Hold the thigh and keep the stretch mild.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the thigh hard, or twisting the low back off the floor.',
    ],
    'Knee hug',
    [
      'Lie on your back with both knees bent.',
      ['Hug one knee toward the chest only a short way.', 'Keep the other foot on the floor.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Pulling the knee hard into the chest, or holding the breath.',
    ],
  ),
  ...pair(
    'calves',
    'Wall calf stretch',
    [
      'Stand facing a wall with one foot back and both feet pointing forward.',
      ['Bend the front knee until the back calf feels a mild stretch.', 'Keep the back heel down and the back knee soft.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Forcing the heel down until the stretch is sharp, or turning the back foot out.',
    ],
    'Seated calf stretch',
    [
      'Sit with one leg out and a towel around the forefoot.',
      ['Draw the toes toward you only a little.', 'Keep the knee soft.', 'Switch sides halfway through the hold.'],
      'Breathe slowly. Do not hold the breath.',
      'Yanking the towel, or locking the knee.',
    ],
  ),
  ...pair(
    'abdominals',
    'Gentle abdominal opener',
    [
      'Lie on your front with the hands under the shoulders.',
      ['Press the floor just enough to lift the chest a small amount.', 'Keep the hips down.', 'Hold the easy range.'],
      'Breathe slowly. Do not hold the breath.',
      'Pushing up until the low back pinches, or holding the breath.',
    ],
    'Hands-and-knees belly ease',
    [
      'Start on the hands and knees.',
      ['Let the belly relax toward the floor only a little.', 'Keep the movement small.', 'Return to a neutral spine if the back feels tight.'],
      'Breathe slowly. Do not hold the breath.',
      'Dropping the belly hard, or holding the breath.',
    ],
  ),
];

export function gentleCooldown(muscle: string) {
  return cooldowns.find((stretch) => stretch.muscle === muscle && stretch.ease === 'gentle');
}

export function otherCooldown(muscle: string, currentSlug: string) {
  return cooldowns.find((stretch) => stretch.muscle === muscle && stretch.slug !== currentSlug);
}
