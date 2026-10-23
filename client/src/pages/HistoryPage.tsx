import { Link } from 'react-router-dom';
import { useApi } from '../api';
import { PageNav } from '../components/PageNav';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import { labelExperience, labelGoal } from '../labels';
import type {
  ExerciseTrend,
  WorkoutHistoryItem,
  WorkoutHistoryResponse,
  WorkoutProgress,
  WorkoutStatus,
} from '../types';

const statusGroups: { status: WorkoutStatus; title: string }[] = [
  { status: 'started', title: 'In progress' },
  { status: 'completed', title: 'Completed' },
  { status: 'draft', title: 'Saved drafts' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatValue(value: number, unit: ExerciseTrend['unit']) {
  return unit === 'kg' ? `${value} kg` : `${value} reps`;
}

function trendLine(trend: ExerciseTrend) {
  const first = trend.points[0]!;
  const last = trend.points[trend.points.length - 1]!;
  return `${trend.name}: ${formatValue(first.value, trend.unit)} to ${formatValue(last.value, trend.unit)} over ${trend.points.length} sessions`;
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function ProgressSummary({ progress }: { progress: WorkoutProgress }) {
  return (
    <section aria-labelledby="progress-heading" className="mb-10">
      <h2 id="progress-heading" className="font-display text-3xl font-semibold">
        Progress
      </h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-sm text-muted">Completed in the last 7 days</dt>
          <dd className="mt-1 font-display text-4xl font-semibold">{progress.completedLast7Days}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-sm text-muted">Completed in the last 28 days</dt>
          <dd className="mt-1 font-display text-4xl font-semibold">{progress.completedLast28Days}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-sm text-muted">Weeks in a row with a session</dt>
          <dd className="mt-1 font-display text-4xl font-semibold">{progress.weekStreak}</dd>
        </div>
      </dl>
      {progress.muscles.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-semibold">Completed sessions by muscle</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {progress.muscles.map((muscle) => (
              <li
                key={muscle.slug}
                className="rounded-full border border-line bg-card px-3 py-1 text-sm"
              >
                {muscle.name}: {muscle.completed}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6">
        <h3 className="font-semibold">Best set by exercise</h3>
        {progress.trends.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm">
            {progress.trends.map((trend) => (
              <li key={trend.slug}>{trendLine(trend)}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Trends appear once an exercise has logged sets in two completed sessions.
          </p>
        )}
      </div>
    </section>
  );
}

function SessionCard({ workout }: { workout: WorkoutHistoryItem }) {
  const date = workout.completedAt ?? workout.startedAt ?? workout.createdAt;
  return (
    <li>
      <Link
        to={`/workouts/${workout.id}`}
        className="block rounded-2xl border border-line bg-card p-5 hover:border-accent"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-2xl font-semibold">{workout.muscle.name} workout</h3>
          <span className="text-sm text-muted">{formatDate(date)}</span>
        </div>
        <p className="mt-2 text-sm">
          {labelGoal(workout.goal)} · {labelExperience(workout.experience)} · about{' '}
          {workout.estimatedMinutes} minutes
        </p>
        <p className="mt-1 text-sm">
          {workout.setsLogged} of {plural(workout.setsPlanned, 'set')} logged
        </p>
      </Link>
    </li>
  );
}

function HistoryList() {
  const history = useApi<WorkoutHistoryResponse>('/api/v1/workouts');

  if (history.status === 'loading') {
    return <LoadingState label="Loading history…" />;
  }
  if (history.status === 'error') {
    return (
      <ErrorState
        title="Could not load your history"
        message={history.message}
        onRetry={history.retry}
      />
    );
  }
  if (history.data.data.length === 0) {
    return (
      <EmptyState
        title="No workouts yet"
        body="Build and save a workout. It will appear here with the sets you log."
      />
    );
  }

  return (
    <>
      <ProgressSummary progress={history.data.meta.progress} />
      {statusGroups.map((group) => {
        const items = history.data.data.filter((workout) => workout.status === group.status);
        if (items.length === 0) return null;
        return (
          <section key={group.status} className="mb-8" aria-labelledby={`group-${group.status}`}>
            <h2 id={`group-${group.status}`} className="mb-3 font-display text-3xl font-semibold">
              {group.title}
            </h2>
            <ul className="grid gap-3">
              {items.map((workout) => (
                <SessionCard key={workout.id} workout={workout} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export function HistoryPage() {
  return (
    <>
      <PageNav fallbackTo="/" links={[{ to: '/workouts/new', label: 'Build a workout' }]} />
      <PageIntro eyebrow="History" title="Your sessions">
        <p>
          Your 50 newest workouts, with the sets you logged. Only you can see them.
        </p>
      </PageIntro>
      <HistoryList />
    </>
  );
}
