import { describe, expect, it } from 'vitest';
import { databaseEnvForMigrate } from './migrate.js';

describe('databaseEnvForMigrate', () => {
  it('uses the direct database URL for migrations when one is set', () => {
    const env = databaseEnvForMigrate({
      DATABASE_URL: 'postgresql://pooled.example/app',
      DATABASE_URL_UNPOOLED: 'postgresql://direct.example/app',
      PORT: '8080',
    });
    expect(env.DATABASE_URL).toBe('postgresql://direct.example/app');
    expect(env.PORT).toBe('8080');
  });

  it('keeps the runtime URL when no direct URL is set', () => {
    const env = { DATABASE_URL: 'postgresql://db.example/app' };
    expect(databaseEnvForMigrate(env)).toBe(env);
  });
});
