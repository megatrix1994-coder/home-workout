import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

export function databaseEnvForMigrate(env: NodeJS.ProcessEnv) {
  const direct = env.DATABASE_URL_UNPOOLED?.trim();
  if (!direct) {
    return env;
  }
  return { ...env, DATABASE_URL: direct };
}

function safeOutput(chunk: Buffer) {
  const text = chunk.toString('utf8');
  if (/postgres(ql)?:\/\//i.test(text) || /DATABASE_URL/i.test(text)) {
    return;
  }
  process.stderr.write(text);
}

export function migrateDeploy(serverDir: string, env: NodeJS.ProcessEnv = process.env) {
  const require = createRequire(path.join(serverDir, 'package.json'));
  const cli = require.resolve('prisma/build/index.js');
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'migrate', 'deploy'], {
      cwd: serverDir,
      env: databaseEnvForMigrate(env),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', safeOutput);
    child.stderr?.on('data', safeOutput);
    child.on('error', (error) => {
      reject(new Error(`Database migration failed. ${error.message}`));
    });
    child.on('exit', (status) => {
      if (status === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`Database migration failed. Prisma exited with status ${status ?? 'unknown'}.`),
      );
    });
  });
}
