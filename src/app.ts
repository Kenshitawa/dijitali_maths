import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { HelmetOptions } from 'helmet';
import multer from 'multer';
import { env, validateProductionEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { adminRouter } from './routes/admin.js';
import { adminContentRouter } from './routes/adminContent.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';

const require = createRequire(import.meta.url);
const helmet = require('helmet') as (options?: Readonly<HelmetOptions>) => RequestHandler;

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.locals.requestId = requestId;
    next();
  });
  if (env.isProd) {
    app.use((req, res, next) => {
      if (!req.secure) {
        res.redirect(308, `${env.siteUrl}${req.originalUrl}`);
        return;
      }
      next();
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https://i.ytimg.com'],
          frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === env.appOrigin) {
          callback(null, true);
        } else {
          callback(new Error('CORS origin not allowed'));
        }
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  // 301 Redirects for legacy stub pages
  const legacyRedirects: Record<string, string> = {
    '/annual-reports.html': '/impact.html',
    '/memoranda.html': '/impact.html',
    '/corona.html': '/aboutus.html',
    '/donation_test.html': '/donation.html',
  };
  for (const [oldPath, targetPath] of Object.entries(legacyRedirects)) {
    app.get(oldPath, (_req, res) => {
      res.redirect(301, targetPath);
    });
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'dijitali-maths' });
  });

  app.get('/api/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, service: 'dijitali-maths', database: 'ready' });
    } catch {
      console.error(`[health] request=${res.locals.requestId || 'unknown'} database readiness failed.`);
      res.status(503).json({ ok: false, service: 'dijitali-maths', database: 'unavailable' });
    }
  });

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: 'dijitali-maths' });
  });
  app.get('/readyz', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, service: 'dijitali-maths', database: 'ready' });
    } catch {
      res.status(503).json({ ok: false, service: 'dijitali-maths', database: 'unavailable' });
    }
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin', adminContentRouter);
  app.use('/api', publicRouter);

  // Static files
  app.use('/uploads', express.static(path.resolve(env.uploadDir), { maxAge: '30d' }));
  app.use('/images', express.static(path.resolve('images'), { maxAge: '7d' }));
  app.use('/documents', express.static(path.resolve('documents'), { maxAge: '7d' }));
  app.use('/admin', express.static(path.resolve('public/admin'), { maxAge: '1h', etag: true, lastModified: true }));
  app.use('/', express.static(path.resolve('public'), { extensions: ['html'], maxAge: '1h', etag: true, lastModified: true }));

  // Fallback for /admin/*
  app.get('/admin/{*splat}', (_req, res) => {
    res.sendFile(path.resolve('public/admin/index.html'));
  });

  // 404 for unknown /api routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: `Image exceeds the ${(env.maxUploadFileBytes / 1_000_000).toFixed(1)} MB limit.` });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ error: `Too many files. Maximum is ${env.maxUploadFiles} files per upload.` });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }

    if (err instanceof Error && err.message === 'CORS origin not allowed') {
      res.status(403).json({ error: 'CORS origin not allowed' });
      return;
    }

    const requestId = String(res.locals.requestId || 'unknown');
    const errorName = err instanceof Error ? err.name : 'UnknownError';
    console.error(`[server] request=${requestId} error=${errorName}`);
    res.status(500).json({
      error: env.isProd ? 'Internal server error' : err instanceof Error ? err.message : 'Internal server error',
      requestId,
    });
  });

  return app;
}

validateProductionEnv();

const app = createApp();
export default app;

