import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./db', async () => ({
  prisma: (await import('./test/fake-auth-db.js')).fakeDb,
}));

import { createApp } from './app.js';
import { clearAttempts, hashPassword, secureCookies, verifyPassword } from './lib/auth.js';
import { fakeDb, resetFakeDb, tables } from './test/fake-auth-db.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'correct-horse-battery';

function client() {
  return request.agent(app).set('Origin', ORIGIN);
}

async function addUser(email: string, role: 'admin' | 'member' = 'member', password = PASSWORD) {
  return fakeDb.user.create({
    data: { id: '', email, name: email.split('@')[0]!, passwordHash: await hashPassword(password), role },
  });
}

async function signIn(email: string, password = PASSWORD) {
  const agent = client();
  const response = await agent
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email, password });
  expect(response.status).toBe(200);
  return agent;
}

function tokenFrom(url: string) {
  return url.split('/').pop()!;
}

beforeEach(() => {
  resetFakeDb();
  clearAttempts();
});

describe('session cookies', () => {
  it('marks the cookie Secure only on HTTPS unless COOKIE_SECURE is set', () => {
    const previous = process.env.COOKIE_SECURE;
    delete process.env.COOKIE_SECURE;
    expect(secureCookies({ secure: false })).toBe(false);
    expect(secureCookies({ secure: true })).toBe(true);
    process.env.COOKIE_SECURE = 'true';
    expect(secureCookies({ secure: false })).toBe(true);
    process.env.COOKIE_SECURE = 'false';
    expect(secureCookies({ secure: true })).toBe(false);
    if (previous === undefined) {
      delete process.env.COOKIE_SECURE;
    } else {
      process.env.COOKIE_SECURE = previous;
    }
  });
});

describe('password hashing', () => {
  it('verifies the right password, rejects others, and salts every hash', async () => {
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);
    expect(first).not.toBe(second);
    expect(first.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword(PASSWORD, first)).toBe(true);
    expect(await verifyPassword('wrong-password', first)).toBe(false);
    expect(await verifyPassword(PASSWORD, 'plain-text')).toBe(false);
  });
});

describe('sign-in', () => {
  it('sets an http-only session cookie and reports who is signed in', async () => {
    await addUser('amina@example.com');
    const agent = client();
    const login = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: ' Amina@Example.com ', password: PASSWORD });

    expect(login.status).toBe(200);
    const cookie = String(login.headers['set-cookie']);
    expect(cookie).toContain('hw_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(tables.sessions[0]!.tokenHash).not.toBe(cookie.split(';')[0]!.split('=')[1]);

    const me = await agent.get('/api/v1/auth/me');
    expect(me.body.data).toMatchObject({ email: 'amina@example.com', role: 'member' });
    expect(me.body.data.passwordHash).toBeUndefined();

    await agent.post('/api/v1/auth/logout').set('Origin', ORIGIN);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
    expect(tables.sessions).toHaveLength(0);
  });

  it('gives one message for a wrong password or unknown email, then limits attempts', async () => {
    await addUser('amina@example.com');
    const wrong = await client()
      .post('/api/v1/auth/login')
      .send({ email: 'amina@example.com', password: 'not-the-password' });
    const unknown = await client()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'not-the-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.body.error).toEqual(wrong.body.error);

    for (let attempt = 0; attempt < 9; attempt += 1) {
      await client()
        .post('/api/v1/auth/login')
        .send({ email: 'amina@example.com', password: 'not-the-password' });
    }
    const limited = await client()
      .post('/api/v1/auth/login')
      .send({ email: 'amina@example.com', password: PASSWORD });
    expect(limited.status).toBe(429);
  });

  it('requires a session for the catalogue and workouts', async () => {
    expect((await client().get('/api/v1/muscles')).status).toBe(401);
    expect((await client().get('/api/v1/workouts')).status).toBe(401);
    const forged = await client().get('/api/v1/workouts').set('Cookie', 'hw_session=made-up');
    expect(forged.status).toBe(401);
  });

  it('rejects writes sent from another site', async () => {
    await addUser('amina@example.com');
    const response = await client()
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'amina@example.com', password: PASSWORD });
    expect(response.status).toBe(403);
    expect(tables.sessions).toHaveLength(0);
  });

  it('rejects writes that do not say where they came from', async () => {
    await addUser('amina@example.com');
    const bare = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'amina@example.com', password: PASSWORD });
    expect(bare.status).toBe(403);

    const sameOrigin = await request(app)
      .post('/api/v1/auth/login')
      .set('Sec-Fetch-Site', 'same-origin')
      .send({ email: 'amina@example.com', password: PASSWORD });
    expect(sameOrigin.status).toBe(200);
  });
});

