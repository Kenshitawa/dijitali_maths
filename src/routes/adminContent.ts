import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { recordAuditLog } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { sanitizePlainText, sanitizeRichText } from '../lib/sanitize.js';
import { deleteStoredVideo, detectVideoMime, saveVideo } from '../lib/videoStorage.js';
import { isMpesaConfigured } from '../lib/mpesa.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

export const adminContentRouter = Router();
adminContentRouter.use(requireAuth);

function paramStr(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] || '' : val || '';
}

// ==================== PROGRAMS ====================

const programSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(200),
  categoryLabel: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(5).max(600),
  description: z.string().trim().min(5).max(5000),
  tags: z.array(z.string().trim().max(50)).default([]),
  imageUrl: z.string().trim().max(400).nullable().optional(),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('published'),
  sortOrder: z.number().int().min(0).default(0),
});

adminContentRouter.get('/programs', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const items = await prisma.program.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/programs', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = programSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid program data' });
      return;
    }
    const { tags, ...rest } = parsed.data;
    const item = await prisma.program.create({
      data: { ...rest, tagsJson: JSON.stringify(tags) },
    });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'programs.create',
      entityType: 'program',
      entityId: item.id,
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.patch('/programs/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = programSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid program update' });
      return;
    }
    const { tags, ...rest } = parsed.data;
    const item = await prisma.program.update({
      where: { id: paramStr(req.params.id) },
      data: {
        ...rest,
        ...(tags !== undefined ? { tagsJson: JSON.stringify(tags) } : {}),
      },
    });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'programs.update',
      entityType: 'program',
      entityId: item.id,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/programs/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    await prisma.program.delete({ where: { id: paramStr(req.params.id) } });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'programs.delete',
      entityType: 'program',
      entityId: paramStr(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== EVENTS ====================

const eventSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(200),
  category: z.enum(['festival', 'camp', 'workshop', 'webinar']).default('festival'),
  eventDateLabel: z.string().trim().min(2).max(80),
  eventDate: z.string().datetime().nullable().optional(),
  location: z.string().trim().min(2).max(200),
  audience: z.string().trim().min(2).max(200),
  schedule: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(4000),
  imageUrl: z.string().trim().max(400).nullable().optional(),
  registrationEnabled: z.boolean().default(true),
  status: z.enum(['draft', 'published']).default('published'),
});

adminContentRouter.get('/events', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const items = await prisma.event.findMany({ orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }] });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/events', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid event data' });
      return;
    }
    const item = await prisma.event.create({
      data: {
        ...parsed.data,
        eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      },
    });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'events.create',
      entityType: 'event',
      entityId: item.id,
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.patch('/events/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = eventSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid event update' });
      return;
    }
    const item = await prisma.event.update({
      where: { id: paramStr(req.params.id) },
      data: {
        ...parsed.data,
        ...(parsed.data.eventDate !== undefined
          ? { eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null }
          : {}),
      },
    });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'events.update',
      entityType: 'event',
      entityId: item.id,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/events/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    await prisma.event.delete({ where: { id: paramStr(req.params.id) } });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'events.delete',
      entityType: 'event',
      entityId: paramStr(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== POSTS ====================

const postSchema = z.object({
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().min(5).max(500),
  contentHtml: z.string().trim().min(5).max(40000),
  coverImageUrl: z.string().trim().max(400).nullable().optional(),
  authorName: z.string().trim().min(2).max(120).default('Dijitali Maths Team'),
  status: z.enum(['draft', 'published']).default('draft'),
});

adminContentRouter.get('/posts', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const items = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/posts', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid post data' });
      return;
    }
    const item = await prisma.post.create({
      data: {
        ...parsed.data,
        title: sanitizePlainText(parsed.data.title),
        excerpt: sanitizePlainText(parsed.data.excerpt),
        contentHtml: sanitizeRichText(parsed.data.contentHtml),
        publishedAt: parsed.data.status === 'published' ? new Date() : null,
      },
    });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'posts.create',
      entityType: 'post',
      entityId: item.id,
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.patch('/posts/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = postSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid post update' });
      return;
    }
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.title) data.title = sanitizePlainText(parsed.data.title);
    if (parsed.data.excerpt) data.excerpt = sanitizePlainText(parsed.data.excerpt);
    if (parsed.data.contentHtml) data.contentHtml = sanitizeRichText(parsed.data.contentHtml);
    if (parsed.data.status === 'published') data.publishedAt = new Date();

    const item = await prisma.post.update({ where: { id: paramStr(req.params.id) }, data });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'posts.update',
      entityType: 'post',
      entityId: item.id,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/posts/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    await prisma.post.delete({ where: { id: paramStr(req.params.id) } });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'posts.delete',
      entityType: 'post',
      entityId: paramStr(req.params.id),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== VIDEOS ====================

const videoSchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(2000),
  youtubeUrl: z.string().trim().max(400).nullable().optional(),
  videoUrl: z.string().trim().max(400).nullable().optional(),
  thumbnailUrl: z.string().trim().max(400).nullable().optional(),
  status: z.enum(['draft', 'published']).default('published'),
  sortOrder: z.number().int().min(0).default(0),
});

