import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { prisma } from './db.js';
import { requireAdmin, requireUser, sameOriginWrites } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { exercisesRouter } from './routes/exercises.js';
import { musclesRouter } from './routes/muscles.js';
import { nutritionRouter } from './routes/nutrition.js';
import { workoutsRouter } from './routes/workouts.js';
import { cooldownsRouter } from './routes/cooldowns.js';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  // Browsers ignore HSTS over plain HTTP, and sending it there would pin localhost.
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

async function health(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
}

export function createApp(options: { clientDir?: string } = {}) {
  const app = express();
  const origins = [
    ...(process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    process.env.PUBLIC_URL ?? '',
  ]
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin, index, all) => origin && all.indexOf(origin) === index);

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  }
  app.use(securityHeaders);
  app.use((req, res, next) => {
    const requestOrigin = req.get('origin');
    const host = req.get('host');
    let sameHost = false;
    if (requestOrigin && host) {
      try {
        sameHost = new URL(requestOrigin).host === host;
      } catch {
        sameHost = false;
      }
    }
    const allowed = !requestOrigin || origins.includes(requestOrigin) || sameHost;
    if (requestOrigin && allowed) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(allowed ? 204 : 403);
      return;
    }
    next();
  });
  app.use('/api', sameOriginWrites(origins));
  app.use(express.json({ limit: '100kb', inflate: false }));
  app.get('/api/health', health);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', requireUser, requireAdmin, adminRouter);
  app.use('/api/v1/muscles', requireUser, musclesRouter);
  app.use('/api/v1/exercises', requireUser, exercisesRouter);
  app.use('/api/v1/workouts', requireUser, workoutsRouter);
  app.use('/api/v1/cooldowns', requireUser, cooldownsRouter);
  app.use('/api/v1/nutrition', requireUser, nutritionRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API route not found.' },
    });
  });

  const clientDir = options.clientDir;
  if (clientDir && existsSync(path.join(clientDir, 'index.html'))) {
    const indexFile = path.join(clientDir, 'index.html');
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (path.extname(req.path)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.sendFile(indexFile);
    });
  }

  app.use(errorHandler);
  return app;
}
