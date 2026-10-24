import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StretchesPage } from './StretchesPage';

describe('StretchesPage', () => {
  it('lists a gentle and easier stretch for each muscle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              slug: 'chest',
              name: 'Chest',
              stretches: [
                {
                  slug: 'cooldown-chest-gentle',
                  name: 'Doorway chest stretch',
                  durationSeconds: 30,
                  ease: 'gentle',
                  instructions: 'Setup: Stand.\n1. Step.\n2. Ease off.\nBreathing: Slow.\nCommon mistakes: Bounce.',
                  animations: [],
                },
                {
                  slug: 'cooldown-chest-easier',
                  name: 'Seated chest opener',
                  durationSeconds: 30,
                  ease: 'easier',
                  instructions: 'Setup: Sit.\n1. Open.\n2. Ease off.\nBreathing: Slow.\nCommon mistakes: Lean.',
                  animations: [],
                },
              ],
            },
          ],
        }),
      })),
    );
    render(
      <MemoryRouter>
        <StretchesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Post-workout stretches' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chest' })).toBeInTheDocument();
    expect(screen.getByText('Doorway chest stretch')).toBeInTheDocument();
    expect(screen.getByText('Seated chest opener')).toBeInTheDocument();
  });
});
