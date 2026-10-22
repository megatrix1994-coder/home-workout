import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { exercisesRouter } from './routes/exercises.js';
import { musclesRouter } from './routes/muscles.js';

export function createApp() {
  const app = express();
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({ origin: origins }));
  app.use(express.json());
  app.use('/api/v1/muscles', musclesRouter);
  app.use('/api/v1/exercises', exercisesRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'API route not found.' },
    });
  });
  app.use(errorHandler);
  return app;
}
