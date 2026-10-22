import type {
  CatalogueExercise,
  Difficulty,
  EquipmentSlug,
  MovementType,
  MuscleSlug,
  TrainingGoal,
} from './catalogue.js';

type ListedExercise = Omit<CatalogueExercise, 'goal'>;

type Pattern = {
  muscle: MuscleSlug;
  region: string;
  goal: TrainingGoal;
  movementType: MovementType;
  equipment: EquipmentSlug;
  name: string;
  setup: string;
  steps: [string, string, string];
  breathing: string;
  mistakes: string;
};

const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const goalOrder: TrainingGoal[] = [
  'strength',
  'hypertrophy',
  'general_fitness',
  'endurance',
];

const minimumScore: Record<TrainingGoal, number> = {
  strength: 4,
  hypertrophy: 4,
  general_fitness: 5,
  endurance: 4,
};

const goalText: Record<TrainingGoal, string> = {
  strength: 'strength',
  hypertrophy: 'muscle growth',
  general_fitness: 'general fitness',
  endurance: 'endurance',
};

const categoryByEquipment: Record<string, 'free_weight' | 'machine' | 'bodyweight'> = {
  dumbbell: 'free_weight',
  barbell: 'free_weight',
  bodyweight: 'bodyweight',
  'chest-press-machine': 'machine',
  'pec-deck': 'machine',
  'lat-pulldown-machine': 'machine',
  'cable-machine': 'machine',
  'shoulder-press-machine': 'machine',
  'lateral-raise-machine': 'machine',
  'biceps-curl-machine': 'machine',
  'triceps-extension-machine': 'machine',
  'leg-extension-machine': 'machine',
  'leg-press-machine': 'machine',
  'leg-curl-machine': 'machine',
  'glute-drive-machine': 'machine',
  'standing-calf-machine': 'machine',
  'seated-calf-machine': 'machine',
  'abdominal-crunch-machine': 'machine',
};

function guide(setup: string, steps: string[], breathing: string, mistakes: string) {
  const numbered = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  return `Setup: ${setup}\n${numbered}\nBreathing: ${breathing}\nCommon mistakes: ${mistakes}`;
}

function row(
  muscle: MuscleSlug,
  region: string,
  goal: TrainingGoal,
  movementType: MovementType,
  equipment: EquipmentSlug,
  name: string,
  setup: string,
  steps: [string, string, string],
  breathing: string,
  mistakes: string,
): Pattern {
  return {
    muscle,
    region,
    goal,
    movementType,
    equipment,
    name,
    setup,
    steps,
    breathing,
    mistakes,
  };
}

function levelName(name: string, difficulty: Difficulty): string {
  if (difficulty === 'beginner') {
    return `Supported ${name}`;
  }
  if (difficulty === 'advanced') {
    return `Paused ${name}`;
  }
  return `Full-range ${name}`;
}

function levelStep(difficulty: Difficulty, movementType: MovementType): string {
  if (movementType === 'isometric') {
    if (difficulty === 'beginner') {
      return 'Hold only while the body stays still, then rest.';
    }
    if (difficulty === 'intermediate') {
      return 'Hold the full position and breathe for several seconds.';
    }
    return 'Hold longer at the hardest point. Use one limb only if the trunk stays still.';
  }
  if (difficulty === 'beginner') {
    return 'Use a short, supported range and stop before the joint feels strained.';
  }
  if (difficulty === 'intermediate') {
    return 'Use the full comfortable range and keep the same speed up and down.';
  }
  return 'Pause for one second at the hardest point. Use one limb only if the trunk stays still.';
}

function primaryMuscle(exercise: ListedExercise): string {
  return exercise.muscles.find((muscle) => muscle.role === 'primary')?.slug ?? '';
}

function scoreGoal(exercise: ListedExercise, goal: TrainingGoal): number {
  const category = categoryByEquipment[exercise.equipment[0] ?? ''];
  const movement = exercise.movementType;
  if (goal === 'strength') {
    return (movement === 'compound' ? 4 : movement === 'isolation' ? 2 : 1) + (category === 'free_weight' ? 2 : 0);
  }
  if (goal === 'hypertrophy') {
    return (movement === 'isolation' ? 4 : movement === 'compound' ? 2 : 1) + (category === 'machine' ? 2 : 0);
  }
  if (goal === 'general_fitness') {
    return (movement === 'compound' ? 3 : movement === 'isolation' ? 2 : 1) + (category === 'bodyweight' ? 3 : 0);
  }
  return (movement === 'isometric' ? 4 : movement === 'isolation' ? 2 : 1) + (category === 'bodyweight' ? 3 : 0);
}

