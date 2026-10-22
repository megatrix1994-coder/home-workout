export const DRAFT_WORKOUT_KEY = 'home-workout:draft-workout';
export const STARTED_WORKOUT_KEY = 'home-workout:started-workout';
const LEGACY_WORKOUT_KEY = 'home-workout:last-workout';

export function readWorkoutLinks() {
  return {
    draftId:
      localStorage.getItem(DRAFT_WORKOUT_KEY) ?? localStorage.getItem(LEGACY_WORKOUT_KEY),
    startedId: localStorage.getItem(STARTED_WORKOUT_KEY),
  };
}

export function rememberDraft(id: string) {
  localStorage.setItem(DRAFT_WORKOUT_KEY, id);
}

export function rememberStarted(id: string) {
  localStorage.setItem(STARTED_WORKOUT_KEY, id);
}
