import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { recordAuditLog } from '../lib/audit.js';
import { generateToken, hashToken } from '../lib/crypto.js';
import { isSmtpConfigured, sendEmail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { escapeCsvCell, sanitizePlainText } from '../lib/sanitize.js';
import { storage } from '../lib/storage.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] || '' : val || '';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadFileBytes,
    files: env.maxUploadFiles,
  },
});

// GET /api/admin/dashboard
adminRouter.get('/dashboard', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgoStr = new Date(now.getTime() - 6 * 86400_000).toISOString().slice(0, 10);
    const monthAgoStr = new Date(now.getTime() - 29 * 86400_000).toISOString().slice(0, 10);

    const [
      unreadContacts,
      newVolunteers,
      newPartners,
      newEventRegs,
      confirmedSubscribers,
      totalSubscribers,
      totalImages,
      publishedPrograms,
      publishedEvents,
      publishedPosts,
      todayViews,
      weekViews,
      monthViews,
    ] = await Promise.all([
      prisma.contactMessage.count({ where: { status: 'new' } }),
      prisma.volunteerApplication.count({ where: { status: 'new' } }),
      prisma.partnerInquiry.count({ where: { status: 'new' } }),
      prisma.eventRegistration.count({ where: { status: 'new' } }),
      prisma.subscriber.count({ where: { status: 'confirmed' } }),
      prisma.subscriber.count({ where: { status: { not: 'unsubscribed' } } }),
      prisma.image.count(),
      prisma.program.count({ where: { status: 'published' } }),
      prisma.event.count({ where: { status: 'published' } }),
      prisma.post.count({ where: { status: 'published' } }),
      prisma.dailyPageStat.aggregate({ where: { date: todayStr }, _sum: { views: true } }),
      prisma.dailyPageStat.aggregate({ where: { date: { gte: weekAgoStr } }, _sum: { views: true } }),
      prisma.dailyPageStat.aggregate({ where: { date: { gte: monthAgoStr } }, _sum: { views: true } }),
    ]);

    res.json({
      counts: {
        unreadMessages: unreadContacts,
        newVolunteers,
        newPartners,
        newEventRegistrations: newEventRegs,
        subscribers: totalSubscribers,
        confirmedSubscribers,
        images: totalImages,
        publishedPages: publishedPrograms + publishedEvents + publishedPosts,
        visitorsToday: todayViews._sum.views || 0,
        visitorsWeek: weekViews._sum.views || 0,
        visitorsMonth: monthViews._sum.views || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==================== IMAGES ====================

adminRouter.get('/images', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const items = await prisma.image.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/images',
  requireRole('admin', 'editor'),
  uploadLimiter,
  upload.array('files', env.maxUploadFiles),
  async (req, res, next) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (!files.length) {
        res.status(400).json({ error: 'No files provided.' });
        return;
      }

      const category = sanitizePlainText(String(req.body.category || 'action')) || 'action';
      const projectSlug = req.body.projectSlug ? sanitizePlainText(String(req.body.projectSlug)) : null;

      const uploaded = [];
      const errors: { file: string; error: string }[] = [];

      for (const file of files) {
        try {
          const saved = await storage.saveImage(file.buffer, file.originalname);
          const baseTitle = file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Gallery photo';
          const title = sanitizePlainText(String(req.body.title || baseTitle));
          const altText = sanitizePlainText(String(req.body.altText || title));

          const record = await prisma.image.create({
            data: {
              title,
              altText,
              category,
              projectSlug,
              ...saved,
            },
          });
          uploaded.push(record);
        } catch (err) {
          errors.push({
            file: file.originalname,
            error: err instanceof Error ? err.message : 'Failed to process image',
          });
        }
      }

      if (uploaded.length) {
        await recordAuditLog({
          userId: req.authUser!.id,
          userEmail: req.authUser!.email,
          action: 'images.upload',
          entityType: 'image',
          details: { count: uploaded.length, ids: uploaded.map((u) => u.id) },
        });
      }

      const statusCode = uploaded.length > 0 ? 201 : 400;
      res.status(statusCode).json({ uploaded, errors });
    } catch (err) {
      next(err);
    }
  }
);

const imagePatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  altText: z.string().trim().min(1).max(300).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  projectSlug: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
});

adminRouter.patch('/images/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = imagePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid image update' });
      return;
    }

    const updated = await prisma.image.update({
      where: { id: paramStr(req.params.id) },
      data: parsed.data,
    });

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'images.update',
      entityType: 'image',
      entityId: updated.id,
    });

    res.json({ item: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/images/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const img = await prisma.image.findUnique({ where: { id: paramStr(req.params.id) } });
    if (!img) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    await storage.deleteImageByUrls([img.originalUrl, img.webUrl, img.webSmallUrl, img.thumbUrl]);
    await prisma.image.delete({ where: { id: img.id } });

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'images.delete',
      entityType: 'image',
      entityId: img.id,
      details: { title: img.title },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/images/bulk-delete', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const schema = z.object({ ids: z.array(z.string()).min(1).max(100) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid image IDs' });
      return;
    }
    const imgs = await prisma.image.findMany({ where: { id: { in: parsed.data.ids } } });
    for (const img of imgs) {
      await storage.deleteImageByUrls([img.originalUrl, img.webUrl, img.webSmallUrl, img.thumbUrl]);
    }
    await prisma.image.deleteMany({ where: { id: { in: parsed.data.ids } } });

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'images.bulk_delete',
      entityType: 'image',
      details: { count: imgs.length },
    });

    res.json({ ok: true, deleted: imgs.length });
  } catch (err) {
    next(err);
  }
});

