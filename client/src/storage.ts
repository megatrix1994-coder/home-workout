const LEGACY_KEYS = [
  'home-workout:draft-workout',
  'home-workout:started-workout',
  'home-workout:history',
  'home-workout:last-workout',
];

export function clearLegacyWorkoutKeys() {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
