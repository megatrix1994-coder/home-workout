import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function isDatabaseUnavailable(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const name = 'name' in error ? String(error.name) : '';
  const code = 'code' in error ? String(error.code) : '';
  return (
    name === 'PrismaClientInitializationError' ||
    code === 'P1001' ||
    code === 'P1017'
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request.',
        details: error.issues,
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (isDatabaseUnavailable(error)) {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is unavailable. Start it, then try again.',
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    },
  });
}
