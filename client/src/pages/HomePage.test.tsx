import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
