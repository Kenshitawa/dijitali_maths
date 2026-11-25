import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { recordAuditLog } from '../lib/audit.js';
import { generateToken, hashPassword, hashToken, verifyPassword } from '../lib/crypto.js';
import { isSmtpConfigured, sendEmail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive || !user.passwordHash) {
      await recordAuditLog({ userEmail: email, action: 'auth.login_failed', details: { reason: 'unknown_or_inactive' } });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      res.status(423).json({
        error: 'Account temporarily locked due to repeated failed login attempts. Try again later.',
      });
      return;
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      const nextFails = user.failedLogins + 1;
      const shouldLock = nextFails >= MAX_FAILED_LOGINS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: shouldLock ? 0 : nextFails,
          lockedUntil: shouldLock ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000) : null,
        },
      });
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'auth.login_failed',
        details: { locked: shouldLock },
      });
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const rawSessionToken = generateToken(32);
    const csrfToken = generateToken(24);
    const expiresAt = new Date(now.getTime() + env.sessionTtlHours * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now },
      }),
      prisma.session.create({
        data: {
          tokenHash: hashToken(rawSessionToken),
          csrfToken,
          userId: user.id,
          expiresAt,
          lastActiveAt: now,
          userAgent: (req.get('user-agent') || '').slice(0, 255),
        },
      }),
    ]);

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.login',
    });

    res.cookie(SESSION_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
      expires: expiresAt,
      path: '/',
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      csrfToken,
      sessionIdleMinutes: env.sessionIdleMinutes,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    if (req.authUser) {
      await prisma.session.delete({ where: { id: req.authUser.sessionId } }).catch(() => {});
      await recordAuditLog({
        userId: req.authUser.id,
        userEmail: req.authUser.email,
        action: 'auth.logout',
      });
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.authUser!.id,
      email: req.authUser!.email,
      name: req.authUser!.name,
      role: req.authUser!.role,
    },
    csrfToken: req.authUser!.csrfToken,
    sessionIdleMinutes: env.sessionIdleMinutes,
  });
});

authRouter.post('/activity', requireAuth, async (req, res, next) => {
  try {
    await prisma.session.update({
      where: { id: req.authUser!.sessionId },
      data: { lastActiveAt: new Date() },
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', loginLimiter, async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().trim().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const rawToken = generateToken(32);
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: hashToken(rawToken), resetExpiresAt },
      });

      const resetUrl = `${env.appOrigin}/admin?resetToken=${rawToken}`;
      if (isSmtpConfigured()) {
        await sendEmail({
          to: user.email,
          subject: 'Dijitali Maths Admin — Password Reset',
          text: `Hello ${user.name},\n\nUse this one-time link (valid for 1 hour) to reset your password:\n${resetUrl}`,
        });
      }
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'auth.forgot_password',
      });
    }

    res.json({
      ok: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(12, 'Password must be at least 12 characters long').max(128),
});

authRouter.post('/reset-password', loginLimiter, async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
      return;
    }

    const tokenHash = hashToken(parsed.data.token);
    const user = await prisma.user.findUnique({ where: { resetTokenHash: tokenHash } });
    if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      res.status(400).json({ error: 'Reset link is invalid or has expired.' });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetTokenHash: null,
          resetExpiresAt: null,
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.reset_password',
    });

    res.json({ ok: true, message: 'Password updated. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/accept-invite', loginLimiter, async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
      return;
    }

    const tokenHash = hashToken(parsed.data.token);
    const user = await prisma.user.findUnique({ where: { inviteTokenHash: tokenHash } });
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      res.status(400).json({ error: 'Invite link is invalid or has expired.' });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.accept_invite',
    });

    res.json({ ok: true, message: 'Account activated! You can now log in.' });
  } catch (err) {
    next(err);
  }
});
