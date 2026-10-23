import { useState, type FormEvent } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../auth-context';
import { FormError, TextField } from '../components/Form';
import {
  errorMessage,
  primaryButtonClass,
  secondaryButtonClass,
} from '../components/form-styles';
import { PageIntro } from '../components/Status';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    if (newPassword !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiRequest('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not change your password.'));
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <PageIntro eyebrow="Account" title={user.name}>
        <p>
          {user.email} · {user.role === 'admin' ? 'Admin' : 'Member'}
        </p>
      </PageIntro>
      <section aria-labelledby="password-heading" className="max-w-md">
        <h2 id="password-heading" className="font-display text-3xl font-semibold">
          Change password
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            hint="At least 10 characters. Other devices will be signed out."
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <FormError message={error} />
          {saved ? (
            <p role="status" className="text-sm font-semibold">
              Password changed.
            </p>
          ) : null}
          <button type="submit" className={primaryButtonClass} disabled={pending}>
            {pending ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>
      <section className="mt-10">
        <button type="button" className={secondaryButtonClass} onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </>
  );
}
