import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold ${
    isActive ? 'bg-accent text-on-accent' : 'text-ink hover:bg-card'
  }`;

export function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const workoutActive = location.pathname.startsWith('/workouts');

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <NavLink
            to="/"
            className="font-display text-2xl font-semibold tracking-wide"
          >
            Home Workout
          </NavLink>
          {user ? (
            <nav className="flex flex-wrap items-center gap-2" aria-label="Primary">
              <NavLink
                to="/workouts/new"
                className={() => linkClass({ isActive: workoutActive })}
              >
                Workout
              </NavLink>
              <NavLink to="/muscles" className={linkClass}>
                Muscles
              </NavLink>
              <NavLink to="/stretches" className={linkClass}>
                Stretches
              </NavLink>
              <NavLink to="/exercises" className={linkClass}>
                Exercises
              </NavLink>
              <NavLink to="/nutrition" className={linkClass}>
                Meals
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>
              {user.role === 'admin' ? (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              ) : null}
              <NavLink to="/account" className={linkClass} aria-label={`Account: ${user.name}`}>
                {user.name}
              </NavLink>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink hover:bg-card"
              >
                Sign out
              </button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm text-muted">
          <p>Home Workout keeps each person&apos;s workouts on their own account.</p>
          <NavLink to="/privacy" className="underline">
            Privacy
          </NavLink>
        </div>
      </footer>
    </div>
  );
}
