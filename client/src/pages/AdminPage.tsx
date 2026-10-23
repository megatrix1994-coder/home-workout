import { useState, type FormEvent } from 'react';
import { apiRequest, useApi } from '../api';
import { useAuth } from '../auth-context';
import { FormError, TextField } from '../components/Form';
import {
  dangerButtonClass,
  errorMessage,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/form-styles';
import { EmptyState, ErrorState, LoadingState, PageIntro } from '../components/Status';
import type {
  AdminUser,
  CreatedLink,
  ItemResponse,
  PendingInvite,
  UserRole,
} from '../types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function LinkPanel({
  title,
  link,
  message,
  onClose,
}: {
  title: string;
  link: CreatedLink;
  message: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div role="status" className="mt-4 rounded-2xl border border-accent bg-card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">
        This link is shown once and works until {formatDate(link.expiresAt)}. Send it privately.
      </p>
      <input
        readOnly
        aria-label="Link"
        value={link.url}
        onFocus={(event) => event.target.select()}
        className={`${inputClass} font-mono text-sm`}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a
          className={secondaryButtonClass}
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${link.url}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on WhatsApp
        </a>
        <button type="button" className={secondaryButtonClass} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function InviteSection({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<ItemResponse<CreatedLink>>('/api/v1/admin/invites', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() || undefined, role }),
      });
      setCreated(response.data);
      setEmail('');
      setRole('member');
      onCreated();
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create the invite.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="invite-heading" className="mb-10">
      <h2 id="invite-heading" className="font-display text-3xl font-semibold">
        Invite someone
      </h2>
      <form onSubmit={submit} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <TextField
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hint="With an email, only that address can use the link."
        />
        <label className="block self-start text-sm font-semibold">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className={inputClass}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className={`${primaryButtonClass} self-start sm:mt-6`} disabled={pending}>
          {pending ? 'Creating…' : 'Create invite link'}
        </button>
      </form>
      <FormError message={error} />
      {created ? (
        <LinkPanel
          title={created.email ? `Invite for ${created.email}` : 'Invite link'}
          link={created}
          message="You're invited to Home Workout. Create your account here:"
          onClose={() => setCreated(null)}
        />
      ) : null}
    </section>
  );
}

