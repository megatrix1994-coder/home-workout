import type { WorkoutSlot } from './types';

const repsPattern = /^(?:[1-9]|[1-4]\d|50)(?:-(?:[1-9]|[1-4]\d|50))?$/;

export function replaceExercise(
  slots: WorkoutSlot[],
  index: number,
  alternativeId: string,
): WorkoutSlot[] {
  const current = slots[index];
  const alternative = current?.alternatives.find(
    (item) => item.exercise.id === alternativeId,
  );
  if (!current || !alternative) {
    return slots;
  }

  const returning = { exercise: current.exercise, reason: current.reason };
  return slots.map((slot, slotIndex) => {
    const alternatives = [
      ...slot.alternatives.filter(
        (item) => item.exercise.id !== alternative.exercise.id,
      ),
      returning,
    ];
    if (slotIndex !== index) {
      return { ...slot, alternatives };
    }
    return {
      ...slot,
      exercise: alternative.exercise,
      reason: alternative.reason,
      alternatives,
      progression: undefined,
    };
  });
}

export function updatePrescription(
  slots: WorkoutSlot[],
  index: number,
  patch: Partial<Pick<WorkoutSlot, 'sets' | 'reps' | 'restSeconds'>>,
): WorkoutSlot[] {
  return slots.map((slot, slotIndex) =>
    slotIndex === index ? { ...slot, ...patch } : slot,
  );
}

export function prescriptionError(slots: WorkoutSlot[]): string | null {
  for (const slot of slots) {
    if (!Number.isInteger(slot.sets) || slot.sets < 1 || slot.sets > 10) {
      return `Sets for ${slot.exercise.name} must be from 1 to 10.`;
    }
    if (!repsPattern.test(slot.reps.trim())) {
      return `Reps for ${slot.exercise.name} should look like 5 or 8-12.`;
    }
    const range = /^(\d+)-(\d+)$/.exec(slot.reps.trim());
    if (range && Number(range[2]) < Number(range[1])) {
      return `Reps for ${slot.exercise.name} must go from fewer reps to more reps.`;
    }
    if (
      !Number.isInteger(slot.restSeconds) ||
      slot.restSeconds < 15 ||
      slot.restSeconds > 300
    ) {
      return `Rest for ${slot.exercise.name} must be from 15 to 300 seconds.`;
    }
  }
  return null;
}

export function toExercisePayload(slots: WorkoutSlot[]) {
  return slots.map((slot) => ({
    exerciseId: slot.exercise.id,
    sets: slot.sets,
    reps: slot.reps.trim(),
    restSeconds: slot.restSeconds,
  }));
}
