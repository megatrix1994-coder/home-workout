import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db.js';
import { clearSessionCookie, hashToken, readCookie, SESSION_COOKIE } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { asyncHandler } from './error-handler.js';

const LAST_SEEN_INTERVAL_MS = 60 * 60 * 1000;

export const requireUser = asyncHandler(async (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  }
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  const now = new Date();
  if (!session || session.expiresAt <= now || session.user.status !== 'active') {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } });
    }
    clearSessionCookie(res);
    throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (now.getTime() - session.lastSeenAt.getTime() > LAST_SEEN_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
  }
  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
  req.sessionId = session.id;
  next();
});

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    next(new HttpError(403, 'FORBIDDEN', 'Only an admin can do this.'));
    return;
  }
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function sameOriginWrites(allowedOrigins: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    const origin = req.get('origin');
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    const sameSite = origin
      ? origin === ownOrigin || allowedOrigins.includes(origin)
      : req.get('sec-fetch-site') === 'same-origin';
    if (!sameSite) {
      next(new HttpError(403, 'FORBIDDEN', 'This request came from another site.'));
      return;
    }
    if (req.get('content-length') && Number(req.get('content-length')) > 0 && !req.is('application/json')) {
      next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the request body as JSON.'));
      return;
    }
    next();
  };
}
