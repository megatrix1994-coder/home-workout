export const poses = [
  { src: '/ambience/poses/front-double-biceps.jpg', name: 'Front double biceps' },
  { src: '/ambience/poses/front-lat-spread.jpg', name: 'Front lat spread' },
  { src: '/ambience/poses/side-chest.jpg', name: 'Side chest' },
  { src: '/ambience/poses/back-double-biceps.jpg', name: 'Back double biceps' },
  { src: '/ambience/poses/abdominals-and-thigh.jpg', name: 'Abdominals and thigh' },
  { src: '/ambience/poses/most-muscular.jpg', name: 'Most muscular' },
] as const;

const muscleImages: Record<string, string> = {
  chest: '/ambience/muscles/chest.jpg',
  back: '/ambience/muscles/back.jpg',
  shoulders: '/ambience/muscles/shoulders.jpg',
  biceps: '/ambience/muscles/biceps.jpg',
  triceps: '/ambience/muscles/triceps.jpg',
  forearms: '/ambience/muscles/forearms.jpg',
  quadriceps: '/ambience/muscles/quadriceps.jpg',
  hamstrings: '/ambience/muscles/hamstrings.jpg',
  glutes: '/ambience/muscles/glutes.jpg',
  calves: '/ambience/muscles/calves.jpg',
  abdominals: '/ambience/muscles/abdominals.jpg',
};

export function muscleImage(slug: string) {
  return muscleImages[slug];
}

export const muscleMark: Record<string, { top: string; left: string; scale?: number }> = {
  chest: { top: '42%', left: '50%' },
  back: { top: '40%', left: '50%' },
  shoulders: { top: '40%', left: '50%' },
  biceps: { top: '36%', left: '30%' },
  triceps: { top: '44%', left: '54%' },
  forearms: { top: '52%', left: '48%' },
  quadriceps: { top: '62%', left: '50%' },
  hamstrings: { top: '58%', left: '50%' },
  glutes: { top: '50%', left: '50%', scale: 2.15 },
  calves: { top: '55%', left: '50%' },
  abdominals: { top: '50%', left: '50%' },
};

export function muscleBackdrop(slug: string) {
  const src = muscleImages[slug];
  if (!src) return undefined;
  return `url("${src}")`;
}
