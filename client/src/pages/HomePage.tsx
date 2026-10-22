import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../components/Status';
import { readWorkoutLinks } from '../storage';

export function HomePage() {
  const [links, setLinks] = useState<{ draftId: string | null; startedId: string | null }>({
    draftId: null,
    startedId: null,
  });

  useEffect(() => {
    setLinks(readWorkoutLinks());
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="Home Workout"
        title="Train a muscle. Know the movement."
      >
        <p>
          Choose a muscle and the equipment you have. The builder picks
          exercises, sets, repetitions, and rest, and tells you why.
        </p>
      </PageIntro>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/workouts/new"
          className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white"
        >
          Build a workout
        </Link>
        {links.startedId ? (
          <Link
            to={`/workouts/${links.startedId}`}
            className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
          >
            Continue workout
          </Link>
        ) : null}
        {links.draftId && links.draftId !== links.startedId ? (
          <Link
            to={`/workouts/${links.draftId}`}
            className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
          >
            Open saved draft
          </Link>
        ) : null}
        <Link
          to="/muscles"
          className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
        >
          Browse muscles
        </Link>
        <Link
          to="/exercises"
          className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold"
        >
          All exercises
        </Link>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Free weights</h2>
          <p className="mt-2 text-muted">
            Dumbbells and barbells for presses, rows, hinges, and curls.
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Machines</h2>
          <p className="mt-2 text-muted">
            Guided presses, pulls, and curls when a machine is available.
          </p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Bodyweight</h2>
          <p className="mt-2 text-muted">
            Squats, push-ups, planks, and bridges that need no extra kit.
          </p>
        </li>
      </ul>
    </>
  );
}
