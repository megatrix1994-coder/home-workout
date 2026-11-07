import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { hashPassword, hashToken, newToken, normalizeEmail, readCookie, SESSION_DAYS, setSessionCookie, SESSION_COOKIE } from './auth.js';

type Viewer =
  | { verified: false }
  | {
      verified: true;
      kind: 'person' | 'key';
      email: string;
      name: string;
      appVisibility: 'private' | 'team' | 'public';
      stage: 'production' | 'preview';
      claims?: Record<string, unknown>;
    };

type GetIdentity = (request: Request) => Promise<Viewer>;

const identityFiles = [
  path.resolve(__dirname, '../../../cursor/identity.js'),
  path.resolve(process.cwd(), 'cursor/identity.js'),
  path.resolve(process.cwd(), '../cursor/identity.js'),
];

let identityLoader: Promise<GetIdentity | null> | undefined;

function loadIdentity(): Promise<GetIdentity | null> {
  identityLoader ??= (async () => {
    const file = identityFiles.find((candidate) => existsSync(candidate));
    if (!file) {
      return null;
    }
    const loaded = (await import(pathToFileURL(file).href)) as { getIdentity?: GetIdentity };
    return loaded.getIdentity ?? null;
  })();
  return identityLoader;
}

function isProductionPerson(viewer: Viewer): viewer is Extract<Viewer, { verified: true }> {
  return (
    viewer.verified &&
    viewer.kind === 'person' &&
    viewer.stage === 'production' &&
    viewer.appVisibility === 'private' &&
    viewer.email.trim() !== ''
  );
}

export function isAppOwner(viewer: Viewer): viewer is Extract<Viewer, { verified: true }> {
  return isProductionPerson(viewer) && viewer.claims?.owner === true;
}

async function startSession(db: PrismaClient, req: Request, res: Response, userId: string) {
  const current = readCookie(req, SESSION_COOKIE);
  if (current) {
    const session = await db.session.findUnique({ where: { tokenHash: hashToken(current) } });
    if (session && session.userId === userId && session.expiresAt > new Date()) {
      return;
    }
  }
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  setSessionCookie(req, res, token, expiresAt);
  res.setHeader('Cache-Control', 'private, no-store');
}

export async function openOwnerSession(
  db: PrismaClient,
  req: Request,
  res: Response,
  viewer: { email: string; name: string; owner: boolean },
) {
  const email = normalizeEmail(viewer.email);
  if (!email) {
    return;
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (!viewer.owner) {
    if (!existing || existing.role !== 'admin' || existing.status !== 'active') {
      return;
    }
    await startSession(db, req, res, existing.id);
    return;
  }

  const name = viewer.name.trim() || 'Owner';
  const user = existing
    ? existing.role === 'admin' && existing.status === 'active'
      ? existing
      : await db.user.update({
          where: { email },
          data: { role: 'admin', status: 'active', removedAt: null },
        })
    : await db.user.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword(randomBytes(32).toString('base64url')),
          role: 'admin',
          status: 'active',
        },
      });
  await startSession(db, req, res, user.id);
}

export async function signInPrivateOwner(db: PrismaClient, req: Request, res: Response) {
  const getIdentity = await loadIdentity();
  if (!getIdentity) {
    return;
  }
  const viewer = await getIdentity(req);
  if (!isProductionPerson(viewer)) {
    return;
  }
  await openOwnerSession(db, req, res, {
    email: viewer.email,
    name: viewer.name,
    owner: isAppOwner(viewer),
  });
}
