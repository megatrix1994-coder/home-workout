import { expect, type APIRequestContext } from '@playwright/test';

type Slot = {
  exercise: { id: string };
  sets: number;
  reps: string;
  restSeconds: number;
};

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

export async function createWorkout(request: APIRequestContext) {
  const params = new URLSearchParams({
    muscle: 'chest',
    goal: 'strength',
    experience: 'beginner',
    equipment: 'bodyweight',
    length: 'standard',
  });
  const recommendation = await request.get(`/api/v1/workouts/recommendations?${params}`);
  expect(recommendation.ok()).toBeTruthy();
  const slots = ((await recommendation.json()) as { data: { exercises: Slot[] } }).data.exercises;
  const created = await request.post('/api/v1/workouts', {
    headers: { Origin: BASE_URL },
    data: {
      muscle: 'chest',
      goal: 'strength',
      experience: 'beginner',
      equipmentCategories: ['bodyweight'],
      length: 'standard',
      exercises: slots.map((slot) => ({
        exerciseId: slot.exercise.id,
        sets: slot.sets,
        reps: slot.reps,
        restSeconds: slot.restSeconds,
      })),
    },
  });
  expect(created.status()).toBe(201);
  return ((await created.json()) as { data: { id: string } }).data.id;
}

export const SIGNED_OUT = { cookies: [], origins: [] };
