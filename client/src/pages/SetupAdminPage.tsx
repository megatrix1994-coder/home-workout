import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../auth-context';
import { FormError, TextField } from '../components/Form';
import { errorMessage, primaryButtonClass } from '../components/form-styles';
import { LoadingState, PageIntro } from '../components/Status';
import type { AuthUser, ItemResponse } from '../types';

const PASSWORD_MIN_LENGTH = 10;

export function SetupAdminPage() {
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const [needed, setNeeded] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/setup-admin')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: { data?: { needed?: boolean } } | null) => {
        if (active) {
          setNeeded(Boolean(body?.data?.needed));
        }
      })
      .catch(() => {
        if (active) {
          setNeeded(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading' || needed === null) {
    return <LoadingState label="Checking the admin account…" />;
  }
  if (state.status === 'ready' && state.user) {
    return <Navigate to={state.user.role === 'admin' ? '/admin' : '/'} replace />;
  }
  if (!needed) {
    return <Navigate to="/login" replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<ItemResponse<AuthUser>>('/api/v1/auth/setup-admin', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
      signIn(response.data);
      navigate('/admin', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create the admin account.'));
      setPending(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Home Workout" title="Create the admin account">
        <p>
          This account is the first admin. It can approve or dismiss people, invite them, and make
          another person an admin. Choose the email, name, and password you will use to sign in on
          a desktop or a laptop.
        </p>
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
          label="Name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <FormError message={error} />
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? 'Creating…' : 'Create admin'}
        </button>
        <p className="text-sm text-muted">
          Already an admin?{' '}
          <Link to="/login" className="underline">
            Sign in
          </Link>
          .
        </p>
      </form>
    </>
  );
}
