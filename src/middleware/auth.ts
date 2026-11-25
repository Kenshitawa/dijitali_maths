import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { hashToken } from '../lib/crypto.js';
import { prisma } from '../lib/prisma.js';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sessionId: string;
  csrfToken: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export const SESSION_COOKIE_NAME = 'dm_session';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken || typeof rawToken !== 'string') {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || !session.user || !session.user.isActive) {
      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(401).json({ error: 'Session invalid or expired' });
      return;
    }

    const now = new Date();
    const idleCutoff = new Date(session.lastActiveAt.getTime() + env.sessionIdleMinutes * 60 * 1000);
    if (session.expiresAt < now || idleCutoff < now) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(401).json({ error: 'Session expired due to inactivity' });
      return;
    }

    // Verify CSRF token on state-changing requests
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const headerCsrf = req.get('x-csrf-token');
      if (!headerCsrf || headerCsrf !== session.csrfToken) {
        res.status(403).json({ error: 'Invalid or missing CSRF token' });
        return;
      }
    }

    // Slide lastActiveAt (throttle DB writes to once per minute)
    if (now.getTime() - session.lastActiveAt.getTime() > 60_000) {
      await prisma.session
        .update({ where: { id: session.id }, data: { lastActiveAt: now } })
        .catch(() => {});
    }

    req.authUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      sessionId: session.id,
      csrfToken: session.csrfToken,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!allowed.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}
