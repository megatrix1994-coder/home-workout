import { Demonstration } from '../components/Demonstration';
import { PageNav } from '../components/PageNav';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import { useApi } from '../api';
import type { AnimationAsset, ItemResponse } from '../types';

type MuscleStretches = {
  slug: string;
  name: string;
  stretches: Array<{
    slug: string;
    name: string;
    durationSeconds: number;
    ease: 'gentle' | 'easier';
    instructions: string;
    animations: AnimationAsset[];
  }>;
};

export function StretchesPage() {
  const state = useApi<ItemResponse<MuscleStretches[]>>('/api/v1/cooldowns');

  return (
    <>
      <PageNav
        fallbackTo="/"
        links={[
          { to: '/muscles', label: 'Muscle groups' },
          { to: '/workouts/new', label: 'Build a workout' },
        ]}
      />
      <PageIntro eyebrow="Recovery" title="Post-workout stretches">
        <p>
          Every muscle group has a gentle hold and an easier alternative. These are the same
          stretches the app gives you after a session. Stop if a stretch hurts.
        </p>
      </PageIntro>
      {state.status === 'loading' ? <LoadingState label="Loading stretches…" /> : null}
      {state.status === 'error' ? (
        <ErrorState title="Could not load stretches" message={state.message} onRetry={state.retry} />
      ) : null}
      {state.status === 'ready' && state.data.data.length === 0 ? (
        <EmptyState title="No stretches yet" body="Seed the catalogue, then refresh this page." />
      ) : null}
      {state.status === 'ready'
        ? state.data.data.map((muscle) => (
            <section key={muscle.slug} className="mb-10">
              <h2 className="font-display text-3xl font-semibold">{muscle.name}</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {muscle.stretches.map((stretch) => (
                  <article key={stretch.slug} className="rounded-2xl border border-line bg-card p-5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                      {stretch.ease === 'gentle' ? 'Gentle' : 'Easier'} · {stretch.durationSeconds}s
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold">{stretch.name}</h3>
                    <div className="mt-3">
                      <Demonstration
                        instructions={stretch.instructions}
                        animations={stretch.animations}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        : null}
    </>
  );
}
