import { useState, type FormEvent } from 'react';
import { apiRequest, useApi } from '../api';
import { useAuth } from '../auth-context';
import { inviteGmailHref, inviteMailtoHref } from '../invite-mail';
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
  const [copied, setCopied] = useState<'link' | 'mobile' | null>(null);
  const phoneUrl = link.mobileUrl && link.mobileUrl !== link.url ? link.mobileUrl : null;

  async function copy(value: string, kind: 'link' | 'mobile') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div role="status" className="mt-4 rounded-2xl border border-accent bg-card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">
        The app does not send mail by itself. This link is shown once and works until{' '}
        {formatDate(link.expiresAt)}. Send it now with Email or WhatsApp.
      </p>
      <input
        readOnly
        aria-label="Link"
        value={link.url}
        onFocus={(event) => event.target.select()}
        className={`${inputClass} font-mono text-sm`}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {link.email ? (
          <>
            <a
              className={primaryButtonClass}
              href={inviteGmailHref(link.email, link.url)}
              target="_blank"
              rel="noreferrer"
            >
              Send email
            </a>
            <a className={secondaryButtonClass} href={inviteMailtoHref(link.email, link.url)}>
              Open mail app
            </a>
          </>
        ) : null}
        <button type="button" className={secondaryButtonClass} onClick={() => void copy(link.url, 'link')}>
          {copied === 'link' ? 'Copied' : 'Copy link'}
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
      {phoneUrl ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm text-muted">
            Phone on this Wi‑Fi: keep the app running on this computer. Allow inbound TCP on this
            port if the page does not load. The link works once and lasts 7 days.
          </p>
          <input
            readOnly
            aria-label="Phone link"
            value={phoneUrl}
            onFocus={(event) => event.target.select()}
            className={`${inputClass} font-mono text-sm`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {link.email ? (
              <>
                <a
                  className={primaryButtonClass}
                  href={inviteGmailHref(link.email, phoneUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Send mobile link
                </a>
                <a
                  className={secondaryButtonClass}
                  href={inviteMailtoHref(link.email, phoneUrl)}
                  aria-label="Open mail app with mobile link"
                >
                  Open mail app
                </a>
              </>
            ) : null}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void copy(phoneUrl, 'mobile')}
            >
              {copied === 'mobile' ? 'Copied mobile link' : 'Copy mobile link'}
            </button>
            <a
              className={secondaryButtonClass}
              href={`https://wa.me/?text=${encodeURIComponent(`${message} ${phoneUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Share mobile link on WhatsApp
            </a>
          </div>
        </div>
      ) : link.mobileUrl ? null : (
        <p className="mt-4 text-sm text-muted">A phone link is unavailable on this computer.</p>
      )}
    </div>
  );
}

function InviteSection({
  created,
  onCreated,
  onClose,
}: {
  created: CreatedLink | null;
  onCreated: (link: CreatedLink) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await apiRequest<ItemResponse<CreatedLink>>('/api/v1/admin/invites', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() || undefined, role }),
      });
      onCreated(response.data);
      setEmail('');
      setRole('member');
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
          hint="Required to send the invite. Only that address can use the link. The app does not email them until you click Send email."
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
          {pending ? 'Creating…' : 'Create invite'}
        </button>
      </form>
      <FormError message={error} />
      {created ? (
        <LinkPanel
          title={created.email ? `Invite for ${created.email}` : 'Invite link'}
          link={created}
          message="You're invited to Home Workout. Create your account here:"
          onClose={onClose}
        />
      ) : null}
    </section>
  );
}

