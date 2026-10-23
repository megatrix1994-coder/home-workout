import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            guidance: '',
            goal: null,
            intent: null,
            suggestions: [],
            meals: [],
          },
        }),
      })),
    );
  });

  it('continues the newest started workout and opens the newest draft from your account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/v1/workouts') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                { id: 'draft-2', status: 'draft' },
                { id: 'started-2', status: 'started' },
                { id: 'completed-1', status: 'completed' },
                { id: 'started-1', status: 'started' },
                { id: 'draft-1', status: 'draft' },
              ],
              meta: {},
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ data: { suggestions: [] } }) };
      }),
    );
    renderHome();

    expect(await screen.findByRole('link', { name: 'Continue workout' })).toHaveAttribute(
      'href',
      '/workouts/started-2',
    );
    expect(screen.getByRole('link', { name: 'Open saved draft' })).toHaveAttribute(
      'href',
      '/workouts/draft-2',
    );
  });

  it('shows no resume links when the account has no open workouts', async () => {
    renderHome();

    expect(await screen.findByRole('link', { name: 'Build a workout' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue workout' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open saved draft' })).not.toBeInTheDocument();
  });

  it('shows a suggested meal for a cut', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const cut = String(input).includes('intent=cut');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              guidance: '',
              goal: null,
              intent: cut ? 'cut' : 'bulk',
              suggestions: [
                {
                  slug: cut ? 'eggs' : 'banana',
                  name: cut ? 'Eggs with potatoes' : 'Banana and milk',
                  timing: cut ? 'post' : 'pre',
                  emphasis: cut ? 'protein' : 'carbohydrate',
                  reason: cut
                    ? 'A cut lists protein-leaning meals first. The order is general guidance.'
                    : 'A bulk lists carbohydrate-leaning meals first before training. The order is general guidance.',
                },
              ],
              meals: [],
            },
          }),
        };
      }),
    );
    renderHome();

    expect(await screen.findByRole('link', { name: 'Eggs with potatoes' })).toHaveAttribute(
      'href',
      '/nutrition?intent=cut',
    );
    expect(await screen.findByRole('link', { name: 'Banana and milk' })).toHaveAttribute(
      'href',
      '/nutrition?intent=bulk',
    );
    expect(screen.getByRole('link', { name: 'Build a cut workout' })).toBeInTheDocument();
  });

  it('shows a pose and moves to the next one', async () => {
    renderHome();

    expect(screen.getByText('Front double biceps')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next pose' }));
    expect(screen.getByText('Front lat spread')).toBeInTheDocument();
  });
});
