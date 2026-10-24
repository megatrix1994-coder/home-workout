import { Link } from 'react-router-dom';
import { PageIntro } from '../components/Status';

export function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-6 leading-7">
      <PageIntro eyebrow="Legal" title="Privacy notice">
        <p>
          Home Workout is limited to people the admin approves, either after they create an account
          or from an invite. This notice describes what the app stores, why, and how to ask for a
          copy or deletion. It is written for a small Kenyan service under the Data Protection Act,
          2019.
        </p>
      </PageIntro>
      <section>
        <h2 className="font-display text-2xl font-semibold">Who is responsible</h2>
        <p className="mt-2">
          The admin who approved or invited you is the data controller. Contact them through the
          channel they used, or through the app if you already have access.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold">What is stored</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Your email, name, role, and a hashed password. The app never stores the password itself.</li>
          <li>A session cookie on your device so you stay signed in for 30 days.</li>
          <li>Workouts you save, including the exercises, set logs, and cooldown choices.</li>
          <li>When you last used the app, so the admin can see who is active.</li>
        </ul>
        <p className="mt-3">
          The exercise catalogue, demonstration clips, and meal suggestions are shared content, not
          personal data.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold">Why it is stored</h2>
        <p className="mt-2">
          The account is used to keep your workouts private and to let the admin decide who may use
          the app. Workout logs are used to show your history and to suggest the next load.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold">Where it is stored</h2>
        <p className="mt-2">
          Data lives in the PostgreSQL database attached to the hosted app. The host and the
          database region are chosen by the admin. Backups stay with that host.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold">How long it is kept</h2>
        <p className="mt-2">
          Your account and workouts stay until the admin removes access or deletes the account, or
          until you ask for deletion. Removed access keeps the workouts so they can be restored.
          Deleting the account removes the workouts as well.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold">Your rights</h2>
        <p className="mt-2">
          Ask the admin for a copy of your account and workouts, to correct your name or email, or
          to delete the account. You can also change your password on the{' '}
          <Link to="/account" className="underline">
            Account
          </Link>{' '}
          page. The Office of the Data Protection Commissioner can receive a complaint if you are
          not satisfied.
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold">Cookies</h2>
        <p className="mt-2">
          The only cookie is <code>hw_session</code>. It is HttpOnly, SameSite=Lax, and Secure on
          HTTPS. Signing out deletes it.
        </p>
      </section>
    </article>
  );
}