describe('self-registration', () => {
  it('creates a pending account that can sign in only after the admin approves', async () => {
    await addUser('admin@example.com', 'admin');
    const admin = await signIn('admin@example.com');

    const created = await client()
      .post('/api/v1/auth/register')
      .send({ email: ' Friend@Example.com ', name: 'Friend', password: PASSWORD });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      email: 'friend@example.com',
      name: 'Friend',
      status: 'pending',
    });
    expect(created.headers['set-cookie']).toBeUndefined();

    const waiting = await client()
      .post('/api/v1/auth/login')
      .send({ email: 'friend@example.com', password: PASSWORD });
    expect(waiting.status).toBe(403);
    expect(waiting.body.error.code).toBe('ACCESS_PENDING');

    const again = await client()
      .post('/api/v1/auth/register')
      .send({ email: 'friend@example.com', name: 'Friend', password: PASSWORD });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REQUEST_PENDING');

    const pending = tables.users.find((user) => user.email === 'friend@example.com')!;
    expect((await admin.post(`/api/v1/admin/users/${pending.id}/approve`)).status).toBe(200);
    await signIn('friend@example.com');
  });

  it('lets the admin decline a request so the email can be used again', async () => {
    await addUser('admin@example.com', 'admin');
    const admin = await signIn('admin@example.com');
    await client()
      .post('/api/v1/auth/register')
      .send({ email: 'friend@example.com', name: 'Friend', password: PASSWORD });
    const pending = tables.users.find((user) => user.email === 'friend@example.com')!;
    expect((await admin.post(`/api/v1/admin/users/${pending.id}/decline`)).status).toBe(204);
    expect(tables.users.some((user) => user.email === 'friend@example.com')).toBe(false);

    const retry = await client()
      .post('/api/v1/auth/register')
      .send({ email: 'friend@example.com', name: 'Friend', password: PASSWORD });
    expect(retry.status).toBe(201);
  });
});

describe('invites', () => {
  it('creates an account once from an invite link and signs the person in', async () => {
    await addUser('admin@example.com', 'admin');
    const admin = await signIn('admin@example.com');

    const invite = await admin.post('/api/v1/admin/invites').set('Origin', ORIGIN).send({});
    expect(invite.status).toBe(201);
    expect(invite.body.data.url).toMatch(/^http:\/\/localhost:5173\/invite\/[\w-]{40,}$/);
    const token = tokenFrom(invite.body.data.url);
    const mobileUrl = invite.body.data.mobileUrl as string | null;
    if (mobileUrl) {
      expect(mobileUrl).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:5173\/invite\/[\w-]{40,}$/);
      expect(tokenFrom(mobileUrl)).toBe(token);
    } else {
      expect(mobileUrl).toBeNull();
    }
    expect(tables.tokens[0]!.tokenHash).not.toBe(token);

    const check = await client().get(`/api/v1/auth/tokens/${token}`);
    expect(check.body.data).toMatchObject({ kind: 'invite', email: null });

    const member = client();
    const accepted = await member.post('/api/v1/auth/accept-invite').set('Origin', ORIGIN).send({
      token,
      email: 'baraka@example.com',
      name: 'Baraka',
      password: PASSWORD,
    });
    expect(accepted.status).toBe(201);
    expect(accepted.body.data).toMatchObject({ email: 'baraka@example.com', role: 'member' });
    expect((await member.get('/api/v1/auth/me')).body.data.name).toBe('Baraka');

    const reused = await client().post('/api/v1/auth/accept-invite').send({
      token,
      email: 'someone@example.com',
      name: 'Someone',
      password: PASSWORD,
    });
    expect(reused.status).toBe(404);
    expect(tables.users).toHaveLength(2);
  });

  it('refuses an invite for another email, a revoked invite, and an expired invite', async () => {
    await addUser('admin@example.com', 'admin');
    const admin = await signIn('admin@example.com');
    const locked = await admin
      .post('/api/v1/admin/invites')
      .send({ email: 'Wanjiku@Example.com' });
    const lockedToken = tokenFrom(locked.body.data.url);

    const otherEmail = await client().post('/api/v1/auth/accept-invite').send({
      token: lockedToken,
      email: 'intruder@example.com',
      name: 'Intruder',
      password: PASSWORD,
    });
    expect(otherEmail.status).toBe(400);

    expect((await admin.delete(`/api/v1/admin/invites/${locked.body.data.id}`)).status).toBe(204);
    expect((await client().get(`/api/v1/auth/tokens/${lockedToken}`)).status).toBe(404);

    const open = await admin.post('/api/v1/admin/invites').send({});
    tables.tokens.at(-1)!.expiresAt = new Date(Date.now() - 1000);
    const expired = await client().post('/api/v1/auth/accept-invite').send({
      token: tokenFrom(open.body.data.url),
      email: 'late@example.com',
      name: 'Late',
      password: PASSWORD,
    });
    expect(expired.status).toBe(404);
    expect(tables.users).toHaveLength(1);
  });
});

