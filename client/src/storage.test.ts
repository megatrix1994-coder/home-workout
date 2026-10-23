import { describe, expect, it } from 'vitest';
import { clearLegacyWorkoutKeys } from './storage';

describe('legacy workout storage', () => {
  it('removes the browser-only workout keys and keeps everything else', () => {
    localStorage.setItem('home-workout:draft-workout', 'draft-1');
    localStorage.setItem('home-workout:started-workout', 'started-1');
    localStorage.setItem('home-workout:history', '["a"]');
    localStorage.setItem('home-workout:last-workout', 'legacy-1');
    localStorage.setItem('unrelated', 'on');

    clearLegacyWorkoutKeys();

    expect(localStorage.getItem('home-workout:draft-workout')).toBeNull();
    expect(localStorage.getItem('home-workout:started-workout')).toBeNull();
    expect(localStorage.getItem('home-workout:history')).toBeNull();
    expect(localStorage.getItem('home-workout:last-workout')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('on');
  });
});
