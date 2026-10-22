export type Warmup = {
  slug: string;
  name: string;
  durationSeconds: number;
  muscles: string[];
  instructions: string;
};

function cues(setup: string, steps: string[]): string {
  return [
    `Setup: ${setup}`,
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    'Breathing: Keep the breath slow and quiet.',
    'Move slowly and stay short of pain.',
  ].join('\n');
}

export const warmups: Warmup[] = [
  {
    slug: 'doorway-chest-opener',
    name: 'Doorway chest opener',
    durationSeconds: 40,
    muscles: ['chest'],
    instructions: cues(
      'Stand in a doorway with your forearms on the frame, elbows near shoulder height.',
      [
        'Step one foot through until you feel a gentle stretch across the chest.',
        'Keep the ribs down and the shoulders away from the ears.',
        'Step back before the stretch becomes sharp.',
      ],
    ),
  },
  {
    slug: 'chest-wall-slide',
    name: 'Wall slide',
    durationSeconds: 40,
    muscles: ['chest'],
    instructions: cues(
      'Stand with your back and forearms against a wall, elbows bent.',
      [
        'Slide the forearms up a short distance without letting the ribs flare.',
        'Slide back down to the start.',
        'Keep the movement small and easy.',
      ],
    ),
  },
  {
    slug: 'lat-reach',
    name: 'Lat reach',
    durationSeconds: 40,
    muscles: ['back'],
    instructions: cues(
      'Hold a doorway or sturdy post with one hand and sit your hips back slightly.',
      [
        'Let the side of the body lengthen until you feel a gentle stretch along the side of the back.',
        'Keep the shoulder relaxed rather than shrugged.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'seated-back-reach',
    name: 'Seated back reach',
    durationSeconds: 40,
    muscles: ['back'],
    instructions: cues('Sit tall on a chair with both feet on the floor.', [
      'Reach both arms forward and round the upper back gently.',
      'Return to sitting tall and open the chest slightly.',
      'Stay in a comfortable range.',
    ]),
  },
  {
    slug: 'cross-body-shoulder',
    name: 'Cross-body shoulder stretch',
    durationSeconds: 40,
    muscles: ['shoulders'],
    instructions: cues(
      'Sit or stand tall and bring one arm across the chest.',
      [
        'Use the other hand to support the arm above the elbow.',
        'Keep the shoulder down and the stretch mild.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'shoulder-arm-circles',
    name: 'Arm circles',
    durationSeconds: 40,
    muscles: ['shoulders'],
    instructions: cues(
      'Stand tall with the arms out to the sides, below shoulder height.',
      [
        'Make small slow circles.',
        'Reverse the direction halfway through.',
        'Keep the neck relaxed.',
      ],
    ),
  },
  {
    slug: 'gentle-arm-extension',
    name: 'Gentle arm extension',
    durationSeconds: 40,
    muscles: ['biceps'],
    instructions: cues(
      'Stand tall and reach one arm forward with the palm facing up.',
      [
        'Straighten the elbow only until you feel a mild stretch along the front of the arm.',
        'Keep a small bend if a straight elbow feels sharp.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'easy-elbow-bend',
    name: 'Easy elbow bend',
    durationSeconds: 40,
    muscles: ['biceps'],
    instructions: cues(
      'Stand with the arms by your sides and the palms facing forward.',
      [
        'Bend and straighten the elbows slowly, without weight.',
        'Keep the shoulders still.',
        'Use a range that feels easy.',
      ],
    ),
  },
  {
    slug: 'overhead-triceps-reach',
    name: 'Overhead triceps reach',
    durationSeconds: 40,
    muscles: ['triceps'],
    instructions: cues(
      'Sit or stand tall and lift one arm overhead, bending the elbow so the hand drops behind the head.',
      [
        'Support the elbow with the other hand.',
        'Let the stretch stay mild along the back of the upper arm.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'triceps-arm-swing',
    name: 'Easy arm swing',
    durationSeconds: 40,
    muscles: ['triceps'],
    instructions: cues('Stand tall with the arms relaxed.', [
      'Swing the arms gently forward and back.',
      'Keep the elbows soft.',
      'Stay well short of a hard stretch.',
    ]),
  },
  {
    slug: 'wrist-extensor-stretch',
    name: 'Wrist extensor stretch',
    durationSeconds: 40,
    muscles: ['forearms'],
    instructions: cues(
      'Hold one arm in front of you with the palm facing down.',
      [
        'Use the other hand to ease the fingers down and in until the top of the forearm feels a mild stretch.',
        'Keep the elbow soft.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'wrist-flexor-stretch',
    name: 'Wrist flexor stretch',
    durationSeconds: 40,
    muscles: ['forearms'],
    instructions: cues(
      'Hold one arm in front of you with the palm facing up.',
      [
        'Use the other hand to ease the fingers down until the inside of the forearm feels a mild stretch.',
        'Keep the elbow soft.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'standing-quad-stretch',
    name: 'Standing quad stretch',
    durationSeconds: 40,
    muscles: ['quadriceps'],
    instructions: cues(
      'Stand near a wall for balance and hold one ankle behind you.',
      [
        'Keep the knees close together and the torso tall.',
        'Stop when the front of the thigh feels a gentle stretch.',
        'Switch sides. Hold a support if balance is unsteady.',
      ],
    ),
  },
  {
    slug: 'easy-split-stance-rock',
    name: 'Split-stance rock',
    durationSeconds: 40,
    muscles: ['quadriceps'],
    instructions: cues(
      'Stand in a short split stance and hold a wall or chair.',
      [
        'Bend the front knee a little and rock your weight forward and back.',
        'Keep the heel of the front foot down.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'supine-hamstring-stretch',
    name: 'Supine hamstring stretch',
    durationSeconds: 40,
    muscles: ['hamstrings'],
    instructions: cues(
      'Lie on your back and lift one leg, holding the thigh or a towel behind the knee.',
      [
        'Straighten the knee only until the back of the thigh feels a mild stretch.',
        'Keep the other leg resting and the low back comfortable.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'hip-hinge-reach',
    name: 'Hip hinge reach',
    durationSeconds: 40,
    muscles: ['hamstrings'],
    instructions: cues('Stand with soft knees and your hands on your thighs.', [
      'Hinge the hips back a short distance, as if closing a door with your hips.',
      'Stop before the back wants to round hard.',
      'Return to standing tall.',
    ]),
  },
  {
    slug: 'figure-four-glute',
    name: 'Figure-four glute stretch',
    durationSeconds: 40,
    muscles: ['glutes'],
    instructions: cues(
      'Lie on your back with both knees bent, then cross one ankle over the opposite thigh.',
      [
        'Draw the uncrossed thigh toward you only until the hip feels a gentle stretch.',
        'Keep the head down and the breath quiet.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'knee-hug',
    name: 'Knee hug',
    durationSeconds: 40,
    muscles: ['glutes'],
    instructions: cues('Lie on your back with both knees bent.', [
      'Hug one knee toward the chest without pulling hard.',
      'Keep the other foot on the floor.',
      'Switch sides.',
    ]),
  },
  {
    slug: 'wall-calf-stretch',
    name: 'Wall calf stretch',
    durationSeconds: 40,
    muscles: ['calves'],
    instructions: cues(
      'Stand facing a wall with one foot back and both feet pointing forward.',
      [
        'Bend the front knee and keep the back heel down until the calf feels a mild stretch.',
        'Keep the back knee soft.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'ankle-circles',
    name: 'Ankle circles',
    durationSeconds: 40,
    muscles: ['calves'],
    instructions: cues(
      'Sit or stand and lift one foot just off the floor, holding a support if you need it.',
      [
        'Circle the ankle slowly.',
        'Reverse the direction halfway through.',
        'Switch sides.',
      ],
    ),
  },
  {
    slug: 'gentle-abdominal-opener',
    name: 'Gentle abdominal opener',
    durationSeconds: 40,
    muscles: ['abdominals'],
    instructions: cues(
      'Lie on your front with your hands under your shoulders.',
      [
        'Press the floor just enough to lift the chest a small amount, keeping the hips down.',
        'Stop if the low back pinches.',
        'Lower back down and rest.',
      ],
    ),
  },
  {
    slug: 'easy-cat-camel',
    name: 'Easy cat-camel',
    durationSeconds: 40,
    muscles: ['abdominals'],
    instructions: cues(
      'Start on hands and knees with the hands under the shoulders.',
      [
        'Round the back gently, then return to a neutral spine.',
        'Let the belly relax toward the floor only a little, without forcing the low back.',
        'Move slowly between the two positions.',
      ],
    ),
  },
];
