import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { DRAFT_WORKOUT_KEY, STARTED_WORKOUT_KEY } from '../storage';

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('continues a started workout and opens a different draft', () => {
    localStorage.setItem(STARTED_WORKOUT_KEY, 'started-1');
    localStorage.setItem(DRAFT_WORKOUT_KEY, 'draft-1');
    renderHome();

    expect(screen.getByRole('link', { name: 'Continue workout' })).toHaveAttribute(
      'href',
      '/workouts/started-1',
    );
    expect(screen.getByRole('link', { name: 'Open saved draft' })).toHaveAttribute(
      'href',
      '/workouts/draft-1',
    );
  });

  it('hides the draft link when it is the workout already in progress', () => {
    localStorage.setItem(STARTED_WORKOUT_KEY, 'same-1');
    localStorage.setItem(DRAFT_WORKOUT_KEY, 'same-1');
    renderHome();

    expect(screen.getByRole('link', { name: 'Continue workout' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open saved draft' })).not.toBeInTheDocument();
  });

  it('opens a draft saved by the previous resume link', () => {
    localStorage.setItem('home-workout:last-workout', 'legacy-1');
    renderHome();

    expect(screen.getByRole('link', { name: 'Open saved draft' })).toHaveAttribute(
      'href',
      '/workouts/legacy-1',
    );
    expect(screen.queryByRole('link', { name: 'Continue workout' })).not.toBeInTheDocument();
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
