import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExercisesPage } from './ExercisesPage';

const chestPress = {
  id: 'ex-1',
  slug: 'machine-chest-press',
  name: 'Chest press',
  difficulty: 'beginner',
  movementType: 'compound',
  region: 'mid',
  goals: ['strength'],
  muscles: [
    { slug: 'chest', name: 'Chest', role: 'primary' },
    { slug: 'triceps', name: 'Triceps', role: 'secondary' },
  ],
  equipment: [
    { slug: 'chest-press-machine', name: 'Chest press machine', category: 'machine' },
  ],
};

const dumbbellRow = {
  id: 'ex-2',
  slug: 'dumbbell-row',
  name: 'Dumbbell row',
  difficulty: 'intermediate',
  movementType: 'compound',
  region: 'lats',
  goals: ['hypertrophy'],
  muscles: [
    { slug: 'back', name: 'Back', role: 'primary' },
    { slug: 'biceps', name: 'Biceps', role: 'secondary' },
  ],
  equipment: [{ slug: 'dumbbell', name: 'Dumbbell', category: 'free_weight' }],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('ExercisesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows equipment and target muscles, then filters to machines', async () => {
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
              exerciseCount: 1,
            },
          ],
        });
      }
      if (url.includes('equipmentCategory=machine')) {
        return jsonResponse({
          data: [chestPress],
          meta: { total: 1, limit: 50, offset: 0 },
        });
      }
      return jsonResponse({
        data: [chestPress, dumbbellRow],
        meta: { total: 2, limit: 50, offset: 0 },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <Routes>
          <Route path="/exercises" element={<ExercisesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: /Dumbbell row/ })).toBeInTheDocument();
    expect(screen.getByText(/Intermediate · Muscle growth/)).toBeInTheDocument();
    expect(screen.getByText(/Dumbbell \(Free weight\)/)).toBeInTheDocument();
    expect(screen.getByText(/Back \(Primary\), Biceps \(Secondary\) · Lats/)).toBeInTheDocument();
    expect(screen.getByText(/Chest press machine \(Machine\)/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Equipment'), 'machine');
    expect(await screen.findByText('1–1 of 1 exercise')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Goal'), 'strength');
    expect(await screen.findByText('1–1 of 1 exercise')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('goal=strength'),
      expect.anything(),
    );
    expect(screen.queryByRole('link', { name: /Dumbbell row/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chest press/ })).toHaveAttribute(
      'href',
      '/exercises/machine-chest-press',
    );
  });

  it('shows an empty state when the search matches nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/muscles')) {
          return jsonResponse({ data: [] });
        }
        if (url.includes('search=zzzz-no-match')) {
          return jsonResponse({ data: [], meta: { total: 0, limit: 50, offset: 0 } });
        }
        return jsonResponse({
          data: [dumbbellRow],
          meta: { total: 1, limit: 50, offset: 0 },
        });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <Routes>
          <Route path="/exercises" element={<ExercisesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: /Dumbbell row/ })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'zzzz-no-match');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('heading', { name: 'No exercises match' })).toBeInTheDocument();
  });

  it('shows an error state when the catalogue request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/muscles')) {
          return jsonResponse({ data: [] });
        }
        return jsonResponse({ error: { message: 'Catalogue unavailable.' } }, false, 500);
      }),
    );

    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <Routes>
          <Route path="/exercises" element={<ExercisesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Catalogue unavailable.');
  });

  it('loads the next page of exercises', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/muscles')) {
        return jsonResponse({ data: [] });
      }
      if (url.includes('offset=100')) {
        return jsonResponse({
          data: [dumbbellRow],
          meta: { total: 101, limit: 100, offset: 100 },
        });
      }
      return jsonResponse({
        data: [chestPress],
        meta: { total: 101, limit: 100, offset: 0 },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <Routes>
          <Route path="/exercises" element={<ExercisesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: /Chest press/ })).toBeInTheDocument();
    expect(screen.getByText('1–1 of 101 exercises')).toBeInTheDocument();
    expect(screen.getByText(/Beginner · Strength/)).toBeInTheDocument();
    expect(screen.getByText(/Middle chest/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('link', { name: /Dumbbell row/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('offset=100'),
      expect.anything(),
    );
  });
});
