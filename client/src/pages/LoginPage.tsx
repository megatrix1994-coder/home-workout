import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { safeNext, signInRequest, useAuth } from '../auth-context';
import { FormError, TextField } from '../components/Form';
import { errorMessage, primaryButtonClass } from '../components/form-styles';
import { LoadingState, PageIntro } from '../components/Status';

export function LoginPage() {
  const { state, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === 'loading') {
    return <LoadingState label="Checking your sign-in…" />;
  }
  if (state.status === 'ready' && state.user) {
    return <Navigate to={next} replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      signIn(await signInRequest(email, password));
      navigate(next, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, 'Could not sign in.'));
      setPending(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Home Workout" title="Sign in">
        <p>Your workouts and history are saved to your account. Access is by invite from the admin.</p>
      </PageIntro>
      <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <FormError message={error} />
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-muted">
          Forgot your password? Ask the admin for a reset link.{' '}
          <Link to="/privacy" className="underline">
            Privacy notice
          </Link>
        </p>
      </form>
    </>
  );
}
