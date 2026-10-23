import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiRequest, onUnauthorized } from './api';
import { AuthContext, useAuth, type AuthContextValue, type AuthState } from './auth-context';
import { EmptyState, ErrorState, LoadingState } from './components/Status';
import { clearLegacyWorkoutKeys } from './storage';
import type { AuthUser } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    fetch('/api/v1/auth/me')
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          setState({ status: 'ready', user: null });
          return;
        }
        const body = (await response.json().catch(() => null)) as {
          data?: AuthUser;
          error?: { message?: string };
        } | null;
        if (!response.ok || !body?.data) {
          setState({
            status: 'error',
            message: body?.error?.message ?? 'Could not check your sign-in.',
          });
          return;
        }
        setState({ status: 'ready', user: body.data });
      })
      .catch(() => {
        if (active) {
          setState({ status: 'error', message: 'Could not reach the server.' });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    onUnauthorized(() => setState({ status: 'ready', user: null }));
    return () => onUnauthorized(null);
  }, []);

  const signIn = useCallback((user: AuthUser) => {
    clearLegacyWorkoutKeys();
    setState({ status: 'ready', user });
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
    setState({ status: 'ready', user: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'ready' ? state.user : null,
      signIn,
      signOut,
      reload: () => setAttempt((count) => count + 1),
    }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireUser() {
  const { state, reload } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') {
    return <LoadingState label="Checking your sign-in…" />;
  }
  if (state.status === 'error') {
    return <ErrorState title="Could not check your sign-in" message={state.message} onRetry={reload} />;
  }
  if (!state.user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return (
      <EmptyState
        title="Admins only"
        body="This page is for the app admin. Ask them if you need a change to your access."
      />
    );
  }
  return <Outlet />;
}
