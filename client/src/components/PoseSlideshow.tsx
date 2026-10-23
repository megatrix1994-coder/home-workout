import { useEffect, useState } from 'react';
import { poses } from '../ambience';

const SLIDE_MS = 6000;

export function PoseSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pose = poses[index];

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % poses.length);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  function step(direction: -1 | 1) {
    setIndex((current) => (current + direction + poses.length) % poses.length);
  }

  return (
    <section
      className="mb-8 overflow-hidden rounded-2xl border border-accent bg-card text-ink"
      aria-roledescription="carousel"
      aria-label="Posing stage"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setPaused(false);
      }}
    >
      <img src={pose.src} alt="" className="h-56 w-full object-cover sm:h-80" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="font-display text-2xl font-semibold" aria-live="polite">
          {pose.name}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            className="rounded-full border border-accent px-3 py-1.5 text-sm font-semibold"
          >
            Previous pose
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            className="rounded-full border border-accent px-3 py-1.5 text-sm font-semibold"
          >
            Next pose
          </button>
        </div>
      </div>
    </section>
  );
}
