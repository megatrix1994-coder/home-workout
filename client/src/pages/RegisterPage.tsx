import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../auth-context';
import { FormError, TextField } from '../components/Form';
import { errorMessage, primaryButtonClass } from '../components/form-styles';
import { LoadingState, PageIntro } from '../components/Status';

const PASSWORD_MIN_LENGTH = 10;

export function RegisterPage() {
  const { state } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (state.status === 'loading') {
    return <LoadingState label="Checking your sign-in…" />;
  }
  if (state.status === 'ready' && state.user) {
    return <Navigate to="/" replace />;
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
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
      setSubmitted(true);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create your account.'));
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <>
        <PageIntro eyebrow="Home Workout" title="Waiting for approval">
          <p>
            The admin has your request. After they approve you, sign in on this phone or computer
            with the same email and password. No invite email is needed.
          </p>
        </PageIntro>
        <p>
          <Link to="/login" className={`${primaryButtonClass} inline-block`}>
            Go to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageIntro eyebrow="Home Workout" title="Create an account">
        <p>
          Use this on a phone or a laptop. You pick the password now. The admin still has to
          approve you before you can use the app.
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
          {pending ? 'Sending request…' : 'Request access'}
        </button>
        <p className="text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="underline">
            Sign in
          </Link>
          . The admin can still send an invite if they prefer.
        </p>
      </form>
    </>
  );
}
