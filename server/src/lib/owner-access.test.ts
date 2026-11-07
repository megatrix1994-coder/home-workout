import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { isAppOwner, openOwnerSession } from './owner-access.js';
import { fakeDb, resetFakeDb, tables } from '../test/fake-auth-db.js';

function response() {
  let token = '';
  const res = {
    cookie(_name: string, value: string) {
      token = value;
      return res;
    },
    setHeader() {
      return res;
    },
  };
  return { res: res as unknown as Response, token: () => token };
}

const person = {
  verified: true as const,
  kind: 'person' as const,
  email: 'owner@example.com',
  name: 'Owner',
  appVisibility: 'private' as const,
  stage: 'production' as const,
};

describe('private owner access', () => {
  it('treats only an explicit owner claim as the app owner', () => {
    expect(isAppOwner({ ...person, claims: { owner: true } })).toBe(true);
    expect(isAppOwner(person)).toBe(false);
    expect(isAppOwner({ ...person, appVisibility: 'team', claims: { owner: true } })).toBe(false);
    expect(isAppOwner({ ...person, kind: 'key', claims: { owner: true } })).toBe(false);
  });

  it('does not make another signed-in person an admin', async () => {
    resetFakeDb();
    tables.users.push({
      id: 'user-other',
      email: 'other@example.com',
      name: 'Other',
      passwordHash: 'kept',
      role: 'member',
      status: 'pending',
      removedAt: null,
      createdAt: new Date(),
    });
    const { res } = response();
    await openOwnerSession(fakeDb as never, { headers: {} } as Request, res, {
      email: 'other@example.com',
      name: 'Other',
      owner: false,
    });
    expect(tables.users[0]).toMatchObject({ role: 'member', status: 'pending' });
    expect(tables.sessions).toHaveLength(0);
  });

  it('signs in the claimed owner and leaves other waiting accounts pending', async () => {
    resetFakeDb();
    tables.users.push({
      id: 'user-owner',
      email: 'owner@example.com',
      name: 'Owner',
      passwordHash: 'kept',
      role: 'member',
      status: 'pending',
      removedAt: new Date(),
      createdAt: new Date(),
    });
    tables.users.push({
      id: 'user-other',
      email: 'other@example.com',
      name: 'Other',
      passwordHash: 'kept',
      role: 'member',
      status: 'pending',
      removedAt: null,
      createdAt: new Date(),
    });
    const { res, token } = response();
    await openOwnerSession(fakeDb as never, { headers: {} } as Request, res, {
      email: ' Owner@Example.com ',
      name: 'Owner',
      owner: true,
    });
    expect(tables.users.find((user) => user.email === 'owner@example.com')).toMatchObject({
      role: 'admin',
      status: 'active',
      removedAt: null,
      passwordHash: 'kept',
    });
    expect(tables.users.find((user) => user.email === 'other@example.com')).toMatchObject({
      role: 'member',
      status: 'pending',
    });
    expect(tables.sessions).toHaveLength(1);

    await openOwnerSession(
      fakeDb as never,
      { headers: { cookie: `hw_session=${encodeURIComponent(token())}` } } as Request,
      res,
      { email: 'owner@example.com', name: 'Owner', owner: true },
    );
    expect(tables.sessions).toHaveLength(1);
  });
});
