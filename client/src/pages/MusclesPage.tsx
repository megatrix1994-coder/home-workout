import { Link } from 'react-router-dom';
import { muscleImage, muscleMark } from '../ambience';
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
                  {muscles.map((muscle) => {
                    const src = muscleImage(muscle.slug);
                    const mark = muscleMark[muscle.slug] ?? { top: '46%', left: '50%' };
                    return (
                    <li key={muscle.id}>
                      <Link
                        to={`/exercises?muscle=${muscle.slug}`}
                        className="relative block overflow-hidden rounded-2xl border border-line bg-card hover:border-accent"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt=""
                            className="aspect-square w-full object-cover"
                            style={
                              mark.scale
                                ? {
                                    transform: `scale(${mark.scale})`,
                                    transformOrigin: `${mark.left} ${mark.top}`,
                                  }
                                : undefined
                            }
                          />
                        ) : (
                          <span className="block aspect-square" />
                        )}
                        <span
                          className="absolute flex max-w-[78%] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl bg-paper/80 px-2.5 py-1.5 text-center"
                          style={{ top: mark.top, left: mark.left }}
                        >
                          <span className="font-display text-xl font-semibold leading-tight">
                            {muscle.name}
                          </span>
                          <span className="mt-1 text-sm text-muted">
                            {muscle.exerciseCount}{' '}
                            {muscle.exerciseCount === 1 ? 'exercise' : 'exercises'}
                          </span>
                        </span>
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