function PendingInvites({
  refreshKey,
  onResent,
}: {
  refreshKey: number;
  onResent: (link: CreatedLink) => void;
}) {
  const invites = useApi<ItemResponse<PendingInvite[]>>(`/api/v1/admin/invites?r=${refreshKey}`);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    setError(null);
    try {
      await apiRequest(`/api/v1/admin/invites/${id}`, { method: 'DELETE' });
      invites.retry();
    } catch (caught) {
      setError(errorMessage(caught, 'Could not revoke the invite.'));
    }
  }

  async function sendAgain(invite: PendingInvite) {
    setError(null);
    setBusyId(invite.id);
    try {
      await apiRequest(`/api/v1/admin/invites/${invite.id}`, { method: 'DELETE' });
      const response = await apiRequest<ItemResponse<CreatedLink>>('/api/v1/admin/invites', {
        method: 'POST',
        body: JSON.stringify({ email: invite.email ?? undefined, role: invite.role }),
      });
      onResent(response.data);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not create a new invite to send.'));
    } finally {
      setBusyId(null);
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
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => void sendAgain(invite)}
                  disabled={busyId === invite.id}
                >
                  {busyId === invite.id ? 'Creating…' : 'New link to send'}
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  onClick={() => void revoke(invite.id)}
                  aria-label={`Revoke invite for ${invite.email ?? 'anyone with the link'}`}
                >
                  Revoke
                </button>
              </span>
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
          {removed
            ? 'Access removed'
            : user.status === 'pending'
              ? 'Waiting for approval'
              : user.role === 'admin'
                ? 'Admin'
                : 'Member'}
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

function AccessRequests({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const users = useApi<ItemResponse<AdminUser[]>>(`/api/v1/admin/users?r=${refreshKey}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requests =
    users.status === 'ready' ? users.data.data.filter((user) => user.status === 'pending') : [];

  async function decide(id: string, action: 'approve' | 'decline') {
    setError(null);
    setBusyId(id);
    try {
      await apiRequest(`/api/v1/admin/users/${id}/${action}`, { method: 'POST' });
      onChanged();
    } catch (caught) {
      setError(errorMessage(caught, action === 'approve' ? 'Could not approve.' : 'Could not decline.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="requests-heading" className="mb-10">
      <h2 id="requests-heading" className="font-display text-3xl font-semibold">
        Access requests
      </h2>
      <p className="mt-2 text-sm text-muted">
        People who created an account on a phone or laptop wait here. Approving lets them sign in
        with the password they already chose.
      </p>
      <FormError message={error} />
      {users.status === 'loading' ? <LoadingState label="Loading requests…" /> : null}
      {users.status === 'error' ? (
        <ErrorState title="Could not load requests" message={users.message} onRetry={users.retry} />
      ) : null}
      {users.status === 'ready' && requests.length === 0 ? (
        <p className="mt-2 text-muted">No one is waiting for approval.</p>
      ) : null}
      {requests.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {requests.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
            >
              <span>
                <span className="font-semibold">{user.name}</span>
                <span className="text-sm text-muted">
                  {' '}
                  · {user.email} · requested {formatDate(user.createdAt)}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={busyId === user.id}
                  onClick={() => void decide(user.id, 'approve')}
                >
                  {busyId === user.id ? 'Saving…' : 'Approve'}
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  disabled={busyId === user.id}
                  onClick={() => void decide(user.id, 'decline')}
                  aria-label={`Decline access for ${user.name}`}
                >
                  Decline
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function UsersSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { user: me } = useAuth();
  const users = useApi<ItemResponse<AdminUser[]>>(`/api/v1/admin/users?r=${refreshKey}`);
  const people =
    users.status === 'ready' ? users.data.data.filter((user) => user.status !== 'pending') : [];

  return (
    <section aria-labelledby="users-heading">
      <h2 id="users-heading" className="font-display text-3xl font-semibold">
        People
      </h2>
      {users.status === 'loading' ? <LoadingState label="Loading people…" /> : null}
      {users.status === 'error' ? (
        <ErrorState title="Could not load people" message={users.message} onRetry={users.retry} />
      ) : null}
      {users.status === 'ready' && people.length === 0 ? (
        <EmptyState title="No accounts yet" body="Approve a request or create an invite link to add someone." />
      ) : null}
      {people.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {people.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === me?.id} onChanged={onChanged} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function AdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const refresh = () => setRefreshKey((value) => value + 1);

  function showLink(link: CreatedLink) {
    setCreated(link);
    refresh();
  }

  return (
    <>
      <PageIntro eyebrow="Admin" title="Manage access">
        <p>
          People can create an account on a phone or laptop and wait here for approval. You can
          still send an invite with Email or WhatsApp if you prefer. Removing access signs a person
          out at once and keeps their workouts, so you can restore them later.
        </p>
      </PageIntro>
      <AccessRequests refreshKey={refreshKey} onChanged={refresh} />
      <InviteSection created={created} onCreated={showLink} onClose={() => setCreated(null)} />
      <PendingInvites refreshKey={refreshKey} onResent={showLink} />
      <UsersSection refreshKey={refreshKey} onChanged={refresh} />
    </>
  );
}
