import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { requireAdmin, requireUser, sameOriginWrites } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { exercisesRouter } from './routes/exercises.js';
import { musclesRouter } from './routes/muscles.js';
import { nutritionRouter } from './routes/nutrition.js';
import { workoutsRouter } from './routes/workouts.js';

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}

export function createApp(options: { clientDir?: string } = {}) {
  const app = express();
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  }
  app.use(securityHeaders);
  app.use(cors({ origin: origins, credentials: true }));
  app.use('/api', sameOriginWrites(origins));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', requireUser, requireAdmin, adminRouter);
  app.use('/api/v1/muscles', requireUser, musclesRouter);
  app.use('/api/v1/exercises', requireUser, exercisesRouter);
  app.use('/api/v1/workouts', requireUser, workoutsRouter);
  app.use('/api/v1/nutrition', requireUser, nutritionRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API route not found.' },
    });
  });

  const clientDir = options.clientDir;
  if (clientDir && existsSync(path.join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => {
      if (path.extname(req.path)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
