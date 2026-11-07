import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { ensureAdmin } from './lib/ensure-admin.js';
import { seedCatalogue } from './lib/seed-catalogue.js';

const production = process.env.NODE_ENV === 'production';

if (production && !process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in production.');
  process.exit(1);
}

if (production && !process.env.TRUST_PROXY) {
  process.env.TRUST_PROXY = '1';
}

const port = Number(process.env.PORT ?? 4000);
const clientDir = process.env.CLIENT_DIR ?? path.resolve(__dirname, '../../client/dist');
const app = createApp(production ? { clientDir } : {});

function migrateDeploy() {
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('Database migration failed.');
  }
}

async function prepareDatabase() {
  migrateDeploy();
  if ((await prisma.muscleGroup.count()) === 0) {
    await seedCatalogue(prisma);
  }
  await ensureAdmin(prisma);
}

async function start() {
  if (production && process.env.DATABASE_URL) {
    await prepareDatabase();
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on port ${port}`);
  });

  let shuttingDown = false;

  function shutdown(signal: string) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`${signal} received. Closing.`);
    server.close((error) => {
      void prisma.$disconnect().finally(() => {
        process.exit(error ? 1 : 0);
      });
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'The server failed to start.');
  process.exit(1);
});
