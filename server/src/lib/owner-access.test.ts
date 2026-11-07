import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { isPrivateOwner, openOwnerSession } from './owner-access.js';
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

describe('private owner access', () => {
  it('recognises only a private production person', () => {
    expect(
      isPrivateOwner({
        verified: true,
        kind: 'person',
        email: 'owner@example.com',
        name: 'Owner',
        appVisibility: 'private',
        stage: 'production',
      }),
    ).toBe(true);
    expect(
      isPrivateOwner({
        verified: true,
        kind: 'person',
        email: 'dev@example.com',
        name: 'Dev',
        appVisibility: 'team',
        stage: 'production',
      }),
    ).toBe(false);
    expect(
      isPrivateOwner({
        verified: true,
        kind: 'key',
        email: '',
        name: 'Key',
        appVisibility: 'private',
        stage: 'production',
      }),
    ).toBe(false);
  });

  it('signs in the private owner and leaves other waiting accounts pending', async () => {
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
      { email: 'owner@example.com', name: 'Owner' },
    );
    expect(tables.sessions).toHaveLength(1);
  });
});
