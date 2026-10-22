import { NavLink, Outlet, useLocation } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold ${
    isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-white'
  }`;

export function Layout() {
  const location = useLocation();
  const workoutActive = location.pathname.startsWith('/workouts');

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <NavLink
            to="/"
            className="font-display text-2xl font-semibold tracking-wide"
          >
            Home Workout
          </NavLink>
          <nav className="flex gap-2" aria-label="Primary">
            <NavLink
              to="/workouts/new"
              className={() => linkClass({ isActive: workoutActive })}
            >
              Workout
            </NavLink>
            <NavLink to="/muscles" className={linkClass}>
              Muscles
            </NavLink>
            <NavLink to="/exercises" className={linkClass}>
              Exercises
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}