describe('admin control', () => {
  it('keeps members out of admin routes', async () => {
    await addUser('member@example.com');
    const member = await signIn('member@example.com');
    expect((await member.get('/api/v1/admin/users')).status).toBe(403);
    expect((await member.post('/api/v1/admin/invites').send({})).status).toBe(403);
  });

  it('removes access at once, keeps the data, and can restore it', async () => {
    await addUser('admin@example.com', 'admin');
    const target = await addUser('member@example.com');
    tables.workouts.push({ id: 'w-1', userId: target.id });
    const admin = await signIn('admin@example.com');
    const member = await signIn('member@example.com');
    expect((await member.get('/api/v1/auth/me')).status).toBe(200);

    const removed = await admin.post(`/api/v1/admin/users/${target.id}/remove`);
    expect(removed.body.data).toMatchObject({ status: 'removed', workoutCount: 1 });

    expect((await member.get('/api/v1/auth/me')).status).toBe(401);
    const again = await client()
      .post('/api/v1/auth/login')
      .send({ email: 'member@example.com', password: PASSWORD });
    expect(again.status).toBe(403);
    expect(again.body.error.code).toBe('ACCESS_REMOVED');

    await admin.post(`/api/v1/admin/users/${target.id}/restore`);
    await signIn('member@example.com');
  });

  it('will not let an admin remove, demote, or delete themselves', async () => {
    const self = await addUser('admin@example.com', 'admin');
    const admin = await signIn('admin@example.com');
    expect((await admin.post(`/api/v1/admin/users/${self.id}/remove`)).status).toBe(400);
    expect((await admin.patch(`/api/v1/admin/users/${self.id}`).send({ role: 'member' })).status).toBe(400);
    expect(
      (await admin.delete(`/api/v1/admin/users/${self.id}`).send({ confirmEmail: 'admin@example.com' }))
        .status,
    ).toBe(400);
    expect(tables.users[0]).toMatchObject({ role: 'admin', status: 'active' });
  });

  it('resets a password with a one-time link and signs out old sessions', async () => {
    await addUser('admin@example.com', 'admin');
    const target = await addUser('member@example.com');
    const admin = await signIn('admin@example.com');
    const oldSession = await signIn('member@example.com');

    const link = await admin.post(`/api/v1/admin/users/${target.id}/reset-link`);
    expect(link.status).toBe(201);
    const token = tokenFrom(link.body.data.url);
    expect((await client().get(`/api/v1/auth/tokens/${token}`)).body.data).toMatchObject({
      kind: 'reset',
      email: 'member@example.com',
    });

    const reset = await client()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'a-brand-new-password' });
    expect(reset.status).toBe(200);
    expect((await oldSession.get('/api/v1/auth/me')).status).toBe(401);
    await signIn('member@example.com', 'a-brand-new-password');
    expect(
      (await client().post('/api/v1/auth/reset-password').send({ token, password: 'another-password' }))
        .status,
    ).toBe(404);
  });

  it('deletes an account only after the email is typed', async () => {
    await addUser('admin@example.com', 'admin');
    const target = await addUser('member@example.com');
    tables.workouts.push({ id: 'w-1', userId: target.id });
    const admin = await signIn('admin@example.com');

    const unconfirmed = await admin
      .delete(`/api/v1/admin/users/${target.id}`)
      .send({ confirmEmail: 'wrong@example.com' });
    expect(unconfirmed.status).toBe(400);

    const deleted = await admin
      .delete(`/api/v1/admin/users/${target.id}`)
      .send({ confirmEmail: 'MEMBER@example.com' });
    expect(deleted.status).toBe(204);
    expect(tables.users).toHaveLength(1);
    expect(tables.workouts).toHaveLength(0);
  });

  it('lets a member change their password with the current one', async () => {
    await addUser('member@example.com');
    const member = await signIn('member@example.com');
    const other = await signIn('member@example.com');

    const wrong = await member
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'not-it', newPassword: 'a-brand-new-password' });
    expect(wrong.status).toBe(400);

    const changed = await member
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'a-brand-new-password' });
    expect(changed.status).toBe(204);
    expect((await member.get('/api/v1/auth/me')).status).toBe(200);
    expect((await other.get('/api/v1/auth/me')).status).toBe(401);
  });
});
