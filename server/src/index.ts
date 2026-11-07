import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { migrateDeploy } from './lib/migrate.js';
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

function resolveClientDir() {
  if (process.env.CLIENT_DIR) {
    return process.env.CLIENT_DIR;
  }
  const candidates = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ];
  return candidates.find((dir) => existsSync(path.join(dir, 'index.html'))) ?? candidates[0];
}

const clientDir = resolveClientDir();
const app = createApp(production ? { clientDir } : {});

async function prepareDatabase() {
  const serverDir = path.resolve(__dirname, '..');
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await migrateDeploy(serverDir);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      console.error(error instanceof Error ? error.message : 'Database migration failed.');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (lastError) {
    throw lastError;
  }
  if ((await prisma.muscleGroup.count()) === 0) {
    await seedCatalogue(prisma);
  }
}

async function start() {
  if (production && !existsSync(path.join(clientDir, 'index.html'))) {
    console.error('The built client was not found, so the site cannot be served.');
  }

  const server = app.listen(port, '0.0.0.0');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => {
      console.log(`API listening on port ${port}`);
      resolve();
    });
    server.once('error', reject);
  });

  if (production && process.env.DATABASE_URL) {
    try {
      await prepareDatabase();
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Database setup failed.');
    }
  }

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
