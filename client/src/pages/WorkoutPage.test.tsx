import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_WORKOUT_KEY, STARTED_WORKOUT_KEY } from '../storage';
import { WorkoutPage } from './WorkoutPage';

const plan = {
  id: 'workout-1',
  status: 'draft' as const,
  startedAt: null,
  completedAt: null,
  goal: 'general_fitness' as const,
  experience: 'beginner' as const,
  equipmentCategories: ['bodyweight' as const],
  rationale: 'A short chest session.',
  estimatedMinutes: 25,
  rounds: 1,
  muscle: { id: 'm-1', slug: 'chest', name: 'Chest' },
  warmups: [],
  exercises: [
    {
      id: 'line-0',
      order: 0,
      sets: 3,
      reps: '10',
      restSeconds: 60,
      reason: 'Push-up matches bodyweight.',
      setLogs: [],
      alternatives: [],
      exercise: {
        id: 'ex-push',
        slug: 'push-up',
        name: 'Push-up',
        description: 'A bodyweight press.',
        instructions: 'Setup: Hands under the shoulders.',
        difficulty: 'beginner' as const,
        movementType: 'compound' as const,
        region: 'mid',
        goals: ['general_fitness' as const],
        muscles: [{ slug: 'chest', name: 'Chest', role: 'primary' as const }],
        equipment: [
          { slug: 'bodyweight', name: 'Bodyweight', category: 'bodyweight' as const },
        ],
      },
    },
  ],
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('WorkoutPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(DRAFT_WORKOUT_KEY, 'draft-9');
  });

  it('records a started workout without replacing the saved draft', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/start')) {
          return jsonResponse({
            data: { ...plan, status: 'started', startedAt: '2026-10-22T00:00:00.000Z' },
          });
        }
        return jsonResponse({ data: plan });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/workouts/workout-1']}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Start workout' })).toBeInTheDocument();
    expect(localStorage.getItem(STARTED_WORKOUT_KEY)).toBeNull();
    expect(localStorage.getItem(DRAFT_WORKOUT_KEY)).toBe('draft-9');

    await userEvent.click(screen.getByRole('button', { name: 'Start workout' }));
    expect(await screen.findByText('Started workout')).toBeInTheDocument();
    expect(localStorage.getItem(STARTED_WORKOUT_KEY)).toBe('workout-1');
    expect(localStorage.getItem(DRAFT_WORKOUT_KEY)).toBe('draft-9');
  });
});