// ==================== INBOX ====================

const INBOX_TYPES = ['contact', 'volunteers', 'partners', 'events'] as const;
type InboxType = (typeof INBOX_TYPES)[number];

function isInboxType(val: string): val is InboxType {
  return (INBOX_TYPES as readonly string[]).includes(val);
}

adminRouter.get('/inbox/:type', requireRole('admin', 'editor', 'viewer'), async (req, res, next) => {
  try {
    const type = paramStr(req.params.type);
    if (!isInboxType(type)) {
      res.status(400).json({ error: 'Invalid inbox type' });
      return;
    }
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;

    let items: Record<string, unknown>[] = [];
    if (type === 'contact') {
      items = await prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' } });
    } else if (type === 'volunteers') {
      items = await prisma.volunteerApplication.findMany({ where, orderBy: { createdAt: 'desc' } });
    } else if (type === 'partners') {
      items = await prisma.partnerInquiry.findMany({ where, orderBy: { createdAt: 'desc' } });
    } else {
      items = await prisma.eventRegistration.findMany({ where, orderBy: { createdAt: 'desc' } });
    }

    if (q) {
      items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
    }

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/inbox/:type/export', requireRole('admin'), async (req, res, next) => {
  try {
    const type = paramStr(req.params.type);
    if (!isInboxType(type)) {
      res.status(400).json({ error: 'Invalid inbox type' });
      return;
    }

    let rows: Record<string, unknown>[] = [];
    if (type === 'contact') rows = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    else if (type === 'volunteers') rows = await prisma.volunteerApplication.findMany({ orderBy: { createdAt: 'desc' } });
    else if (type === 'partners') rows = await prisma.partnerInquiry.findMany({ orderBy: { createdAt: 'desc' } });
    else rows = await prisma.eventRegistration.findMany({ orderBy: { createdAt: 'desc' } });

    const headers = rows.length ? Object.keys(rows[0]) : ['id'];
    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(',')),
    ];

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'inbox.export_csv',
      entityType: type,
      details: { count: rows.length },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dijitali-${type}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

const inboxPatchSchema = z.object({
  status: z.enum(['new', 'read', 'replied', 'archived']).optional(),
  notes: z.string().max(4000).optional(),
});

adminRouter.patch('/inbox/:type/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const type = paramStr(req.params.type); const id = paramStr(req.params.id);
    if (!isInboxType(type)) {
      res.status(400).json({ error: 'Invalid inbox type' });
      return;
    }
    const parsed = inboxPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid update payload' });
      return;
    }

    let item: unknown;
    if (type === 'contact') item = await prisma.contactMessage.update({ where: { id }, data: parsed.data });
    else if (type === 'volunteers') item = await prisma.volunteerApplication.update({ where: { id }, data: parsed.data });
    else if (type === 'partners') item = await prisma.partnerInquiry.update({ where: { id }, data: parsed.data });
    else item = await prisma.eventRegistration.update({ where: { id }, data: parsed.data });

    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/inbox/:type/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const type = paramStr(req.params.type); const id = paramStr(req.params.id);
    if (!isInboxType(type)) {
      res.status(400).json({ error: 'Invalid inbox type' });
      return;
    }
    if (type === 'contact') await prisma.contactMessage.delete({ where: { id } });
    else if (type === 'volunteers') await prisma.volunteerApplication.delete({ where: { id } });
    else if (type === 'partners') await prisma.partnerInquiry.delete({ where: { id } });
    else await prisma.eventRegistration.delete({ where: { id } });

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'inbox.delete',
      entityType: type,
      entityId: id,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== SUBSCRIBERS ====================

adminRouter.get('/subscribers', requireRole('admin', 'editor', 'viewer'), async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    let items = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
    if (q) items = items.filter((s) => s.email.toLowerCase().includes(q));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/subscribers/export', requireRole('admin'), async (req, res, next) => {
  try {
    const items = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
    const headers = ['id', 'email', 'status', 'confirmedAt', 'createdAt'];
    const csv = [
      headers.join(','),
      ...items.map((s) =>
        [s.id, s.email, s.status, s.confirmedAt?.toISOString() || '', s.createdAt.toISOString()]
          .map(escapeCsvCell)
          .join(',')
      ),
    ].join('\n');

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'subscribers.export_csv',
      details: { count: items.length },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dijitali-subscribers.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/subscribers/:id/unsubscribe', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const item = await prisma.subscriber.update({
      where: { id: paramStr(req.params.id) },
      data: { status: 'unsubscribed', unsubscribedAt: new Date() },
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/subscribers/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    await prisma.subscriber.delete({ where: { id: paramStr(req.params.id) } });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'subscribers.delete',
      entityType: 'subscriber',
      entityId: paramStr(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== USERS (ADMIN ONLY) ====================

adminRouter.get('/users', requireRole('admin'), async (_req, res, next) => {
  try {
    const items = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        inviteExpiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

const inviteUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  role: z.enum(['admin', 'editor', 'viewer']),
});

adminRouter.post('/users/invite', requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = inviteUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid user data' });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const rawInviteToken = generateToken(32);
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h
    const user = await prisma.user.create({
      data: {
        email,
        name: sanitizePlainText(parsed.data.name),
        role: parsed.data.role,
        isActive: false,
        inviteTokenHash: hashToken(rawInviteToken),
        inviteExpiresAt,
      },
    });

    const inviteUrl = `${env.appOrigin}/admin?inviteToken=${rawInviteToken}`;
    if (isSmtpConfigured()) {
      await sendEmail({
        to: user.email,
        subject: 'You are invited to Dijitali Maths Admin',
        text: `Hello ${user.name},\n\nYou have been invited as a ${user.role} on Dijitali Maths.\nSet up your password here (valid for 72 hours):\n${inviteUrl}`,
      });
    }

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'users.invite',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive },
      inviteUrl: isSmtpConfigured() ? undefined : inviteUrl,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(['admin', 'editor', 'viewer']).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid user update' });
      return;
    }
    if (paramStr(req.params.id) === req.authUser!.id && parsed.data.isActive === false) {
      res.status(400).json({ error: 'You cannot deactivate your own account.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: paramStr(req.params.id) },
      data: parsed.data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (parsed.data.isActive === false) {
      await prisma.session.deleteMany({ where: { userId: updated.id } });
    }

    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'users.update',
      entityType: 'user',
      entityId: updated.id,
      details: parsed.data,
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users/:id/reset-password', requireRole('admin'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: paramStr(req.params.id) } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const rawToken = generateToken(32);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: hashToken(rawToken),
        resetExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const resetUrl = `${env.appOrigin}/admin?resetToken=${rawToken}`;
    if (isSmtpConfigured()) {
      await sendEmail({
        to: user.email,
        subject: 'Dijitali Maths Admin — Password Reset',
        text: `An administrator initiated a password reset for your account.\nSet a new password here:\n${resetUrl}`,
      });
    }
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'users.trigger_reset',
      entityType: 'user',
      entityId: user.id,
    });
    res.json({ ok: true, resetUrl: isSmtpConfigured() ? undefined : resetUrl });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    if (paramStr(req.params.id) === req.authUser!.id) {
      res.status(400).json({ error: 'You cannot delete your own account.' });
      return;
    }
    await prisma.user.delete({ where: { id: paramStr(req.params.id) } });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'users.delete',
      entityType: 'user',
      entityId: paramStr(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== VISITORS & AUDIT LOGS ====================

adminRouter.get('/visitors', requireRole('admin', 'editor', 'viewer'), async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 30)));
    const sinceStr = new Date(Date.now() - (days - 1) * 86400_000).toISOString().slice(0, 10);

    const [stats, uniqueRows] = await Promise.all([
      prisma.dailyPageStat.findMany({ where: { date: { gte: sinceStr } } }),
      prisma.dailyUniqueVisitor.groupBy({
        by: ['date'],
        where: { date: { gte: sinceStr } },
        _count: { visitorHash: true },
      }),
    ]);

    let totalVisits = 0;
    const byDate: Record<string, number> = {};
    const byPage: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    const byReferrer: Record<string, number> = {};

    for (const row of stats) {
      totalVisits += row.views;
      byDate[row.date] = (byDate[row.date] || 0) + row.views;
      byPage[row.path] = (byPage[row.path] || 0) + row.views;
      byDevice[row.deviceType] = (byDevice[row.deviceType] || 0) + row.views;
      byBrowser[row.browserFamily] = (byBrowser[row.browserFamily] || 0) + row.views;
      byReferrer[row.referrerDomain] = (byReferrer[row.referrerDomain] || 0) + row.views;
    }

    const uniqueByDate: Record<string, number> = {};
    let totalUniqueEstimate = 0;
    for (const u of uniqueRows) {
      uniqueByDate[u.date] = u._count.visitorHash;
      totalUniqueEstimate += u._count.visitorHash;
    }

    const sortTop = (rec: Record<string, number>, limit = 10) =>
      Object.entries(rec)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));

    const timeline = Object.keys(byDate)
      .sort()
      .map((date) => ({
        date,
        views: byDate[date],
        unique: uniqueByDate[date] || 0,
      }));

    res.json({
      totalVisits,
      uniqueVisitors: totalUniqueEstimate,
      timeline,
      topPages: sortTop(byPage, 12),
      devices: sortTop(byDevice, 5),
      browsers: sortTop(byBrowser, 8),
      referrers: sortTop(byReferrer, 10),
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit-logs', requireRole('admin'), async (_req, res, next) => {
  try {
    const items = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});
