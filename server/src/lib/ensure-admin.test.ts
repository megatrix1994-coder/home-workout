import { afterEach, describe, expect, it } from 'vitest';
import { verifyPassword } from './auth.js';
import { ensureAdmin } from './ensure-admin.js';
import { fakeDb, resetFakeDb, tables } from '../test/fake-auth-db.js';

const original = {
  email: process.env.ADMIN_EMAIL,
  name: process.env.ADMIN_NAME,
  password: process.env.ADMIN_PASSWORD,
};

afterEach(() => {
  resetFakeDb();
  restore('ADMIN_EMAIL', original.email);
  restore('ADMIN_NAME', original.name);
  restore('ADMIN_PASSWORD', original.password);
});

function restore(key: 'ADMIN_EMAIL' | 'ADMIN_NAME' | 'ADMIN_PASSWORD', value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('ensureAdmin', () => {
  it('does nothing when no admin settings are present', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_NAME;
    delete process.env.ADMIN_PASSWORD;
    await ensureAdmin(fakeDb as never);
    expect(tables.users).toHaveLength(0);
  });

  it('creates an active admin once and applies a new saved password', async () => {
    process.env.ADMIN_EMAIL = 'Admin@Example.com';
    process.env.ADMIN_NAME = 'Alex Admin';
    process.env.ADMIN_PASSWORD = 'correct-horse-battery\n';
    await ensureAdmin(fakeDb as never);
    expect(tables.users[0]).toMatchObject({
      email: 'admin@example.com',
      name: 'Alex Admin',
      role: 'admin',
      status: 'active',
    });
    expect(await verifyPassword('correct-horse-battery', String(tables.users[0]?.passwordHash))).toBe(
      true,
    );

    const passwordHash = tables.users[0]?.passwordHash;
    tables.users[0]!.role = 'member';
    tables.users[0]!.status = 'removed';
    await ensureAdmin(fakeDb as never);
    expect(tables.users).toHaveLength(1);
    expect(tables.users[0]?.passwordHash).toBe(passwordHash);
    expect(tables.users[0]).toMatchObject({ role: 'member', status: 'removed' });

    process.env.ADMIN_PASSWORD = 'a-different-password';
    await ensureAdmin(fakeDb as never);
    expect(tables.users).toHaveLength(1);
    expect(await verifyPassword('a-different-password', String(tables.users[0]?.passwordHash))).toBe(
      true,
    );
    expect(tables.users[0]).toMatchObject({ role: 'admin', status: 'active', removedAt: null });
  });

  it('replaces a stored password that does not match the saved one', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_NAME = 'Alex Admin';
    process.env.ADMIN_PASSWORD = 'correct-horse-battery';
    await ensureAdmin(fakeDb as never);
    tables.users[0]!.passwordHash = 'scrypt$not-the-saved-password$not-the-saved-password';
    await ensureAdmin(fakeDb as never);
    expect(await verifyPassword('correct-horse-battery', String(tables.users[0]?.passwordHash))).toBe(
      true,
    );
  });

  it('leaves other waiting accounts pending', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_NAME = 'Alex Admin';
    process.env.ADMIN_PASSWORD = 'correct-horse-battery';
    tables.users.push({
      id: 'user-waiting',
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'kept',
      role: 'member',
      status: 'pending',
      removedAt: null,
      createdAt: new Date(),
    });
    await ensureAdmin(fakeDb as never);
    expect(tables.users.find((user) => user.email === 'owner@example.com')).toMatchObject({
      role: 'member',
      status: 'pending',
      passwordHash: 'kept',
    });
    expect(tables.users.find((user) => user.email === 'admin@example.com')).toMatchObject({
      role: 'admin',
      status: 'active',
    });
  });

  it('leaves the database alone when the password is too short', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_NAME = 'Alex Admin';
    process.env.ADMIN_PASSWORD = 'short';
    await ensureAdmin(fakeDb as never);
    expect(tables.users).toHaveLength(0);
  });
});