function PendingInvites({ refreshKey }: { refreshKey: number }) {
  const invites = useApi<ItemResponse<PendingInvite[]>>(`/api/v1/admin/invites?r=${refreshKey}`);
  const [error, setError] = useState<string | null>(null);

  async function revoke(id: string) {
    setError(null);
    try {
      await apiRequest(`/api/v1/admin/invites/${id}`, { method: 'DELETE' });
      invites.retry();
    } catch (caught) {
      setError(errorMessage(caught, 'Could not revoke the invite.'));
    }
  }

  return (
    <section aria-labelledby="pending-heading" className="mb-10">
      <h2 id="pending-heading" className="font-display text-3xl font-semibold">
        Pending invites
      </h2>
      <FormError message={error} />
      {invites.status === 'loading' ? <LoadingState label="Loading invites…" /> : null}
      {invites.status === 'error' ? (
        <ErrorState title="Could not load invites" message={invites.message} onRetry={invites.retry} />
      ) : null}
      {invites.status === 'ready' && invites.data.data.length === 0 ? (
        <p className="mt-2 text-muted">No unused invites.</p>
      ) : null}
      {invites.status === 'ready' && invites.data.data.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {invites.data.data.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
            >
              <span>
                <span className="font-semibold">{invite.email ?? 'Anyone with the link'}</span>
                <span className="text-sm text-muted">
                  {' '}
                  · {invite.role === 'admin' ? 'Admin' : 'Member'} · expires {formatDate(invite.expiresAt)}
                </span>
              </span>
              <button
                type="button"
                className={dangerButtonClass}
                onClick={() => void revoke(invite.id)}
                aria-label={`Revoke invite for ${invite.email ?? 'anyone with the link'}`}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function UserRow({
  user,
  isSelf,
  onChanged,
}: {
  user: AdminUser;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<CreatedLink | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  async function run(action: () => Promise<unknown>, fallback: string) {
    setPending(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (caught) {
      setError(errorMessage(caught, fallback));
    } finally {
      setPending(false);
    }
  }

  const post = (path: string) =>
    apiRequest(`/api/v1/admin/users/${user.id}/${path}`, { method: 'POST' });

  async function createResetLink() {
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<ItemResponse<CreatedLink>>(
        `/api/v1/admin/users/${user.id}/reset-link`,
        { method: 'POST' },
      );
      setResetLink(response.data);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create a reset link.'));
    } finally {
      setPending(false);
    }
  }

  const removed = user.status === 'removed';

  return (
    <li className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl font-semibold">
          {user.name}
          {isSelf ? <span className="text-base text-muted"> (you)</span> : null}
        </h3>
        <span className={`text-sm font-semibold ${removed ? 'text-danger' : 'text-muted'}`}>
          {removed ? 'Access removed' : user.role === 'admin' ? 'Admin' : 'Member'}
        </span>
      </div>
      <p className="mt-1 text-sm">{user.email}</p>
      <p className="mt-1 text-sm text-muted">
        {user.workoutCount} workout{user.workoutCount === 1 ? '' : 's'} · joined {formatDate(user.createdAt)}
        {user.lastSeenAt ? ` · last seen ${formatDate(user.lastSeenAt)}` : ''}
      </p>
      {isSelf ? null : (
        <div className="mt-4 flex flex-wrap gap-2">
          {removed ? (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={pending}
              onClick={() => void run(() => post('restore'), 'Could not restore access.')}
            >
              Restore access
            </button>
          ) : (
            <>
              <button
                type="button"
                className={dangerButtonClass}
                disabled={pending}
                onClick={() => void run(() => post('remove'), 'Could not remove access.')}
              >
                Remove access
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={pending}
                onClick={() => void createResetLink()}
              >
                Password reset link
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={pending}
                onClick={() =>
                  void run(
                    () =>
                      apiRequest(`/api/v1/admin/users/${user.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ role: user.role === 'admin' ? 'member' : 'admin' }),
                      }),
                    'Could not change the role.',
                  )
                }
              >
                {user.role === 'admin' ? 'Make member' : 'Make admin'}
              </button>
            </>
          )}
          <button
            type="button"
            className={dangerButtonClass}
            disabled={pending}
            onClick={() => setConfirming((value) => !value)}
          >
            Delete account
          </button>
        </div>
      )}
      {confirming ? (
        <form
          className="mt-4 max-w-md space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () =>
                apiRequest(`/api/v1/admin/users/${user.id}`, {
                  method: 'DELETE',
                  body: JSON.stringify({ confirmEmail }),
                }),
              'Could not delete the account.',
            );
          }}
        >
          <TextField
            label={`Type ${user.email} to delete this account and all its workouts`}
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
          />
          <button
            type="submit"
            className={dangerButtonClass}
            disabled={pending || confirmEmail.trim().toLowerCase() !== user.email}
          >
            Delete permanently
          </button>
        </form>
      ) : null}
      <FormError message={error} />
      {resetLink ? (
        <LinkPanel
          title={`Password reset link for ${user.name}`}
          link={resetLink}
          message="Set a new Home Workout password here:"
          onClose={() => setResetLink(null)}
        />
      ) : null}
    </li>
  );
}

function UsersSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { user: me } = useAuth();
  const users = useApi<ItemResponse<AdminUser[]>>(`/api/v1/admin/users?r=${refreshKey}`);

  return (
    <section aria-labelledby="users-heading">
      <h2 id="users-heading" className="font-display text-3xl font-semibold">
        People
      </h2>
      {users.status === 'loading' ? <LoadingState label="Loading people…" /> : null}
      {users.status === 'error' ? (
        <ErrorState title="Could not load people" message={users.message} onRetry={users.retry} />
      ) : null}
      {users.status === 'ready' && users.data.data.length === 0 ? (
        <EmptyState title="No accounts yet" body="Create an invite link to add someone." />
      ) : null}
      {users.status === 'ready' && users.data.data.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {users.data.data.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === me?.id} onChanged={onChanged} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function AdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((value) => value + 1);

  return (
    <>
      <PageIntro eyebrow="Admin" title="Manage access">
        <p>
          Invite people with a one-time link. Removing access signs a person out at once and keeps
          their workouts, so you can restore them later.
        </p>
      </PageIntro>
      <InviteSection onCreated={refresh} />
      <PendingInvites refreshKey={refreshKey} />
      <UsersSection refreshKey={refreshKey} onChanged={refresh} />
    </>
  );
}
