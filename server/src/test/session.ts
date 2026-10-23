import { hashToken } from '../lib/auth.js';

export const TEST_TOKEN = 'test-session-token-0123456789';
export const TEST_COOKIE = `hw_session=${TEST_TOKEN}`;

export type TestUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  status?: 'active' | 'removed';
};

export const testMember: TestUser = {
  id: 'user-member',
  email: 'member@example.com',
  name: 'Member',
  role: 'member',
};

export const testAdmin: TestUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'admin',
};

export function sessionFor(user: TestUser = testMember) {
  return {
    id: `session-${user.id}`,
    tokenHash: hashToken(TEST_TOKEN),
    userId: user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    user: {
      ...user,
      status: user.status ?? 'active',
      passwordHash: 'unused',
      removedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}
