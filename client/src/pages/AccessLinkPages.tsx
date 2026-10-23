import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest, useApi } from '../api';
import { useAuth } from '../auth-context';
import { FormError, TextField } from '../components/Form';
import {
  errorMessage,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/form-styles';
import { EmptyState, LoadingState, PageIntro } from '../components/Status';
import type { AccessLink, AuthUser, ItemResponse } from '../types';

const PASSWORD_MIN_LENGTH = 10;

function useAccessLink(kind: AccessLink['kind']) {
  const { token = '' } = useParams();
  const link = useApi<ItemResponse<AccessLink>>(
    `/api/v1/auth/tokens/${encodeURIComponent(token)}`,
  );
  const valid = link.status === 'ready' && link.data.data.kind === kind;
  return { token, link, valid };
}

function LinkGate({
  status,
  valid,
  children,
}: {
  status: 'loading' | 'error' | 'ready';
  valid: boolean;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  if (status === 'loading') {
    return <LoadingState label="Checking your link…" />;
  }
  if (!valid) {
    return (
      <EmptyState
        title="This link is no longer valid"
        body="It may have been used, revoked, or expired. Ask the admin for a new one."
      />
    );
  }
  if (user) {
    return (
      <div className="max-w-md space-y-4">
        <p>
          You are signed in as {user.email}. Sign out first to use this link.
        </p>
        <button type="button" className={secondaryButtonClass} onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

function passwordProblem(password: string, confirm: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return 'The two passwords do not match.';
  }
  return null;
}

export function AcceptInvitePage() {
  const { token, link, valid } = useAccessLink('invite');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const lockedEmail = link.status === 'ready' ? link.data.data.email : null;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<ItemResponse<AuthUser>>('/api/v1/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, email: lockedEmail ?? email, name, password }),
      });
      signIn(response.data);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create your account.'));
      setPending(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Invite" title="Create your account">
        <p>Your workouts and history will be saved to this account and seen only by you.</p>
      </PageIntro>
      <LinkGate status={link.status} valid={valid}>
        <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            readOnly={Boolean(lockedEmail)}
            value={lockedEmail ?? email}
            onChange={(event) => setEmail(event.target.value)}
            hint={lockedEmail ? 'This invite is for this email address.' : undefined}
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
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </LinkGate>
    </>
  );
}

export function ResetPasswordPage() {
  const { token, link, valid } = useAccessLink('reset');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<ItemResponse<AuthUser>>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      signIn(response.data);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, 'Could not set your password.'));
      setPending(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Password reset" title="Choose a new password">
        {link.status === 'ready' && link.data.data.email ? (
          <p>For {link.data.data.email}. Other devices will be signed out.</p>
        ) : null}
      </PageIntro>
      <LinkGate status={link.status} valid={valid}>
        <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <FormError message={error} />
          <button type="submit" className={primaryButtonClass} disabled={pending}>
            {pending ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </LinkGate>
    </>
  );
}
