import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MusclesPage } from './MusclesPage';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('MusclesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows muscle groups from the catalogue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            {
              id: '1',
              slug: 'chest',
              name: 'Chest',
              anatomicalRegion: 'Upper body',
              exerciseCount: 4,
            },
            {
              id: '2',
              slug: 'quadriceps',
              name: 'Quadriceps',
              anatomicalRegion: 'Lower body',
              exerciseCount: 1,
            },
          ],
        }),
      ),
    );

    render(
      <MemoryRouter>
        <MusclesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading muscle groups…');
    const chest = await screen.findByRole('link', { name: /Chest/ });
    expect(chest).toHaveAttribute('href', '/exercises?muscle=chest');
    expect(chest.querySelector('img')).toHaveAttribute('src', '/ambience/muscles/chest.jpg');
    expect(screen.getByText('4 exercises')).toBeInTheDocument();
    expect(screen.getByText('1 exercise')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upper body' })).toBeInTheDocument();
  });

  it('shows an empty state when the catalogue has no muscle groups', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    render(
      <MemoryRouter>
        <MusclesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'No muscle groups yet' })).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: 'Database unavailable.' } }, false, 500),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: '1',
              slug: 'chest',
              name: 'Chest',
              anatomicalRegion: 'Upper body',
              exerciseCount: 2,
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <MusclesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Chest/ })).toBeInTheDocument();
  });
});