const patterns: Pattern[] = [
  row('chest', 'mid', 'strength', 'compound', 'dumbbell', 'Dumbbell floor press', 'Lie on the floor with a dumbbell in each hand, knees bent, and feet flat.', ['Press the dumbbells until the arms are straight.', 'Lower until the upper arms rest lightly on the floor.', 'Keep the wrists above the elbows.'], 'Exhale as you press. Inhale as you lower.', 'Bouncing the arms off the floor, or letting the elbows flare straight out.'),
  row('chest', 'mid', 'hypertrophy', 'isolation', 'chest-press-machine', 'Machine chest squeeze', 'Sit in the chest press with the handles at mid-chest and the feet flat.', ['Press until the hands are in front of the chest, without locking the elbows.', 'Squeeze the chest for a moment.', 'Return until the upper arms are near the pads.'], 'Exhale as you press. Inhale as you return.', 'Shrugging the shoulders, or bouncing the stack.'),
  row('chest', 'mid', 'general_fitness', 'compound', 'bodyweight', 'Hands-elevated push-up', 'Place the hands on a sturdy raised surface, slightly wider than the shoulders, and step the feet back.', ['Bend the elbows and lower the chest toward the surface.', 'Keep a straight line from head to heels.', 'Press back to the start.'], 'Exhale as you press. Inhale as you lower.', 'Letting the hips sag, or shrugging toward the ears.'),
  row('chest', 'mid', 'endurance', 'isometric', 'bodyweight', 'Wall push-up hold', 'Stand facing a wall and place the hands on the wall at chest height.', ['Walk the feet back until the body is a straight line.', 'Bend the elbows a short way and hold.', 'Keep the ribs tucked and the neck long.'], 'Breathe steadily through the hold.', 'Holding the breath, or letting the lower back arch.'),
  row('chest', 'upper', 'strength', 'compound', 'dumbbell', 'Incline dumbbell press', 'Lie on a sturdy incline with a dumbbell in each hand and the feet flat.', ['Press the dumbbells up over the upper chest.', 'Lower until the upper arms are near the torso.', 'Keep the wrists stacked over the elbows.'], 'Exhale as you press. Inhale as you lower.', 'Pressing the dumbbells back toward the eyes, or bouncing at the bottom.'),
  row('chest', 'upper', 'hypertrophy', 'isolation', 'chest-press-machine', 'Incline machine fly', 'Set the chest press seat so the handles start near the upper chest.', ['Bring the handles together in a wide arc over the upper chest.', 'Squeeze the chest for a moment.', 'Open the arms until a gentle stretch, then stop.'], 'Exhale as you bring the handles in. Inhale as you open.', 'Turning the movement into a shrug, or dropping the elbows below the seat.'),
  row('chest', 'upper', 'general_fitness', 'compound', 'bodyweight', 'Incline push-up', 'Place the hands on a sturdy raised surface and walk the feet back.', ['Lower the chest toward the surface.', 'Keep the body in one line.', 'Press back up without locking the elbows hard.'], 'Exhale as you press. Inhale as you lower.', 'Letting the head jut forward, or the hips pike up.'),
  row('chest', 'upper', 'endurance', 'isometric', 'bodyweight', 'Incline push-up hold', 'Set the hands on a sturdy raised surface and step the feet back into a straight line.', ['Bend the elbows a short way.', 'Hold with the chest above the hands.', 'Keep the shoulders away from the ears.'], 'Breathe steadily through the hold.', 'Sagging at the hips, or holding the breath.'),
  row('chest', 'lower', 'strength', 'compound', 'dumbbell', 'Decline dumbbell press', 'Lie back with the hips higher than the shoulders, a dumbbell in each hand, and the feet planted.', ['Press the dumbbells over the lower chest.', 'Lower until the upper arms meet the torso.', 'Keep both feet steady so the body does not roll.'], 'Exhale as you press. Inhale as you lower.', 'Letting one hip drop, or flaring the elbows.'),
  row('chest', 'lower', 'hypertrophy', 'isolation', 'chest-press-machine', 'Decline machine fly', 'Set the seat so the handles meet over the lower chest.', ['Bring the handles together over the lower chest.', 'Squeeze for a moment.', 'Open only until the chest feels a gentle stretch.'], 'Exhale as you close. Inhale as you open.', 'Arching the lower back off the pad, or slamming the stack.'),
  row('chest', 'lower', 'general_fitness', 'compound', 'bodyweight', 'Decline push-up', 'Place the feet on a sturdy raised surface and the hands on the floor under the shoulders.', ['Lower the chest toward the floor.', 'Keep the body straight.', 'Press back up.'], 'Exhale as you press. Inhale as you lower.', 'Letting the hips sag, or the head drop below the hands.'),
  row('chest', 'lower', 'endurance', 'isometric', 'bodyweight', 'Decline push-up hold', 'Place the feet on a sturdy raised surface and the hands under the shoulders.', ['Lower a short way.', 'Hold a straight line from heels to head.', 'Keep the elbows soft.'], 'Breathe steadily through the hold.', 'Piking the hips, or holding the breath.'),
  row('chest', 'pecs', 'strength', 'compound', 'dumbbell', 'Dumbbell hex press', 'Lie on the floor with the dumbbells pressed together over the chest.', ['Press the dumbbells up while keeping them touching.', 'Lower until the upper arms rest on the floor.', 'Keep squeezing the dumbbells toward each other.'], 'Exhale as you press. Inhale as you lower.', 'Letting the dumbbells drift apart, or bouncing off the floor.'),
  row('chest', 'pecs', 'hypertrophy', 'isolation', 'pec-deck', 'Pec deck squeeze', 'Sit in the pec deck with the forearms on the pads and the chest tall.', ['Bring the pads together in front of the chest.', 'Squeeze the chest for a moment.', 'Open until a gentle stretch, then stop.'], 'Exhale as you bring the pads in. Inhale as you open.', 'Shrugging, or leaning the chest onto the pads.'),
  row('chest', 'pecs', 'general_fitness', 'isolation', 'bodyweight', 'Floor fly', 'Lie on the floor with the arms open and the elbows softly bent.', ['Sweep the arms together over the chest as if hugging a barrel.', 'Keep the elbows at the same bend.', 'Lower until the upper arms rest on the floor.'], 'Exhale as the arms come together. Inhale as they open.', 'Straightening the elbows, or lifting the lower back.'),
  row('chest', 'pecs', 'endurance', 'isometric', 'bodyweight', 'Floor fly hold', 'Lie on the floor and hold the arms just above the chest with the elbows softly bent.', ['Press the palms toward each other without the hands touching.', 'Keep the chest lifted and the neck long.', 'Hold while the shoulders stay down.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath until the neck tightens.'),
  row('back', 'lats', 'strength', 'compound', 'dumbbell', 'Dumbbell pullover', 'Lie on the floor with one dumbbell held in both hands over the chest and the ribs tucked.', ['Lower the dumbbell back over the head until the upper arms approach the floor.', 'Pull the dumbbell back over the chest.', 'Keep the ribs down so the lower back stays near the floor.'], 'Exhale as you pull the weight back. Inhale as you lower it overhead.', 'Turning the movement into a triceps extension, or arching the ribs up.'),
  row('back', 'lats', 'hypertrophy', 'isolation', 'lat-pulldown-machine', 'Lat pulldown squeeze', 'Sit at the lat pulldown, grip the bar just outside the shoulders, and set the thigh pads.', ['Pull the bar toward the upper chest.', 'Squeeze the lats at the bottom for a moment.', 'Return until the arms are long without shrugging.'], 'Exhale as you pull. Inhale as you return.', 'Leaning far back, or pulling with the biceps only.'),
  row('back', 'lats', 'general_fitness', 'compound', 'bodyweight', 'Bodyweight pullover', 'Lie on the floor with the arms overhead and the ribs tucked.', ['Sweep the arms from overhead down to the sides of the hips.', 'Keep the elbows softly bent.', 'Reach back overhead with control.'], 'Exhale as the arms come down. Inhale as they reach overhead.', 'Arching the lower back, or bending the elbows into a press.'),
  row('back', 'lats', 'endurance', 'isometric', 'bodyweight', 'Active hang hold', 'Hold a sturdy overhead support with the hands just outside the shoulders, if one is available at home. Otherwise stand and reach the arms overhead.', ['Set the shoulders down away from the ears.', 'Hold a long body with the ribs tucked.', 'Keep the grip relaxed enough to breathe.'], 'Breathe steadily through the hold.', 'Shrugging into the ears, or holding the breath.'),
  row('back', 'mid-back', 'strength', 'compound', 'dumbbell', 'Dumbbell row', 'Hinge at the hips with a dumbbell in each hand and the back flat.', ['Pull the dumbbells toward the hips.', 'Squeeze the shoulder blades together.', 'Lower until the arms are long.'], 'Exhale as you pull. Inhale as you lower.', 'Jerking the torso upright, or shrugging the shoulders.'),
  row('back', 'mid-back', 'hypertrophy', 'isolation', 'cable-machine', 'Cable row squeeze', 'Sit at a cable row with the chest tall and the handles in front.', ['Pull the handles toward the lower ribs.', 'Squeeze the mid-back for a moment.', 'Return until the shoulder blades slide forward.'], 'Exhale as you pull. Inhale as you return.', 'Leaning back to swing the stack, or shrugging.'),
  row('back', 'mid-back', 'general_fitness', 'compound', 'bodyweight', 'Prone row', 'Lie face down with the arms reaching forward and the forehead supported.', ['Lift the chest slightly and pull the elbows toward the hips.', 'Squeeze the shoulder blades.', 'Lower the arms with control.'], 'Exhale as you pull. Inhale as you lower.', 'Yanking the neck up, or holding the breath.'),
  row('back', 'mid-back', 'endurance', 'isometric', 'bodyweight', 'Prone row hold', 'Lie face down with the forehead supported and the arms by the sides.', ['Lift the chest a short way and pull the shoulder blades together.', 'Hold that position.', 'Keep the feet on the floor.'], 'Breathe steadily through the hold.', 'Craning the neck, or letting the shoulders creep up.'),
  row('back', 'upper-back', 'strength', 'isolation', 'dumbbell', 'Dumbbell shrug', 'Stand tall with a dumbbell in each hand at the sides.', ['Lift the shoulders toward the ears a short way.', 'Lower them slowly.', 'Keep the arms straight and the chin level.'], 'Exhale as you lift. Inhale as you lower.', 'Rolling the shoulders, or bending the elbows.'),
  row('back', 'upper-back', 'hypertrophy', 'isolation', 'cable-machine', 'Cable face pull', 'Set a cable at face height and hold the rope with the thumbs toward you.', ['Pull the rope toward the face.', 'Finish with the hands beside the ears and the chest tall.', 'Return until the arms are long.'], 'Exhale as you pull. Inhale as you return.', 'Leaning back, or letting the elbows drop.'),
  row('back', 'upper-back', 'general_fitness', 'isolation', 'bodyweight', 'Prone shrug', 'Lie face down with the arms by the sides and the forehead supported.', ['Draw the shoulders toward the ears, then down and together.', 'Keep the chest lightly lifted.', 'Lower with control.'], 'Exhale as the shoulders come down and together. Inhale as they lift.', 'Craning the neck, or turning the movement into a push-up.'),
  row('back', 'upper-back', 'endurance', 'isometric', 'bodyweight', 'Wall angel hold', 'Stand with the back, hips, and head against a wall and the arms in a goal-post shape.', ['Slide the arms up only as far as the back stays on the wall.', 'Hold the highest easy position.', 'Keep the ribs down.'], 'Breathe steadily through the hold.', 'Arching the lower back off the wall, or shrugging.'),
  row('back', 'lower-back', 'strength', 'compound', 'dumbbell', 'Dumbbell back extension', 'Hold a light dumbbell at the chest and hinge until the back is near flat.', ['Lift the chest until the body is straight, not past it.', 'Keep the knees softly bent.', 'Return to the hinge.'], 'Exhale as you lift. Inhale as you hinge.', 'Leaning all the way back, or rounding the lower back.'),
  row('back', 'lower-back', 'hypertrophy', 'isolation', 'cable-machine', 'Cable back extension', 'Face away from a low cable and hold the handle at the chest.', ['Hinge forward with a flat back.', 'Return to standing by lifting the chest.', 'Keep the cable close to the body.'], 'Exhale as you stand. Inhale as you hinge.', 'Pulling with the arms, or rounding the back.'),
  row('back', 'lower-back', 'general_fitness', 'compound', 'bodyweight', 'Back extension', 'Lie face down with the hands beside the shoulders and the legs long.', ['Lift the chest a short way while the hips stay down.', 'Pause when the back is long.', 'Lower with control.'], 'Exhale as you lift. Inhale as you lower.', 'Pushing hard through the hands, or yanking the neck.'),
  row('back', 'lower-back', 'endurance', 'isometric', 'bodyweight', 'Superman hold', 'Lie face down with the arms reaching forward.', ['Lift the chest and the legs a short way.', 'Hold a long line from hands to feet.', 'Keep the neck in line with the back.'], 'Breathe steadily through the hold.', 'Lifting so high the lower back pinches, or holding the breath.'),
  row('shoulders', 'front-delt', 'strength', 'compound', 'dumbbell', 'Dumbbell shoulder press', 'Sit or stand tall with a dumbbell in each hand at shoulder height.', ['Press the dumbbells overhead until the arms are straight.', 'Lower to shoulder height.', 'Keep the ribs tucked.'], 'Exhale as you press. Inhale as you lower.', 'Leaning back, or pressing the dumbbells forward of the face.'),
  row('shoulders', 'front-delt', 'hypertrophy', 'isolation', 'cable-machine', 'Cable front raise', 'Stand facing away from a low cable and hold the handle in front of the thigh.', ['Raise the arm to shoulder height.', 'Pause, then lower.', 'Keep the elbow softly bent.'], 'Exhale as you raise. Inhale as you lower.', 'Swinging the torso, or lifting above the shoulder.'),
  row('shoulders', 'front-delt', 'general_fitness', 'compound', 'bodyweight', 'Wall press', 'Stand facing a wall with the hands at shoulder height.', ['Bend the elbows and bring the chest toward the wall.', 'Press back to straight arms.', 'Keep the body in one line.'], 'Exhale as you press. Inhale as you lower.', 'Shrugging, or letting the hips leave the line.'),
  row('shoulders', 'front-delt', 'endurance', 'isometric', 'bodyweight', 'Wall press hold', 'Stand facing a wall with the hands at shoulder height and the feet stepped back.', ['Bend the elbows a short way.', 'Hold the chest away from the wall.', 'Keep the ribs tucked.'], 'Breathe steadily through the hold.', 'Shrugging into the ears, or holding the breath.'),
  row('shoulders', 'side-delt', 'strength', 'isolation', 'dumbbell', 'Dumbbell lateral raise', 'Stand tall with a dumbbell in each hand at the sides.', ['Raise the arms out to shoulder height with a soft bend in the elbows.', 'Lower slowly.', 'Keep the shoulders down.'], 'Exhale as you raise. Inhale as you lower.', 'Shrugging, or swinging the dumbbells up.'),
  row('shoulders', 'side-delt', 'hypertrophy', 'isolation', 'lateral-raise-machine', 'Machine lateral raise', 'Sit in the lateral raise machine with the pads on the arms.', ['Raise the arms to shoulder height.', 'Pause and squeeze.', 'Lower until the shoulders stay down.'], 'Exhale as you raise. Inhale as you lower.', 'Shrugging, or leaning to one side.'),
  row('shoulders', 'side-delt', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight lateral raise', 'Stand tall and raise the arms out to the sides with the elbows softly bent.', ['Lift to shoulder height.', 'Lower with control.', 'Keep the neck long.'], 'Exhale as you lift. Inhale as you lower.', 'Shrugging, or bending the wrists.'),
  row('shoulders', 'side-delt', 'endurance', 'isometric', 'bodyweight', 'Lateral raise hold', 'Stand tall and lift the arms out to the sides just below shoulder height.', ['Hold with the elbows softly bent.', 'Keep the shoulders away from the ears.', 'Stay tall through the ribs.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath.'),
  row('shoulders', 'rear-delt', 'strength', 'isolation', 'dumbbell', 'Dumbbell reverse fly', 'Hinge until the back is flat and hold a dumbbell in each hand under the shoulders.', ['Raise the arms out to the sides.', 'Squeeze the shoulder blades lightly.', 'Lower with control.'], 'Exhale as you raise. Inhale as you lower.', 'Standing up to swing the weight, or shrugging.'),
  row('shoulders', 'rear-delt', 'hypertrophy', 'isolation', 'cable-machine', 'Cable reverse fly', 'Set two cables at shoulder height and hold the opposite handles with the arms crossed.', ['Open the arms out to the sides.', 'Pause when the hands are in line with the shoulders.', 'Return with control.'], 'Exhale as you open. Inhale as you return.', 'Leaning back, or bending the elbows into a row.'),
  row('shoulders', 'rear-delt', 'general_fitness', 'isolation', 'bodyweight', 'Prone reverse fly', 'Lie face down with the arms hanging and the forehead supported.', ['Lift the arms out to the sides.', 'Keep the thumbs up and the chest still.', 'Lower with control.'], 'Exhale as you lift. Inhale as you lower.', 'Craning the neck, or lifting the hips.'),
  row('shoulders', 'rear-delt', 'endurance', 'isometric', 'bodyweight', 'Reverse fly hold', 'Hinge or lie face down and hold the arms out to the sides at shoulder height.', ['Keep a soft bend in the elbows.', 'Hold while the neck stays long.', 'Do not let the shoulders creep up.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath.'),
  row('biceps', 'overall', 'strength', 'isolation', 'dumbbell', 'Dumbbell curl', 'Stand tall with a dumbbell in each hand and the palms facing forward.', ['Curl the dumbbells toward the shoulders.', 'Lower until the arms are straight.', 'Keep the elbows beside the ribs.'], 'Exhale as you curl. Inhale as you lower.', 'Swinging the torso, or letting the elbows drift forward.'),
  row('biceps', 'overall', 'hypertrophy', 'isolation', 'biceps-curl-machine', 'Machine curl squeeze', 'Sit in the curl machine with the pads on the forearms and the chest tall.', ['Curl until the forearms approach the upper arms.', 'Squeeze for a moment.', 'Lower until the elbows stay on the pad.'], 'Exhale as you curl. Inhale as you lower.', 'Lifting the elbows off the pad, or leaning back.'),
  row('biceps', 'overall', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight curl', 'Stand side-on to a sturdy upright and hold it with one hand, palm up.', ['Curl the body toward the hand by bending the elbow.', 'Keep the elbow still.', 'Lower until the arm is long.'], 'Exhale as you curl. Inhale as you lower.', 'Shrugging the shoulder, or twisting the trunk.'),
  row('biceps', 'overall', 'endurance', 'isometric', 'bodyweight', 'Curl hold', 'Stand tall with the elbows bent to a right angle and the palms up.', ['Hold the bend.', 'Keep the elbows beside the ribs.', 'Stay tall through the chest.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath.'),
  row('biceps', 'short-head', 'strength', 'isolation', 'dumbbell', 'Dumbbell concentration curl', 'Sit and brace the back of the upper arm against the inner thigh.', ['Curl the dumbbell toward the shoulder.', 'Lower until the arm is straight.', 'Keep the upper arm still.'], 'Exhale as you curl. Inhale as you lower.', 'Moving the thigh, or swinging the shoulder.'),
  row('biceps', 'short-head', 'hypertrophy', 'isolation', 'biceps-curl-machine', 'Machine concentration curl', 'Sit in the curl machine and angle the chest slightly forward so the upper arm stays supported.', ['Curl one arm through the pad path.', 'Squeeze at the top.', 'Lower without letting the elbow leave the pad.'], 'Exhale as you curl. Inhale as you lower.', 'Using the shoulder to finish the curl, or bouncing.'),
  row('biceps', 'short-head', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight concentration curl', 'Sit and press the working elbow into the inner thigh.', ['Curl the forearm up while the upper arm stays still.', 'Lower until the elbow is straight.', 'Keep the wrist in line with the forearm.'], 'Exhale as you curl. Inhale as you lower.', 'Rocking the torso, or bending the wrist.'),
  row('biceps', 'short-head', 'endurance', 'isometric', 'bodyweight', 'Concentration curl hold', 'Sit with the elbow braced on the inner thigh and the elbow bent.', ['Hold the bend.', 'Keep the wrist straight.', 'Keep the shoulder down.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath.'),
  row('biceps', 'long-head', 'strength', 'isolation', 'dumbbell', 'Incline dumbbell curl', 'Lie back on a sturdy incline with the arms hanging and the palms forward.', ['Curl the dumbbells without letting the upper arms swing forward.', 'Lower until the arms are long.', 'Keep the shoulders down.'], 'Exhale as you curl. Inhale as you lower.', 'Swinging the upper arms, or arching the back.'),
  row('biceps', 'long-head', 'hypertrophy', 'isolation', 'cable-machine', 'Cable incline curl', 'Face away from a low cable and let the arm trail slightly behind the body.', ['Curl the handle toward the shoulder.', 'Keep the upper arm still.', 'Lower until a gentle stretch at the front of the shoulder.'], 'Exhale as you curl. Inhale as you lower.', 'Letting the elbow drift forward, or leaning into the cable.'),
  row('biceps', 'long-head', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight incline curl', 'Stand with the working arm slightly behind the hip and hold a sturdy support.', ['Curl the body toward the hand.', 'Keep the upper arm behind the torso.', 'Lower with control.'], 'Exhale as you curl. Inhale as you lower.', 'Shrugging, or twisting the trunk to help.'),
  row('biceps', 'long-head', 'endurance', 'isometric', 'bodyweight', 'Incline curl hold', 'Stand tall with the elbows slightly behind the ribs and bent to a right angle.', ['Hold the bend.', 'Keep the upper arms back.', 'Stay tall.'], 'Breathe steadily through the hold.', 'Letting the elbows drift forward, or holding the breath.'),
  row('biceps', 'brachialis', 'strength', 'isolation', 'dumbbell', 'Dumbbell hammer curl', 'Stand tall with a dumbbell in each hand and the palms facing the sides.', ['Curl the dumbbells toward the shoulders.', 'Keep the palms facing in.', 'Lower until the arms are straight.'], 'Exhale as you curl. Inhale as you lower.', 'Swinging, or turning the palms up at the top.'),
  row('biceps', 'brachialis', 'hypertrophy', 'isolation', 'cable-machine', 'Cable hammer curl', 'Stand at a low cable and hold the rope with the thumbs up.', ['Curl the rope toward the shoulders.', 'Keep the elbows beside the ribs.', 'Lower until the arms are long.'], 'Exhale as you curl. Inhale as you lower.', 'Leaning back, or letting the elbows travel forward.'),
  row('biceps', 'brachialis', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight hammer curl', 'Stand side-on to a sturdy upright and hold it with the thumb up.', ['Curl the body toward the hand.', 'Keep the palm facing in.', 'Lower until the arm is long.'], 'Exhale as you curl. Inhale as you lower.', 'Shrugging, or twisting the wrist.'),
  row('biceps', 'brachialis', 'endurance', 'isometric', 'bodyweight', 'Hammer curl hold', 'Stand with the elbows bent and the palms facing each other.', ['Hold the bend.', 'Keep the elbows beside the ribs.', 'Keep the shoulders down.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath.'),
  row('triceps', 'long-head', 'strength', 'isolation', 'dumbbell', 'Dumbbell overhead extension', 'Stand or sit tall and hold one dumbbell overhead in both hands.', ['Lower the dumbbell behind the head by bending the elbows.', 'Keep the upper arms beside the ears.', 'Press back up.'], 'Exhale as you press. Inhale as you lower.', 'Flaring the elbows, or arching the lower back.'),
  row('triceps', 'long-head', 'hypertrophy', 'isolation', 'triceps-extension-machine', 'Machine overhead extension', 'Sit in the triceps machine with the arms overhead and the pads on the forearms.', ['Straighten the elbows.', 'Squeeze for a moment.', 'Bend until a gentle stretch, then stop.'], 'Exhale as you straighten. Inhale as you bend.', 'Letting the upper arms drift forward, or arching the back.'),
  row('triceps', 'long-head', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight overhead extension', 'Sit tall and hold one hand behind the head, with the other hand supporting the elbow.', ['Straighten the elbow toward the ceiling.', 'Bend it behind the head.', 'Keep the ribs down.'], 'Exhale as you straighten. Inhale as you bend.', 'Flaring the elbow, or arching the back.'),
  row('triceps', 'long-head', 'endurance', 'isometric', 'bodyweight', 'Overhead extension hold', 'Reach both arms overhead and bend the elbows slightly.', ['Hold the bend with the upper arms beside the ears.', 'Keep the ribs tucked.', 'Stay tall through the chest.'], 'Breathe steadily through the hold.', 'Arching the lower back, or holding the breath.'),
  row('triceps', 'lateral-head', 'strength', 'isolation', 'dumbbell', 'Dumbbell kickback', 'Hinge with the upper arm beside the ribs and a dumbbell in the hand.', ['Straighten the elbow until the forearm points back.', 'Keep the upper arm still.', 'Bend the elbow again.'], 'Exhale as you straighten. Inhale as you bend.', 'Swinging the upper arm, or standing up to help.'),
  row('triceps', 'lateral-head', 'hypertrophy', 'isolation', 'triceps-extension-machine', 'Machine triceps extension', 'Sit at the triceps machine with the upper arms fixed and the handles by the chest.', ['Straighten the elbows.', 'Squeeze the back of the arm.', 'Return without letting the shoulders roll forward.'], 'Exhale as you straighten. Inhale as you bend.', 'Using the shoulders, or bouncing the stack.'),
  row('triceps', 'lateral-head', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight kickback', 'Hinge and hold the upper arm beside the ribs.', ['Straighten the elbow until the forearm points back.', 'Keep the upper arm still.', 'Bend it again.'], 'Exhale as you straighten. Inhale as you bend.', 'Swinging the shoulder, or rounding the back.'),
  row('triceps', 'lateral-head', 'endurance', 'isometric', 'bodyweight', 'Kickback hold', 'Hinge and hold the elbow straight with the upper arm beside the ribs.', ['Keep the forearm pointing back.', 'Hold the trunk still.', 'Keep the shoulder down.'], 'Breathe steadily through the hold.', 'Shrugging, or holding the breath.'),
  row('triceps', 'medial-head', 'strength', 'compound', 'dumbbell', 'Close-grip dumbbell press', 'Lie on the floor with the dumbbells touching over the chest and the elbows close to the sides.', ['Press until the arms are straight.', 'Lower until the upper arms meet the floor.', 'Keep the elbows pointing down, not out.'], 'Exhale as you press. Inhale as you lower.', 'Flaring the elbows, or bouncing off the floor.'),
  row('triceps', 'medial-head', 'hypertrophy', 'isolation', 'chest-press-machine', 'Machine close-grip press', 'Sit in the chest press and take a narrow grip.', ['Press with the elbows close to the sides.', 'Stop before the elbows lock hard.', 'Return until the upper arms stay near the torso.'], 'Exhale as you press. Inhale as you return.', 'Letting the elbows flare, or shrugging.'),
  row('triceps', 'medial-head', 'general_fitness', 'compound', 'bodyweight', 'Close-grip push-up', 'Set the hands under the shoulders, close together, and step the feet back.', ['Lower the chest with the elbows brushing the sides.', 'Keep a straight body.', 'Press back up.'], 'Exhale as you press. Inhale as you lower.', 'Flaring the elbows, or letting the hips sag.'),
  row('triceps', 'medial-head', 'endurance', 'isometric', 'bodyweight', 'Close-grip push-up hold', 'Set the hands close under the shoulders and step the feet back.', ['Bend the elbows a short way, keeping them near the sides.', 'Hold a straight line.', 'Keep the shoulders down.'], 'Breathe steadily through the hold.', 'Flaring the elbows, or holding the breath.'),
  row('forearms', 'flexors', 'strength', 'isolation', 'dumbbell', 'Dumbbell wrist curl', 'Sit and rest the forearms on the thighs with the palms up and a dumbbell in each hand.', ['Curl the wrists up.', 'Lower until a gentle stretch.', 'Keep the forearms still.'], 'Exhale as you curl. Inhale as you lower.', 'Lifting the forearms off the thighs, or using a weight that bends the elbows.'),
  row('forearms', 'flexors', 'hypertrophy', 'isolation', 'cable-machine', 'Cable wrist curl', 'Sit facing a low cable with the palms up and the forearms supported.', ['Curl the wrists toward you.', 'Pause, then lower.', 'Keep the elbows still.'], 'Exhale as you curl. Inhale as you lower.', 'Pulling from the elbow, or shrugging.'),
  row('forearms', 'flexors', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight wrist curl', 'Kneel and place the palms on the floor with the fingers pointing back toward the knees.', ['Shift the body slightly back to load the wrists.', 'Return to the start.', 'Keep the movement small.'], 'Exhale as you shift back. Inhale as you return.', 'Forcing a deep bend, or letting the elbows lock and collapse.'),
  row('forearms', 'flexors', 'endurance', 'isometric', 'bodyweight', 'Wrist curl hold', 'Sit with the forearms supported, palms up, and the wrists slightly curled.', ['Hold the curl.', 'Keep the fingers relaxed.', 'Keep the elbows still.'], 'Breathe steadily through the hold.', 'Gripping so hard the fingers cramp, or holding the breath.'),
  row('forearms', 'extensors', 'strength', 'isolation', 'dumbbell', 'Dumbbell reverse wrist curl', 'Sit with the forearms supported and the palms down, holding a light dumbbell in each hand.', ['Lift the backs of the hands.', 'Lower with control.', 'Keep the forearms still.'], 'Exhale as you lift. Inhale as you lower.', 'Using a heavy dumbbell, or bending the elbows to help.'),
  row('forearms', 'extensors', 'hypertrophy', 'isolation', 'cable-machine', 'Cable reverse wrist curl', 'Sit at a low cable with the palms down and the forearms supported.', ['Lift the backs of the hands.', 'Pause, then lower.', 'Keep the elbows still.'], 'Exhale as you lift. Inhale as you lower.', 'Pulling from the shoulder, or shrugging.'),
  row('forearms', 'extensors', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight reverse wrist curl', 'Kneel with the backs of the hands on the floor and the fingers toward the knees.', ['Shift a little weight onto the backs of the hands.', 'Return before the wrists feel strained.', 'Keep the elbows softly bent.'], 'Exhale as you shift. Inhale as you return.', 'Forcing the wrists flat, or locking the elbows.'),
  row('forearms', 'extensors', 'endurance', 'isometric', 'bodyweight', 'Reverse wrist curl hold', 'Sit with the forearms supported, palms down, and the wrists lifted slightly.', ['Hold the lift.', 'Keep the fingers long.', 'Keep the elbows still.'], 'Breathe steadily through the hold.', 'Gripping hard, or holding the breath.'),
  row('quadriceps', 'squat', 'strength', 'compound', 'dumbbell', 'Dumbbell squat', 'Stand with the feet about hip width and a dumbbell in each hand at the sides.', ['Sit the hips back and bend the knees.', 'Keep the chest tall and the heels down.', 'Stand back up.'], 'Exhale as you stand. Inhale as you sit.', 'Letting the knees cave in, or rounding the back.'),
  row('quadriceps', 'squat', 'hypertrophy', 'compound', 'leg-press-machine', 'Leg press squeeze', 'Sit in the leg press with the feet about hip width on the platform.', ['Lower until the knees bend to a comfortable depth.', 'Press the platform away and squeeze the thighs.', 'Do not lock the knees hard.'], 'Exhale as you press. Inhale as you lower.', 'Letting the lower back round off the pad, or bouncing at the bottom.'),
  row('quadriceps', 'squat', 'general_fitness', 'compound', 'bodyweight', 'Bodyweight squat', 'Stand with the feet about hip width and the arms forward for balance.', ['Sit the hips back and down.', 'Keep the heels down.', 'Stand tall again.'], 'Exhale as you stand. Inhale as you sit.', 'Knees caving in, or the heels lifting.'),
  row('quadriceps', 'squat', 'endurance', 'isometric', 'bodyweight', 'Wall sit', 'Stand with the back against a wall and the feet a short step forward.', ['Slide down until the knees are bent.', 'Hold with the back flat on the wall.', 'Keep the knees tracking over the toes.'], 'Breathe steadily through the hold.', 'Sliding so low the knees pass the toes, or holding the breath.'),
  row('quadriceps', 'single-leg', 'strength', 'compound', 'dumbbell', 'Dumbbell split squat', 'Stand in a long stance with a dumbbell in each hand.', ['Lower the back knee toward the floor.', 'Keep the front heel down.', 'Press back up through the front foot.'], 'Exhale as you stand. Inhale as you lower.', 'Letting the front knee cave in, or bouncing the back knee.'),
  row('quadriceps', 'single-leg', 'hypertrophy', 'compound', 'leg-press-machine', 'Single-leg press', 'Sit in the leg press and place one foot in the middle of the platform.', ['Lower until the knee bends comfortably.', 'Press away without locking the knee.', 'Keep the hips even on the pad.'], 'Exhale as you press. Inhale as you lower.', 'Letting the hip twist, or the knee cave in.'),
  row('quadriceps', 'single-leg', 'general_fitness', 'compound', 'bodyweight', 'Bodyweight split squat', 'Stand in a long stance with the hands on the hips.', ['Lower the back knee toward the floor.', 'Keep the front heel down.', 'Press back up.'], 'Exhale as you stand. Inhale as you lower.', 'A stance so short the front heel lifts, or the knee caving in.'),
  row('quadriceps', 'single-leg', 'endurance', 'isometric', 'bodyweight', 'Split squat hold', 'Take a long stance and lower a short way.', ['Hold with the front heel down.', 'Keep the torso tall.', 'Keep the knee over the mid-foot.'], 'Breathe steadily through the hold.', 'Leaning the chest onto the thigh, or holding the breath.'),
  row('quadriceps', 'knee-extension', 'strength', 'isolation', 'dumbbell', 'Seated dumbbell knee extension', 'Sit tall and pinch a light dumbbell between the feet, or rest it across the ankles.', ['Straighten the knees.', 'Pause, then lower.', 'Keep the back against the seat.'], 'Exhale as you straighten. Inhale as you lower.', 'Swinging the dumbbell, or leaning back.'),
  row('quadriceps', 'knee-extension', 'hypertrophy', 'isolation', 'leg-extension-machine', 'Machine knee extension', 'Sit in the leg extension with the pad on the lower shins.', ['Straighten the knees.', 'Squeeze the thighs for a moment.', 'Lower until the knees stay bent a little.'], 'Exhale as you straighten. Inhale as you lower.', 'Lifting the hips off the seat, or kicking the weight up.'),
  row('quadriceps', 'knee-extension', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight knee extension', 'Sit tall and straighten one knee until the leg is long.', ['Hold for a breath, then lower.', 'Keep the thigh on the seat.', 'Switch sides after the set, or alternate.'], 'Exhale as you straighten. Inhale as you lower.', 'Leaning back to swing the leg, or locking the knee hard.'),
  row('quadriceps', 'knee-extension', 'endurance', 'isometric', 'bodyweight', 'Knee extension hold', 'Sit tall and hold one knee straight.', ['Keep the thigh on the seat.', 'Hold the long leg.', 'Keep the ankle relaxed.'], 'Breathe steadily through the hold.', 'Leaning back, or holding the breath.'),
  row('hamstrings', 'hip-hinge', 'strength', 'compound', 'dumbbell', 'Dumbbell Romanian deadlift', 'Stand tall with a dumbbell in each hand in front of the thighs.', ['Push the hips back and lower the dumbbells along the legs.', 'Keep a soft bend in the knees and a flat back.', 'Stand by driving the hips forward.'], 'Exhale as you stand. Inhale as you hinge.', 'Rounding the back, or squatting instead of hinging.'),
  row('hamstrings', 'hip-hinge', 'hypertrophy', 'isolation', 'cable-machine', 'Cable pull-through', 'Face away from a low cable and hold the handle between the legs.', ['Hinge the hips back until the hamstrings feel a stretch.', 'Stand by driving the hips forward.', 'Keep the arms straight.'], 'Exhale as you stand. Inhale as you hinge.', 'Pulling with the arms, or rounding the back.'),
  row('hamstrings', 'hip-hinge', 'general_fitness', 'compound', 'bodyweight', 'Bodyweight hip hinge', 'Stand tall with the hands on the hips.', ['Push the hips back until the hamstrings tighten.', 'Keep the back flat.', 'Stand tall again.'], 'Exhale as you stand. Inhale as you hinge.', 'Rounding the back, or bending the knees into a squat.'),
  row('hamstrings', 'hip-hinge', 'endurance', 'isometric', 'bodyweight', 'Hip hinge hold', 'Stand and push the hips back until the back is near flat.', ['Hold the hinge.', 'Keep the knees softly bent.', 'Keep the neck long.'], 'Breathe steadily through the hold.', 'Rounding the back, or holding the breath.'),
  row('hamstrings', 'knee-flexion', 'strength', 'isolation', 'dumbbell', 'Dumbbell leg curl', 'Lie face down and pinch a light dumbbell between the feet.', ['Bend the knees and curl the dumbbell toward the hips.', 'Lower with control.', 'Keep the hips on the floor.'], 'Exhale as you curl. Inhale as you lower.', 'Lifting the hips, or swinging the dumbbell.'),
  row('hamstrings', 'knee-flexion', 'hypertrophy', 'isolation', 'leg-curl-machine', 'Machine leg curl', 'Lie or sit in the leg curl with the pad on the lower legs.', ['Curl the heels toward the hips.', 'Squeeze for a moment.', 'Lower until the knees stay softly bent.'], 'Exhale as you curl. Inhale as you lower.', 'Lifting the hips off the pad, or kicking the weight.'),
  row('hamstrings', 'knee-flexion', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight leg curl', 'Lie face down and bend the knees, digging the heels toward the hips.', ['Curl as far as the hips stay down.', 'Lower slowly.', 'Keep the front of the hips on the floor.'], 'Exhale as you curl. Inhale as you lower.', 'Lifting the hips, or rushing the lower.'),
  row('hamstrings', 'knee-flexion', 'endurance', 'isometric', 'bodyweight', 'Leg curl hold', 'Lie face down and bend the knees to about a right angle.', ['Hold the bend.', 'Keep the hips down.', 'Keep the ankles relaxed.'], 'Breathe steadily through the hold.', 'Lifting the hips, or holding the breath.'),
  row('glutes', 'thrust', 'strength', 'compound', 'dumbbell', 'Dumbbell hip thrust', 'Sit on the floor with the upper back against a sturdy surface and a dumbbell across the hips.', ['Drive the hips up until the body is a straight line.', 'Squeeze the glutes.', 'Lower with control.'], 'Exhale as you lift. Inhale as you lower.', 'Overarching the lower back, or pushing through the neck.'),
  row('glutes', 'thrust', 'hypertrophy', 'isolation', 'glute-drive-machine', 'Machine glute drive', 'Sit in the glute drive with the back on the pad and the feet flat.', ['Press the hips forward until the body is straight.', 'Squeeze for a moment.', 'Return without sitting all the way down if the back rounds.'], 'Exhale as you press. Inhale as you return.', 'Overarching the lower back, or letting the knees cave in.'),
  row('glutes', 'thrust', 'general_fitness', 'compound', 'bodyweight', 'Bodyweight hip thrust', 'Lie on the floor with the knees bent and the feet flat.', ['Lift the hips until the body is a straight line from shoulders to knees.', 'Squeeze the glutes.', 'Lower with control.'], 'Exhale as you lift. Inhale as you lower.', 'Overarching the lower back, or pushing the feet away.'),
  row('glutes', 'thrust', 'endurance', 'isometric', 'bodyweight', 'Hip thrust hold', 'Lie with the knees bent and lift the hips into a straight line.', ['Hold the lift.', 'Keep the ribs down.', 'Press through the heels.'], 'Breathe steadily through the hold.', 'Overarching the back, or holding the breath.'),
  row('glutes', 'kickback', 'strength', 'isolation', 'dumbbell', 'Dumbbell glute kickback', 'Hinge and rest one hand on a sturdy surface, with a light dumbbell behind the working knee.', ['Kick the heel back and slightly up.', 'Keep the knee softly bent.', 'Return without arching the lower back.'], 'Exhale as you kick. Inhale as you return.', 'Arching the lower back, or swinging the dumbbell.'),
  row('glutes', 'kickback', 'hypertrophy', 'isolation', 'cable-machine', 'Cable glute kickback', 'Face the cable machine and attach a low cuff, or hold a low handle behind the knee area with care.', ['Kick the working leg back.', 'Squeeze the glute.', 'Return without letting the hips twist.'], 'Exhale as you kick. Inhale as you return.', 'Arching the lower back, or leaning away from the cable.'),
  row('glutes', 'kickback', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight glute kickback', 'Rest on the hands and knees.', ['Kick one heel back and up.', 'Keep the hips square.', 'Return the knee under the hip.'], 'Exhale as you kick. Inhale as you return.', 'Arching the lower back, or rotating the hips open.'),
  row('glutes', 'kickback', 'endurance', 'isometric', 'bodyweight', 'Glute kickback hold', 'Rest on the hands and knees and lift one heel back in line with the hip.', ['Hold the lift.', 'Keep the hips square.', 'Keep the neck long.'], 'Breathe steadily through the hold.', 'Arching the lower back, or holding the breath.'),
  row('calves', 'standing', 'strength', 'isolation', 'dumbbell', 'Dumbbell standing calf raise', 'Stand tall holding a dumbbell in one hand and a support with the other.', ['Rise onto the balls of the feet.', 'Pause at the top.', 'Lower the heels slowly.'], 'Exhale as you rise. Inhale as you lower.', 'Bouncing at the bottom, or bending the knees.'),
  row('calves', 'standing', 'hypertrophy', 'isolation', 'standing-calf-machine', 'Machine standing calf raise', 'Stand in the calf machine with the shoulders under the pads and the balls of the feet on the step.', ['Rise as high as the ankles allow.', 'Pause and squeeze.', 'Lower the heels under control.'], 'Exhale as you rise. Inhale as you lower.', 'Bouncing, or bending the knees to help.'),
  row('calves', 'standing', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight standing calf raise', 'Stand tall and hold a wall for balance.', ['Rise onto the balls of the feet.', 'Lower the heels slowly.', 'Keep the knees softly straight.'], 'Exhale as you rise. Inhale as you lower.', 'Bouncing, or rolling the ankles out.'),
  row('calves', 'standing', 'endurance', 'isometric', 'bodyweight', 'Calf raise hold', 'Stand tall and rise onto the balls of the feet.', ['Hold the top position.', 'Keep the knees softly straight.', 'Use a wall for balance if needed.'], 'Breathe steadily through the hold.', 'Bouncing, or holding the breath.'),
  row('calves', 'seated', 'strength', 'isolation', 'dumbbell', 'Dumbbell seated calf raise', 'Sit with the balls of the feet on a low step and a dumbbell resting on each knee.', ['Lift the heels.', 'Pause.', 'Lower the heels below the step if it is comfortable.'], 'Exhale as you lift. Inhale as you lower.', 'Using a step that is unstable, or bouncing.'),
  row('calves', 'seated', 'hypertrophy', 'isolation', 'seated-calf-machine', 'Machine seated calf raise', 'Sit in the calf machine with the pads on the knees and the balls of the feet on the step.', ['Lift the heels.', 'Squeeze for a moment.', 'Lower with control.'], 'Exhale as you lift. Inhale as you lower.', 'Bouncing the stack, or lifting the knees off the pads.'),
  row('calves', 'seated', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight seated calf raise', 'Sit with the feet flat and the hands on the knees.', ['Lift the heels while the toes stay down.', 'Lower slowly.', 'Keep the knees bent.'], 'Exhale as you lift. Inhale as you lower.', 'Rocking the body, or lifting the toes.'),
  row('calves', 'seated', 'endurance', 'isometric', 'bodyweight', 'Seated calf hold', 'Sit and lift the heels, keeping the toes down.', ['Hold the lift.', 'Keep the hands light on the knees.', 'Stay tall.'], 'Breathe steadily through the hold.', 'Rocking, or holding the breath.'),
  row('abdominals', 'abdominals', 'strength', 'isolation', 'dumbbell', 'Dumbbell crunch', 'Lie on the back with the knees bent and a light dumbbell held at the chest.', ['Curl the ribs toward the pelvis.', 'Keep the lower back close to the floor.', 'Lower with control.'], 'Exhale as you crunch. Inhale as you lower.', 'Pulling on the neck, or sitting all the way up.'),
  row('abdominals', 'abdominals', 'hypertrophy', 'isolation', 'abdominal-crunch-machine', 'Machine crunch squeeze', 'Sit in the abdominal machine with the pad on the chest.', ['Curl the ribs down toward the pelvis.', 'Squeeze for a moment.', 'Return without letting the stack slam.'], 'Exhale as you crunch. Inhale as you return.', 'Pulling with the hands, or using the hips to jerk the pad.'),
  row('abdominals', 'abdominals', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight crunch', 'Lie on the back with the knees bent and the hands lightly beside the head.', ['Curl the ribs toward the pelvis.', 'Keep the lower back close to the floor.', 'Lower with control.'], 'Exhale as you crunch. Inhale as you lower.', 'Pulling on the neck, or sitting all the way up.'),
  row('abdominals', 'abdominals', 'endurance', 'isometric', 'bodyweight', 'Crunch hold', 'Lie on the back with the knees bent and curl the ribs up a short way.', ['Hold the curl.', 'Keep the neck relaxed.', 'Keep the lower back near the floor.'], 'Breathe steadily through the hold.', 'Pulling on the neck, or holding the breath.'),
  row('abdominals', 'obliques', 'strength', 'isolation', 'dumbbell', 'Dumbbell side bend', 'Stand tall and hold a light dumbbell in one hand.', ['Bend slowly toward the dumbbell.', 'Return to tall.', 'Keep the hips still.'], 'Exhale as you return to tall. Inhale as you bend.', 'Leaning forward, or using a dumbbell so heavy the shoulder shrugs.'),
  row('abdominals', 'obliques', 'hypertrophy', 'isolation', 'cable-machine', 'Cable side bend', 'Stand side-on to a low cable and hold the handle in the near hand.', ['Bend slightly toward the cable.', 'Return to tall.', 'Keep the hips still.'], 'Exhale as you stand tall. Inhale as you bend.', 'Pulling with the arm, or twisting the trunk.'),
  row('abdominals', 'obliques', 'general_fitness', 'isolation', 'bodyweight', 'Bodyweight side bend', 'Stand tall with the hands beside the head.', ['Bend a short way to one side.', 'Return to tall, then bend the other way.', 'Keep the hips still.'], 'Exhale as you return to tall. Inhale as you bend.', 'Leaning forward, or bouncing at the bottom.'),
  row('abdominals', 'obliques', 'endurance', 'isometric', 'bodyweight', 'Side bend hold', 'Stand tall and bend a short way to one side.', ['Hold the bend.', 'Keep the hips still.', 'Keep the shoulders square.'], 'Breathe steadily through the hold.', 'Twisting, or holding the breath.'),
  row('abdominals', 'brace', 'strength', 'isometric', 'dumbbell', 'Dumbbell plank', 'Set a light dumbbell across the upper back and rest on the forearms and toes.', ['Make a straight line from head to heels.', 'Brace the abdomen and hold.', 'Lower the knees if the line starts to sag.'], 'Breathe steadily through the hold.', 'Letting the hips drop, or holding the breath.'),
  row('abdominals', 'brace', 'hypertrophy', 'isometric', 'abdominal-crunch-machine', 'Machine brace squeeze', 'Sit in the abdominal machine with a light load and the pad on the chest.', ['Brace as if preparing to crunch, without moving the pad.', 'Hold the brace.', 'Release without slamming the stack.'], 'Breathe steadily through the hold.', 'Pulling with the arms, or holding the breath.'),
  row('abdominals', 'brace', 'general_fitness', 'isometric', 'bodyweight', 'Forearm plank', 'Rest on the forearms and toes.', ['Make a straight line from head to heels.', 'Brace the abdomen.', 'Lower the knees if the hips sag.'], 'Breathe steadily through the hold.', 'Letting the hips pike or sag, or holding the breath.'),
  row('abdominals', 'brace', 'endurance', 'isometric', 'bodyweight', 'Plank hold', 'Rest on the forearms and toes in a straight line.', ['Hold the line.', 'Keep the neck long.', 'Breathe on a steady count.'], 'Breathe steadily through the hold.', 'Holding the breath, or letting the lower back sag.'),
];

export function fillGoalExercises(listed: ListedExercise[]): CatalogueExercise[] {
  const groups = new Map<string, ListedExercise[]>();
  for (const exercise of listed) {
    const key = `${primaryMuscle(exercise)}:${exercise.region}:${exercise.difficulty}`;
    const group = groups.get(key) ?? [];
    group.push(exercise);
    groups.set(key, group);
  }

  const goalBySlug = new Map<string, TrainingGoal>();
  const primarySlugs = new Set<string>();
  for (const group of groups.values()) {
    const remaining = [...group].sort((left, right) => left.slug.localeCompare(right.slug));
    const used = new Set<string>();
    for (const goal of goalOrder) {
      const ranked = remaining
        .filter((exercise) => !used.has(exercise.slug))
        .sort((left, right) => {
          const delta = scoreGoal(right, goal) - scoreGoal(left, goal);
          if (delta !== 0) {
            return delta;
          }
          return left.slug.localeCompare(right.slug);
        });
      const best = ranked[0];
      if (!best || scoreGoal(best, goal) < minimumScore[goal]) {
        continue;
      }
      goalBySlug.set(best.slug, goal);
      used.add(best.slug);
      primarySlugs.add(best.slug);
    }
    for (const exercise of remaining) {
      if (goalBySlug.has(exercise.slug)) {
        continue;
      }
      const bestGoal = [...goalOrder].sort((left, right) => {
        const delta = scoreGoal(exercise, right) - scoreGoal(exercise, left);
        if (delta !== 0) {
          return delta;
        }
        return left.localeCompare(right);
      })[0];
      if (bestGoal) {
        goalBySlug.set(exercise.slug, bestGoal);
      }
    }
  }

  const tagged: CatalogueExercise[] = listed.map((exercise) => ({
    ...exercise,
    goal: goalBySlug.get(exercise.slug) ?? 'general_fitness',
  }));

  const filled = new Set(
    tagged
      .filter((exercise) => primarySlugs.has(exercise.slug))
      .map(
        (exercise) =>
          `${primaryMuscle(exercise)}:${exercise.region}:${exercise.difficulty}:${exercise.goal}`,
      ),
  );
  const usedSlugs = new Set(tagged.map((exercise) => exercise.slug));
  const usedNames = new Set(tagged.map((exercise) => exercise.name.toLowerCase()));
  const generated: CatalogueExercise[] = [];

  for (const pattern of patterns) {
    for (const difficulty of difficulties) {
      const key = `${pattern.muscle}:${pattern.region}:${difficulty}:${pattern.goal}`;
      if (filled.has(key)) {
        continue;
      }
      let name = levelName(pattern.name, difficulty);
      if (usedNames.has(name.toLowerCase())) {
        name = `${name} (${pattern.region})`;
      }
      const slug = `${pattern.muscle}-${pattern.region}-${pattern.goal}-${difficulty}`;
      if (usedSlugs.has(slug)) {
        throw new Error(`Duplicate exercise slug: ${slug}`);
      }
      usedSlugs.add(slug);
      usedNames.add(name.toLowerCase());
      filled.add(key);
      generated.push({
        slug,
        name,
        description: `A ${difficulty} ${goalText[pattern.goal]} version of the ${pattern.name}.`,
        instructions: guide(
          pattern.setup,
          [...pattern.steps, levelStep(difficulty, pattern.movementType)],
          pattern.breathing,
          pattern.mistakes,
        ),
        difficulty,
        movementType: pattern.movementType,
        region: pattern.region,
        goal: pattern.goal,
        muscles: [{ slug: pattern.muscle, role: 'primary' }],
        equipment: [pattern.equipment],
      });
    }
  }

  return [...tagged, ...generated];
}
