import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkoutBuilderPage } from './WorkoutBuilderPage';

const pushUp = {
  id: 'ex-push',
  slug: 'push-up',
  name: 'Push-up',
  description: 'A bodyweight press.',
  instructions: 'Setup: Hands under the shoulders.',
  difficulty: 'beginner',
  movementType: 'compound',
  region: 'mid',
  muscles: [{ slug: 'chest', name: 'Chest', role: 'primary' }],
  equipment: [
    { slug: 'bodyweight', name: 'Bodyweight', category: 'bodyweight' },
  ],
};

const dumbbellPress = {
  id: 'ex-db',
  slug: 'dumbbell-bench-press',
  name: 'Dumbbell bench press',
  description: 'A free-weight press.',
  instructions: 'Setup: Lie on a bench.',
  difficulty: 'intermediate',
  movementType: 'compound',
  region: 'mid',
  muscles: [{ slug: 'chest', name: 'Chest', role: 'primary' }],
  equipment: [{ slug: 'dumbbell', name: 'Dumbbell', category: 'free_weight' }],
};

const machinePress = {
  id: 'ex-machine',
  slug: 'machine-chest-press',
  name: 'Chest press',
  description: 'A machine press.',
  instructions: 'Setup: Sit tall.',
  difficulty: 'beginner',
  movementType: 'compound',
  region: 'mid',
  muscles: [{ slug: 'chest', name: 'Chest', role: 'primary' }],
  equipment: [
    {
      slug: 'chest-press-machine',
      name: 'Chest press machine',
      category: 'machine',
    },
  ],
};

function slot(
  exercise: typeof pushUp,
  alternatives: Array<{ exercise: typeof pushUp; reason: string }> = [],
) {
  return {
    exercise,
    sets: 3,
    reps: '10',
    restSeconds: 60,
    reason: `${exercise.name} matches the selected equipment.`,
    alternatives,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function renderBuilder() {
  render(
    <MemoryRouter initialEntries={['/workouts/new']}>
      <Routes>
        <Route path="/workouts/new" element={<WorkoutBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkoutBuilderPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('drops machine exercises when machines are unchecked and shows the rationale', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/muscles')) {
        return jsonResponse({
          data: [
            {
              id: 'm-1',
              slug: 'chest',
              name: 'Chest',
              anatomicalRegion: 'Upper body',
              exerciseCount: 3,
            },
          ],
        });
      }
      const allowsMachines = url.includes('machine');
      return jsonResponse({
        data: {
          rationale: allowsMachines
            ? 'This workout uses machines.'
            : 'It uses only free weights and bodyweight. These are general training rules.',
          estimatedMinutes: allowsMachines ? 100 : 95,
          rounds: 3,
          warmups: allowsMachines
            ? []
            : [
                {
                  id: 'stretch-1',
                  slug: 'doorway-chest-opener',
                  name: 'Doorway chest opener',
                  instructions: 'Setup: Stand in a doorway.',
                  durationSeconds: 40,
                },
              ],
          muscle: { id: 'm-1', slug: 'chest', name: 'Chest' },
          goal: 'general_fitness',
          experience: 'beginner',
          equipmentCategories: allowsMachines
            ? ['free_weight', 'machine', 'bodyweight']
            : ['free_weight', 'bodyweight'],
          exercises: allowsMachines
            ? [slot(pushUp), slot(machinePress)]
            : [slot(pushUp)],
        },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderBuilder();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Machines' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Build workout' }),
    );

    expect(
      await screen.findByText(/free weights and bodyweight/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Push-up' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Chest press' }),
    ).not.toBeInTheDocument();
    const recommendationCall = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .find((url) => url.includes('/recommendations'));
    expect(recommendationCall).toBeTruthy();
    expect(recommendationCall).toContain('length=full');
    expect(recommendationCall).not.toContain('machine');
    await userEvent.selectOptions(screen.getByLabelText('Session length'), 'standard');
    await userEvent.click(screen.getByRole('button', { name: 'Build workout' }));
    expect(await screen.findByText(/About 95 minutes/)).toBeInTheDocument();
    const standardCall = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/recommendations'))
      .at(-1);
    expect(standardCall).toContain('length=standard');
    expect(
      screen.getByText('No other exercise matches this equipment.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Doorway chest opener' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/About 95 minutes/)).toBeInTheDocument();
    expect(screen.getByText('Middle chest')).toBeInTheDocument();
  });

  it('replaces an exercise with an alternative', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/muscles')) {
          return jsonResponse({
            data: [
              {
                id: 'm-1',
                slug: 'chest',
                name: 'Chest',
                anatomicalRegion: 'Upper body',
                exerciseCount: 2,
              },
            ],
          });
        }
        return jsonResponse({
          data: {
            rationale: 'Compounds come first.',
            estimatedMinutes: 90,
            rounds: 2,
            warmups: [],
            muscle: { id: 'm-1', slug: 'chest', name: 'Chest' },
            goal: 'general_fitness',
            experience: 'intermediate',
            equipmentCategories: ['free_weight', 'bodyweight'],
            exercises: [
              slot(pushUp, [
                {
                  exercise: dumbbellPress,
                  reason: 'Dumbbell bench press matches free weights.',
                },
              ]),
            ],
          },
        });
      }),
    );

    renderBuilder();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Build workout' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Push-up' }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Replace Push-up' }),
      'ex-db',
    );
    expect(
      screen.getByRole('heading', { name: 'Dumbbell bench press' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Push-up' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Setup: Lie on a bench.')).toBeInTheDocument();
  });
});
