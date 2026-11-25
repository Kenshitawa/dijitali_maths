import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

if (env.isProd) {
  const required: Record<string, string> = {
    SESSION_SECRET: process.env.SESSION_SECRET || '',
    ANALYTICS_SALT_SECRET: process.env.ANALYTICS_SALT_SECRET || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    SITE_URL: process.env.SITE_URL || '',
    UPLOAD_DIR: process.env.UPLOAD_DIR || '',
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
  };
  const missing = Object.entries(required).filter(([, value]) => !value.trim()).map(([key]) => key);
  if (missing.length) {
    console.error(`Refusing to start in production. Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (env.sessionSecret.length < 32 || /change|default|example/i.test(env.sessionSecret)) {
    console.error('Refusing to start in production. SESSION_SECRET must be a unique value of at least 32 characters.');
    process.exit(1);
  }
  if (env.analyticsSaltSecret.length < 32 || /change|default|example/i.test(env.analyticsSaltSecret)) {
    console.error('Refusing to start in production. ANALYTICS_SALT_SECRET must be a unique value of at least 32 characters.');
    process.exit(1);
  }
  if (!env.appOrigin.startsWith('https://')) {
    console.error('Refusing to start in production. APP_ORIGIN must use HTTPS.');
    process.exit(1);
  }
  if (!env.siteUrl.startsWith('https://')) {
    console.error('Refusing to start in production. SITE_URL must use HTTPS.');
    process.exit(1);
  }
  if (!env.uploadDir.startsWith('/')) {
    console.error('Refusing to start in production. UPLOAD_DIR must be an absolute persistent path.');
    process.exit(1);
  }
}

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`Dijitali Maths server running on ${env.appOrigin} (port ${env.port})`);
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}; closing server.`);
  server.close((error) => {
    if (error) {
      console.error('Server shutdown failed.');
      process.exit(1);
    }
    void prisma.$disconnect().then(() => process.exit(0)).catch(() => process.exit(1));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
