import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseDetailPage } from './ExerciseDetailPage';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('ExerciseDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows instructions, equipment, and target muscles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            id: 'ex-2',
            slug: 'dumbbell-row',
            name: 'Dumbbell row',
            description: 'A one-arm free-weight row.',
            instructions:
              'Setup: Support one hand on a bench.\n1. Pull toward the hip.\nBreathing: Exhale as you pull.\nCommon mistakes: Do not twist.',
            animations: [{ id: 'clip-1', format: 'video', assetUrl: '/row.mp4' }],
            difficulty: 'intermediate',
            movementType: 'compound',
            goals: ['hypertrophy'],
            muscles: [
              { slug: 'back', name: 'Back', role: 'primary' },
              { slug: 'biceps', name: 'Biceps', role: 'secondary' },
            ],
            equipment: [{ slug: 'dumbbell', name: 'Dumbbell', category: 'free_weight' }],
            progression: [
              {
                experience: 'beginner',
                cleanReps: 8,
                jumpKg: 1,
                summary: 'When every set reaches 8 clean reps, add 1 kg next time.',
              },
              {
                experience: 'intermediate',
                cleanReps: 10,
                jumpKg: 2.5,
                summary: 'When every set reaches 10 clean reps, add 2.5 kg next time.',
              },
              {
                experience: 'advanced',
                cleanReps: 12,
                jumpKg: 5,
                summary: 'When every set reaches 12 clean reps, add 5 kg next time.',
              },
            ],
          },
        }),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/exercises/dumbbell-row']}>
        <Routes>
          <Route path="/exercises/:slug" element={<ExerciseDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading exercise…');
    expect(await screen.findByRole('heading', { name: 'Dumbbell row' })).toBeInTheDocument();
    expect(screen.getByText(/Intermediate · Muscle growth · Compound/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Equipment' }).closest('section')).toHaveTextContent(
      'Dumbbell (Free weight)',
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/exercises?muscle=back',
    );
    expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByText('Support one hand on a bench.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Execution' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Breathing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Common mistakes' })).toBeInTheDocument();
    const video = screen.getByLabelText('Exercise demonstration');
    expect(video).toHaveAttribute('src', '/row.mp4');
    expect(video).not.toHaveAttribute('autoplay');
    expect(screen.getByRole('heading', { name: 'Progressive overload' })).toBeInTheDocument();
    expect(screen.getByText(/add 1 kg next time/)).toBeInTheDocument();
    expect(screen.getByText(/add 5 kg next time/)).toBeInTheDocument();
  });

  it('shows a not-found state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'Exercise not found.' } }, false, 404)),
    );

    render(
      <MemoryRouter initialEntries={['/exercises/missing']}>
        <Routes>
          <Route path="/exercises/:slug" element={<ExerciseDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Exercise not found' })).toBeInTheDocument();
  });
});
