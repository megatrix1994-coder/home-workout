export type TrainedMuscle = {
  slug: string;
  sortOrder: number;
};

export function trainedMuscleSlugs(session: TrainedMuscle, worked: TrainedMuscle[]) {
  const order = new Map<string, number>();
  order.set(session.slug, session.sortOrder);
  for (const muscle of worked) {
    if (!order.has(muscle.slug)) {
      order.set(muscle.slug, muscle.sortOrder);
    }
  }
  const rest = [...order.entries()]
    .filter(([slug]) => slug !== session.slug)
    .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]));
  return [session.slug, ...rest.map(([slug]) => slug)];
}
