import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuidedSession } from './GuidedSession';
import type { WorkoutPlan } from '../types';

const exercise = {
  id: 'line-0',
  order: 0,
  sets: 2,
  reps: '5',
  restSeconds: 30,
  reason: 'Push-up is a beginner strength compound for Chest.',
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
    goals: ['strength' as const],
    muscles: [{ slug: 'chest', name: 'Chest', role: 'primary' as const }],
    equipment: [
      { slug: 'bodyweight', name: 'Bodyweight', category: 'bodyweight' as const },
    ],
  },
};

function plan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: 'workout-1',
    status: 'started',
    startedAt: '2026-10-22T00:00:00.000Z',
    completedAt: null,
    goal: 'strength',
    experience: 'beginner',
    equipmentCategories: ['bodyweight'],
    rationale: 'A short chest session.',
    estimatedMinutes: 20,
    rounds: 1,
    muscle: { id: 'm-1', slug: 'chest', name: 'Chest' },
    warmups: [],
    exercises: [exercise],
    ...overrides,
  };
}

describe('GuidedSession', () => {
  it('saves a set, rests, and completes the workout after the last set', async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: plan({
              exercises: [
                {
                  ...exercise,
                  setLogs: [
                    {
                      id: 'log-1',
                      round: 1,
                      setNumber: 1,
                      repsCompleted: 5,
                      weightKg: null,
                    },
                  ],
                },
              ],
            }),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: plan({
              status: 'completed',
              completedAt: '2026-10-22T00:10:00.000Z',
              exercises: [
                {
                  ...exercise,
                  setLogs: [
                    {
                      id: 'log-1',
                      round: 1,
                      setNumber: 1,
                      repsCompleted: 5,
                      weightKg: null,
                    },
                    {
                      id: 'log-2',
                      round: 1,
                      setNumber: 2,
                      repsCompleted: 5,
                      weightKg: null,
                    },
                  ],
                },
              ],
            }),
          }),
        }),
    );

    const view = render(<GuidedSession workout={plan()} onChange={onChange} />);

    expect(screen.getByRole('heading', { name: 'Push-up' })).toBeInTheDocument();
    expect(screen.getByText(/Set 1 of 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(await screen.findByRole('button', { name: 'Skip rest' })).toBeInTheDocument();
    expect(screen.getByText('0:30')).toBeInTheDocument();

    view.rerender(
      <GuidedSession
        workout={plan({
          exercises: [
            {
              ...exercise,
              setLogs: [
                {
                  id: 'log-1',
                  round: 1,
                  setNumber: 1,
                  repsCompleted: 5,
                  weightKg: null,
                },
              ],
            },
          ],
        })}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(screen.getByText(/Set 2 of 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Complete set' }));
    const completed = onChange.mock.calls.at(-1)?.[0] as WorkoutPlan;
    view.rerender(<GuidedSession workout={completed} onChange={onChange} />);
    expect(screen.getByRole('heading', { name: 'Workout complete' })).toBeInTheDocument();
  });

  it('keeps a typed weight and states the next load after a clean set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const progressed = {
      ...exercise,
      sets: 1,
      progression: {
        cleanReps: 5,
        jumpKg: 1,
        suggestedWeightKg: 12.5,
        earned: true,
        summary: 'When every set reaches 5 clean reps, add 1 kg next time.',
        outcome: null,
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: plan({
            exercises: [
              {
                ...progressed,
                setLogs: [
                  {
                    id: 'log-1',
                    round: 1,
                    setNumber: 1,
                    repsCompleted: 5,
                    weightKg: 8,
                  },
                ],
                progression: {
                  ...progressed.progression,
                  outcome: 'Next time use 9 kg.',
                },
              },
            ],
          }),
        }),
      }),
    );

    const view = render(
      <GuidedSession workout={plan({ exercises: [progressed] })} onChange={onChange} />,
    );
    const weight = screen.getByRole('spinbutton', { name: 'Weight (kg)' });
    expect(weight).toHaveValue(12.5);
    expect(screen.getByText(/add 1 kg next time/)).toBeInTheDocument();

    await user.clear(weight);
    await user.type(weight, '8');
    view.rerender(
      <GuidedSession
        workout={plan({
          exercises: [{ ...progressed, reason: 'Same exercise, new object.' }],
        })}
        onChange={onChange}
      />,
    );
    expect(weight).toHaveValue(8);

    await user.click(screen.getByRole('button', { name: 'Complete set' }));
    expect(await screen.findByText('Next time use 9 kg.')).toBeInTheDocument();
  });
});
