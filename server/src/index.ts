import 'dotenv/config';
import path from 'node:path';
import { createApp } from './app.js';
import { prisma } from './db.js';

const production = process.env.NODE_ENV === 'production';

if (production && !process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in production.');
  process.exit(1);
}

const port = Number(process.env.PORT ?? 4000);
const clientDir = process.env.CLIENT_DIR ?? path.resolve(__dirname, '../../client/dist');
const app = createApp(production ? { clientDir } : {});

const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
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
