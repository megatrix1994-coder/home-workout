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
    clearSessionCookie(req, res);
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

function originHostname(origin: string) {
  try {
    return new URL(origin).hostname;
  } catch {
    return '';
  }
}

function bareHostname(value: string) {
  return value.trim().replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
}

function requestHostnames(req: Request) {
  const names = new Set<string>();
  if (req.hostname) {
    names.add(req.hostname.toLowerCase());
  }
  const host = req.get('host');
  if (host) {
    names.add(bareHostname(host));
  }
  for (const part of (req.get('x-forwarded-host') ?? '').split(',')) {
    const forwarded = bareHostname(part);
    if (forwarded) {
      names.add(forwarded);
    }
  }
  const forwardedHeader = req.get('forwarded');
  if (forwardedHeader) {
    for (const match of forwardedHeader.matchAll(/host="?([^;"\s]+)"?/gi)) {
      const forwarded = bareHostname(match[1] ?? '');
      if (forwarded) {
        names.add(forwarded);
      }
    }
  }
  return names;
}

export function sameOriginWrites(allowedOrigins: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }
    const fetchSite = req.get('sec-fetch-site');
    const browserSaysSameSite = fetchSite === 'same-origin' || fetchSite === 'none';
    const origin = req.get('origin');
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    const sameSite =
      browserSaysSameSite ||
      (origin
        ? origin === ownOrigin ||
          allowedOrigins.includes(origin) ||
          requestHostnames(req).has(originHostname(origin))
        : false);
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
