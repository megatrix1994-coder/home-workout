import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Demonstration } from './Demonstration';

const instructions =
  'Setup: Sit tall.\n1. Press the handles away.\n2. Return with control.\nBreathing: Exhale as you press.\nCommon mistakes: Do not shrug.';

describe('Demonstration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('splits setup, execution, breathing, and common mistakes', () => {
    render(<Demonstration instructions={instructions} />);

    expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByText('Sit tall.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Execution' })).toBeInTheDocument();
    expect(screen.getByText('Press the handles away.')).toBeInTheDocument();
    expect(screen.getByText('Return with control.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Breathing' })).toBeInTheDocument();
    expect(screen.getByText('Exhale as you press.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Common mistakes' })).toBeInTheDocument();
    expect(screen.getByText('Do not shrug.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Exercise demonstration')).not.toBeInTheDocument();
  });

  it('shows an unmatched instruction as one block', () => {
    render(<Demonstration instructions={'Setup: Hands under the shoulders.'} />);

    expect(screen.getByText('Setup: Hands under the shoulders.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Setup' })).not.toBeInTheDocument();
  });

  it('plays an approved video without autoplay and falls back to the text', async () => {
    const user = userEvent.setup();
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    HTMLMediaElement.prototype.play = play;
    HTMLMediaElement.prototype.pause = pause;

    render(
      <Demonstration
        instructions={instructions}
        animations={[
          { id: 'still', format: 'image', assetUrl: '/still.png' },
          { id: 'clip', format: 'video', assetUrl: '/clip.mp4' },
        ]}
      />,
    );

    const video = screen.getByLabelText('Exercise demonstration');
    expect(video).toHaveAttribute('src', '/clip.mp4');
    expect(video).not.toHaveAttribute('autoplay');
    expect(
      screen.getByText('Original illustration of the movement. This is not filmed footage.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(play).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(pause).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '0.5x' }));
    expect(screen.getByRole('button', { name: '0.5x' })).toHaveAttribute('aria-pressed', 'true');
    expect(video).toHaveProperty('playbackRate', 0.5);
    await user.click(screen.getByRole('button', { name: 'Replay' }));
    expect(video).toHaveProperty('currentTime', 0);
    expect(play).toHaveBeenCalledTimes(2);

    fireEvent.error(video);
    expect(screen.queryByLabelText('Exercise demonstration')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Original illustration of the movement. This is not filmed footage.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Sit tall.')).toBeInTheDocument();
  });

  it('ignores a lottie asset and keeps the written cues', () => {
    render(
      <Demonstration
        instructions={instructions}
        animations={[{ id: 'motion', format: 'lottie', assetUrl: '/motion.json' }]}
      />,
    );

    expect(screen.queryByLabelText('Exercise demonstration')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Execution' })).toBeInTheDocument();
  });
});
