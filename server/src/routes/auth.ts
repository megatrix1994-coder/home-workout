import type { Prisma } from '@prisma/client';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  clearSessionCookie,
  currentUser,
  hashPassword,
  hashToken,
  limitAttempts,
  newToken,
  normalizeEmail,
  PASSWORD_MIN_LENGTH,
  publicUser,
  readCookie,
  SESSION_COOKIE,
  SESSION_DAYS,
  setSessionCookie,
  verifyPassword,
} from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireUser } from '../middleware/auth.js';

const emailSchema = z.string().trim().email('Enter a valid email address.').max(254);
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(200);
const tokenSchema = z.string().trim().min(20).max(200);

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });
const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  password: passwordSchema,
});
const acceptInviteSchema = registerSchema.extend({ token: tokenSchema });
const resetSchema = z.object({ token: tokenSchema, password: passwordSchema });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

const INVALID_LINK = 'This link is no longer valid. Ask the admin for a new one.';

async function startSession(req: Request, res: Response, userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  setSessionCookie(req, res, token, expiresAt);
}

async function findUsableToken(token: string) {
  const record = await prisma.accessToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (
    !record ||
    record.usedAt ||
    record.revokedAt ||
    record.expiresAt <= new Date() ||
    (record.kind === 'reset' && record.user?.status !== 'active')
  ) {
    return null;
  }
  return record;
}

async function claimToken(tx: Prisma.TransactionClient, id: string) {
  const claimed = await tx.accessToken.updateMany({
    where: { id, usedAt: null, revokedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new HttpError(410, 'LINK_USED', INVALID_LINK);
  }
}

function attemptKey(req: Request, scope: string, value: string) {
  return `${scope}:${req.ip}:${value}`;
}

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const email = normalizeEmail(body.email);
    limitAttempts(attemptKey(req, 'login', email));
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, 'INVALID_LOGIN', 'Email or password is incorrect.');
    }
    if (user.status === 'pending') {
      throw new HttpError(
        403,
        'ACCESS_PENDING',
        'The admin has not approved your access yet.',
      );
    }
    if (user.status !== 'active') {
      throw new HttpError(403, 'ACCESS_REMOVED', 'This account no longer has access.');
    }
    await startSession(req, res, user.id);
    res.json({ data: publicUser(user) });
  }),
);

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const email = normalizeEmail(body.email);
    limitAttempts(attemptKey(req, 'register', email));
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.status === 'pending') {
      throw new HttpError(
        409,
        'REQUEST_PENDING',
        'This email is already waiting for the admin to approve it. Sign in after they approve you.',
      );
    }
    if (existing) {
      throw new HttpError(
        409,
        'EMAIL_TAKEN',
        'An account with this email already exists. Sign in instead.',
      );
    }
    const created = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        role: 'member',
        status: 'pending',
      },
    });
    res.status(201).json({
      data: { email: created.email, name: created.name, status: created.status },
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    clearSessionCookie(req, res);
    res.status(204).end();
  }),
);

authRouter.get('/me', requireUser, (req, res) => {
  res.json({ data: publicUser(currentUser(req)) });
});

authRouter.get(
  '/tokens/:token',
  asyncHandler(async (req, res) => {
    const token = tokenSchema.safeParse(req.params.token);
    const record = token.success ? await findUsableToken(token.data) : null;
    if (!record) {
      throw new HttpError(404, 'NOT_FOUND', INVALID_LINK);
    }
    res.json({
      data: {
        kind: record.kind,
        email: record.kind === 'reset' ? (record.user?.email ?? null) : record.email,
        expiresAt: record.expiresAt.toISOString(),
      },
    });
  }),
);

authRouter.post(
  '/accept-invite',
  asyncHandler(async (req, res) => {
    const body = acceptInviteSchema.parse(req.body);
    const email = normalizeEmail(body.email);
    limitAttempts(attemptKey(req, 'invite', body.token));
    const invite = await findUsableToken(body.token);
    if (!invite || invite.kind !== 'invite') {
      throw new HttpError(404, 'NOT_FOUND', INVALID_LINK);
    }
    if (invite.email && invite.email !== email) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'This invite is for a different email address.',
      );
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(
        409,
        'EMAIL_TAKEN',
        'An account with this email already exists. Sign in instead.',
      );
    }
    const passwordHash = await hashPassword(body.password);
    const user = await prisma.$transaction(async (tx) => {
      await claimToken(tx, invite.id);
      const created = await tx.user.create({
        data: { email, name: body.name, passwordHash, role: invite.role },
      });
      await tx.accessToken.update({ where: { id: invite.id }, data: { userId: created.id } });
      return created;
    });
    await startSession(req, res, user.id);
    res.status(201).json({ data: publicUser(user) });
  }),
);

authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const body = resetSchema.parse(req.body);
    limitAttempts(attemptKey(req, 'reset', body.token));
    const reset = await findUsableToken(body.token);
    if (!reset || reset.kind !== 'reset' || !reset.user) {
      throw new HttpError(404, 'NOT_FOUND', INVALID_LINK);
    }
    const passwordHash = await hashPassword(body.password);
    const userId = reset.user.id;
    await prisma.$transaction(async (tx) => {
      await claimToken(tx, reset.id);
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId } });
    });
    await startSession(req, res, userId);
    res.json({ data: publicUser(reset.user) });
  }),
);

authRouter.post(
  '/change-password',
  requireUser,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body);
    const user = currentUser(req);
    limitAttempts(attemptKey(req, 'change-password', user.id));
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record || !(await verifyPassword(body.currentPassword, record.passwordHash))) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Your current password is incorrect.');
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(body.newPassword) },
      }),
      prisma.session.deleteMany({ where: { userId: user.id, id: { not: req.sessionId } } }),
    ]);
    res.status(204).end();
  }),
);
