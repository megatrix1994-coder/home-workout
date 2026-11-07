import { describe, expect, it } from 'vitest';
import { adminBootstrapFromEnv } from './ensure-admin.js';

describe('admin bootstrap', () => {
  it('reads a complete account and ignores incomplete settings', () => {
    expect(
      adminBootstrapFromEnv({
        ADMIN_EMAIL: 'Owner@Example.com',
        ADMIN_PASSWORD: 'a-long-test-password',
        ADMIN_NAME: 'Owner',
      }),
    ).toEqual({
      email: 'owner@example.com',
      name: 'Owner',
      password: 'a-long-test-password',
    });
    expect(adminBootstrapFromEnv({})).toBeNull();
    expect(
      adminBootstrapFromEnv({
        ADMIN_EMAIL: 'owner@example.com',
        ADMIN_PASSWORD: 'short',
      }),
    ).toBeNull();
  });
});
