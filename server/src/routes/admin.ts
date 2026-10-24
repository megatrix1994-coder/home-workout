import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import {
  currentUser,
  hashToken,
  INVITE_DAYS,
  newToken,
  normalizeEmail,
  RESET_HOURS,
} from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { accessUrls } from '../lib/public-origin.js';
import { asyncHandler } from '../middleware/error-handler.js';

const roleSchema = z.enum(['admin', 'member']);
const createInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .max(254)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  role: roleSchema.default('member'),
});
const updateUserSchema = z.object({ role: roleSchema });
const deleteUserSchema = z.object({ confirmEmail: z.string().trim().min(1) });

function routeId(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

async function findTarget(req: Request) {
  const actor = currentUser(req);
  const target = await prisma.user.findUnique({ where: { id: routeId(req.params.id) } });
  if (!target) {
    throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  }
  return { actor, target };
}

function assertNotSelf(actorId: string, targetId: string) {
  if (actorId === targetId) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'You cannot change your own access here.');
  }
}

async function assertNotLastAdmin(target: { id: string; role: string; status: string }) {
  if (target.role !== 'admin' || target.status !== 'active') {
    return;
  }
  const others = await prisma.user.count({
    where: { role: 'admin', status: 'active', id: { not: target.id } },
  });
  if (others === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The app needs at least one active admin.');
  }
}

function presentUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: Date;
  removedAt: Date | null;
  _count: { workouts: number };
  sessions: Array<{ lastSeenAt: Date }>;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    removedAt: user.removedAt?.toISOString() ?? null,
    workoutCount: user._count.workouts,
    lastSeenAt: user.sessions[0]?.lastSeenAt.toISOString() ?? null,
  };
}

const userInclude = {
  _count: { select: { workouts: true } },
  sessions: { select: { lastSeenAt: true }, orderBy: { lastSeenAt: 'desc' as const }, take: 1 },
};

async function loadUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!user) {
    throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  }
  return presentUser(user);
}

export const adminRouter = Router();

adminRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: userInclude,
    });
    res.json({ data: users.map((user) => presentUser(user)) });
  }),
);

adminRouter.post(
  '/invites',
  asyncHandler(async (req, res) => {
    const body = createInviteSchema.parse(req.body ?? {});
    const actor = currentUser(req);
    const email = body.email ? normalizeEmail(body.email) : null;
    if (email && (await prisma.user.findUnique({ where: { email } }))) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'Someone already has an account with this email.');
    }
    const token = newToken();
    const invite = await prisma.accessToken.create({
      data: {
        kind: 'invite',
        tokenHash: hashToken(token),
        email,
        role: body.role,
        createdById: actor.id,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    res.status(201).json({
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        ...accessUrls(req, `/invite/${token}`),
      },
    });
  }),
);

adminRouter.get(
  '/invites',
  asyncHandler(async (_req, res) => {
    const invites = await prisma.accessToken.findMany({
      where: { kind: 'invite', usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
    });
    res.json({
      data: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString(),
        createdBy: invite.createdBy?.name ?? null,
      })),
    });
  }),
);

adminRouter.delete(
  '/invites/:id',
  asyncHandler(async (req, res) => {
    const revoked = await prisma.accessToken.updateMany({
      where: { id: routeId(req.params.id), kind: 'invite', usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      throw new HttpError(404, 'NOT_FOUND', 'That invite is not pending.');
    }
    res.status(204).end();
  }),
);

adminRouter.post(
  '/users/:id/remove',
  asyncHandler(async (req, res) => {
    const { actor, target } = await findTarget(req);
    assertNotSelf(actor.id, target.id);
    await assertNotLastAdmin(target);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: target.id },
        data: { status: 'removed', removedAt: new Date() },
      }),
      prisma.session.deleteMany({ where: { userId: target.id } }),
      prisma.accessToken.updateMany({
        where: { userId: target.id, kind: 'reset', usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.json({ data: await loadUser(target.id) });
  }),
);

adminRouter.post(
  '/users/:id/restore',
  asyncHandler(async (req, res) => {
    const { target } = await findTarget(req);
    if (target.status !== 'removed') {
      throw new HttpError(400, 'VALIDATION_ERROR', 'Only a removed account can be restored.');
    }
    await prisma.user.update({
      where: { id: target.id },
      data: { status: 'active', removedAt: null },
    });
    res.json({ data: await loadUser(target.id) });
  }),
);

adminRouter.post(
  '/users/:id/approve',
  asyncHandler(async (req, res) => {
    const { actor, target } = await findTarget(req);
    assertNotSelf(actor.id, target.id);
    if (target.status !== 'pending') {
      throw new HttpError(400, 'VALIDATION_ERROR', 'This person is not waiting for approval.');
    }
    await prisma.user.update({
      where: { id: target.id },
      data: { status: 'active', removedAt: null },
    });
    res.json({ data: await loadUser(target.id) });
  }),
);

adminRouter.post(
  '/users/:id/decline',
  asyncHandler(async (req, res) => {
    const { actor, target } = await findTarget(req);
    assertNotSelf(actor.id, target.id);
    if (target.status !== 'pending') {
      throw new HttpError(400, 'VALIDATION_ERROR', 'This person is not waiting for approval.');
    }
    await prisma.user.delete({ where: { id: target.id } });
    res.status(204).end();
  }),
);

adminRouter.post(
  '/users/:id/reset-link',
  asyncHandler(async (req, res) => {
    const { actor, target } = await findTarget(req);
    if (target.status !== 'active') {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'Restore this user before sending a reset link.',
      );
    }
    const token = newToken();
    const reset = await prisma.accessToken.create({
      data: {
        kind: 'reset',
        tokenHash: hashToken(token),
        role: target.role,
        createdById: actor.id,
        userId: target.id,
        expiresAt: new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000),
      },
    });
    res.status(201).json({
      data: {
        id: reset.id,
        expiresAt: reset.expiresAt.toISOString(),
        ...accessUrls(req, `/reset/${token}`),
      },
    });
  }),
);

adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const body = updateUserSchema.parse(req.body);
    const { actor, target } = await findTarget(req);
    assertNotSelf(actor.id, target.id);
    if (body.role === 'member') {
      await assertNotLastAdmin(target);
    }
    await prisma.user.update({ where: { id: target.id }, data: { role: body.role } });
    res.json({ data: await loadUser(target.id) });
  }),
);

adminRouter.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const body = deleteUserSchema.parse(req.body ?? {});
    const { actor, target } = await findTarget(req);
    assertNotSelf(actor.id, target.id);
    await assertNotLastAdmin(target);
    if (normalizeEmail(body.confirmEmail) !== target.email) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        "Type the user's email address to confirm.",
      );
    }
    await prisma.user.delete({ where: { id: target.id } });
    res.status(204).end();
  }),
);
