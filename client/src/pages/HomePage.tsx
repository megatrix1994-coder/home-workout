import { Link } from 'react-router-dom';
import { PageIntro } from '../components/Status';

export function HomePage() {
  return (
    <>
      <PageIntro eyebrow="Exercise catalogue" title="Train a muscle. Know the movement.">
        <p>
          Browse exercises by the muscle you want to train. Each movement lists the equipment it
          uses and the muscles it works.
        </p>
      </PageIntro>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/muscles"
          className="rounded-full bg-accent px-5 py-2.5 font-semibold text-white"
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
          <p className="mt-2 text-muted">Dumbbells and barbells for presses, rows, hinges, and curls.</p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Machines</h2>
          <p className="mt-2 text-muted">Guided presses, pulls, and curls when a machine is available.</p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Bodyweight</h2>
          <p className="mt-2 text-muted">Squats, push-ups, planks, and bridges that need no extra kit.</p>
        </li>
      </ul>
    </>
  );
}
