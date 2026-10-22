import { Link } from 'react-router-dom';
import { useApi } from '../api';
import { PageNav } from '../components/PageNav';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import type { ListResponse, MuscleGroup } from '../types';

const regionOrder = ['Upper body', 'Lower body', 'Core'];

export function MusclesPage() {
  const state = useApi<ListResponse<MuscleGroup>>('/api/v1/muscles');

  return (
    <>
      <PageNav
        fallbackTo="/"
        links={[
          { to: '/exercises', label: 'All exercises' },
          { to: '/workouts/new', label: 'Build a workout' },
        ]}
      />
      <PageIntro eyebrow="Library" title="Muscle groups">
        <p>Start with the area you want to train. Each group opens the exercises that work it.</p>
      </PageIntro>
      {state.status === 'loading' ? <LoadingState label="Loading muscle groups…" /> : null}
      {state.status === 'error' ? (
        <ErrorState
          title="Could not load muscle groups"
          message={state.message}
          onRetry={state.retry}
        />
      ) : null}
      {state.status === 'ready' && state.data.data.length === 0 ? (
        <EmptyState
          title="No muscle groups yet"
          body="The catalogue has not been seeded. Load the seed data, then refresh this page."
        />
      ) : null}
      {state.status === 'ready' && state.data.data.length > 0 ? (
        <div className="space-y-8">
          {regionOrder.map((region) => {
            const muscles = state.data.data.filter((muscle) => muscle.anatomicalRegion === region);
            if (muscles.length === 0) {
              return null;
            }
            return (
              <section key={region}>
                <h2 className="font-display text-3xl font-semibold">{region}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {muscles.map((muscle) => (
                    <li key={muscle.id}>
                      <Link
                        to={`/exercises?muscle=${muscle.slug}`}
                        className="block rounded-2xl border border-line bg-card p-5 hover:border-accent"
                      >
                        <span className="font-display text-3xl font-semibold">{muscle.name}</span>
                        <span className="mt-2 block text-sm text-muted">
                          {muscle.exerciseCount}{' '}
                          {muscle.exerciseCount === 1 ? 'exercise' : 'exercises'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