adminContentRouter.get('/videos', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const items = await prisma.video.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.post('/videos', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = videoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid video data' });
      return;
    }
    const item = await prisma.video.create({ data: parsed.data });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'videos.create',
      entityType: 'video',
      entityId: item.id,
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

const uploadVideoFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxVideoUploadFileBytes, files: 1 },
}).single('video');

const videoUploadSchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(2000),
  status: z.enum(['draft', 'published']).default('published'),
});

adminContentRouter.post(
  '/videos/upload',
  requireRole('admin', 'editor'),
  uploadLimiter,
  uploadVideoFile,
  async (req, res, next) => {
    let storedUrl: string | undefined;
    let videoRecordCreated = false;
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Choose an MP4 or WebM video to upload.' });
        return;
      }

      const parsed = videoUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid video details.' });
        return;
      }

      if (!detectVideoMime(req.file.buffer)) {
        res.status(400).json({ error: 'The selected file is not a valid MP4 or WebM video.' });
        return;
      }

      const stored = await saveVideo(req.file.buffer);
      storedUrl = stored.videoUrl;
      const item = await prisma.video.create({
        data: { ...parsed.data, videoUrl: stored.videoUrl },
      });
      videoRecordCreated = true;
      await recordAuditLog({
        userId: req.authUser!.id,
        userEmail: req.authUser!.email,
        action: 'videos.create',
        entityType: 'video',
        entityId: item.id,
      });
      res.status(201).json({ item });
    } catch (err) {
      if (storedUrl && !videoRecordCreated) await deleteStoredVideo(storedUrl);
      next(err);
    }
  }
);

adminContentRouter.patch('/videos/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const parsed = videoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid video update' });
      return;
    }
    const item = await prisma.video.update({ where: { id: paramStr(req.params.id) }, data: parsed.data });
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'videos.update',
      entityType: 'video',
      entityId: item.id,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.delete('/videos/:id', requireRole('admin', 'editor'), async (req, res, next) => {
  try {
    const id = paramStr(req.params.id);
    const video = await prisma.video.delete({ where: { id } });
    await deleteStoredVideo(video.videoUrl);
    await recordAuditLog({
      userId: req.authUser!.id,
      userEmail: req.authUser!.email,
      action: 'videos.delete',
      entityType: 'video',
      entityId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ==================== SITE SETTINGS ====================

adminContentRouter.get('/settings', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const rows = await prisma.siteSetting.findMany();
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.valueJson);
      } catch {
        settings[row.key] = row.valueJson;
      }
    }
    settings.donationAmounts ??= '500,1000,2500,5000,10000';
    settings.mpesaStkEnabled = isMpesaConfigured();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.get('/donation-payments', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const items = await prisma.donationPayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        amount: true,
        phoneLastFour: true,
        status: true,
        resultDescription: true,
        mpesaReceiptNumber: true,
        createdAt: true,
      },
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.get('/settings/history', requireRole('admin', 'editor', 'viewer'), async (_req, res, next) => {
  try {
    const history = await prisma.siteSettingHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

adminContentRouter.patch('/settings', requireRole('admin'), async (req, res, next) => {
  try {
    const schema = z.record(z.string().min(1).max(80), z.unknown());
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }

    const updatedKeys: string[] = [];
    for (const [key, val] of Object.entries(parsed.data)) {
      let normalizedValue = val;
      if (key === 'donationAmounts') {
        if (typeof val !== 'string' || !/^\s*\d+(?:\s*,\s*\d+)*\s*$/.test(val)) {
          res.status(400).json({ error: 'Enter suggested donation amounts as comma-separated whole KES values.' });
          return;
        }
        const amounts = val.split(',').map((amount) => Number(amount.trim()));
        if (
          amounts.length > 10 ||
          amounts.some((amount) => !Number.isInteger(amount) || amount < 1 || amount > 250_000) ||
          new Set(amounts).size !== amounts.length
        ) {
          res.status(400).json({ error: 'Donation amounts must be unique whole KES values between 1 and 250,000.' });
          return;
        }
        normalizedValue = amounts.join(',');
      }

      const newValue = JSON.stringify(normalizedValue);
      const existing = await prisma.siteSetting.findUnique({ where: { key } });
      if (existing && existing.valueJson === newValue) continue;

      await prisma.siteSetting.upsert({
        where: { key },
        update: { valueJson: newValue, updatedBy: req.authUser!.email },
        create: { key, valueJson: newValue, updatedBy: req.authUser!.email },
      });

      await prisma.siteSettingHistory.create({
        data: {
          key,
          oldValue: existing?.valueJson ?? null,
          newValue,
          changedBy: req.authUser!.email,
        },
      });
      updatedKeys.push(key);
    }

    if (updatedKeys.length) {
      await recordAuditLog({
        userId: req.authUser!.id,
        userEmail: req.authUser!.email,
        action: 'settings.update',
        entityType: 'site_setting',
        details: { keys: updatedKeys },
      });
    }

    res.json({ ok: true, updatedKeys });
  } catch (err) {
    next(err);
  }
});
