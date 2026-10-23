import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryPage } from './HistoryPage';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function renderHistory() {
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  );
}

const completed = {
  id: 'cmhist000000000000000002',
  status: 'completed',
  goal: 'strength',
  experience: 'beginner',
  muscle: { slug: 'chest', name: 'Chest' },
  createdAt: '2026-10-20T07:00:00.000Z',
  startedAt: '2026-10-20T07:05:00.000Z',
  completedAt: '2026-10-20T08:00:00.000Z',
  estimatedMinutes: 40,
  setsLogged: 4,
  setsPlanned: 4,
  exercises: [{ slug: 'barbell-bench-press', name: 'Barbell bench press', bestWeightKg: 47.5, totalReps: 20 }],
};

const draft = {
  ...completed,
  id: 'cmhist000000000000000003',
  status: 'draft',
  muscle: { slug: 'back', name: 'Back' },
  startedAt: null,
  completedAt: null,
  setsLogged: 0,
};

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows progress, a trend, and sessions grouped by status', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        data: [draft, completed],
        meta: {
          progress: {
            completedLast7Days: 1,
            completedLast28Days: 2,
            weekStreak: 2,
            muscles: [{ slug: 'chest', name: 'Chest', completed: 2 }],
            trends: [
              {
                slug: 'barbell-bench-press',
                name: 'Barbell bench press',
                unit: 'kg',
                improved: true,
                points: [
                  { workoutId: 'a', completedAt: '2026-10-13T08:00:00.000Z', value: 40 },
                  { workoutId: completed.id, completedAt: completed.completedAt, value: 47.5 },
                ],
              },
            ],
          },
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderHistory();

    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/workouts', expect.anything());
    expect(screen.getByText('Weeks in a row with a session').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Chest: 2')).toBeInTheDocument();
    expect(
      screen.getByText('Barbell bench press: 40 kg to 47.5 kg over 2 sessions'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saved drafts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chest workout/ })).toHaveAttribute(
      'href',
      `/workouts/${completed.id}`,
    );
    expect(screen.getByText('4 of 4 sets logged')).toBeInTheDocument();
  });

  it('shows an empty state when the account has no workouts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          data: [],
          meta: {
            progress: {
              completedLast7Days: 0,
              completedLast28Days: 0,
              weekStreak: 0,
              muscles: [],
              trends: [],
            },
          },
        }),
      ),
    );

    renderHistory();

    expect(await screen.findByRole('heading', { name: 'No workouts yet' })).toBeInTheDocument();
  });

  it('shows an error state when history cannot load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: { message: 'History is unavailable.' } }, false, 500)),
    );

    renderHistory();

    expect(await screen.findByRole('alert')).toHaveTextContent('History is unavailable.');
  });
});
