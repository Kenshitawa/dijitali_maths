import dotenv from 'dotenv';

dotenv.config();

const configuredUploadLimitMb = Number(process.env.MAX_UPLOAD_FILE_MB);
const maxUploadFileMb =
  Number.isFinite(configuredUploadLimitMb) && configuredUploadLimitMb > 0
    ? Math.min(configuredUploadLimitMb, 4.25)
    : 4.25;

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  siteUrl: (process.env.SITE_URL || 'https://dijitalimaths.org').replace(/\/+$/, ''),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'dijitali-media',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-session-secret-change-me-in-prod-32chars',
  analyticsSaltSecret: process.env.ANALYTICS_SALT_SECRET || 'dev-only-analytics-salt-change-me',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 12),
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES || 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadFileBytes: maxUploadFileMb * 1024 * 1024,
  maxUploadFiles: process.env.VERCEL ? 1 : Number(process.env.MAX_UPLOAD_FILES || 20),
  mpesaEnvironment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  mpesaConsumerKey: process.env.MPESA_CONSUMER_KEY || '',
  mpesaConsumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  mpesaPasskey: process.env.MPESA_PASSKEY || '',
  mpesaShortcode: process.env.MPESA_SHORTCODE || '',
  mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || '',
  mpesaCallbackToken: process.env.MPESA_CALLBACK_TOKEN || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'Dijitali Maths <dijitalimaths@gmail.com>',
  notifyEmail: process.env.NOTIFY_EMAIL || 'dijitalimaths@gmail.com',
};

export function validateProductionEnv() {
  if (!env.isProd) return;

  const usesRemoteStorage = Boolean(env.supabaseUrl && env.supabaseSecretKey);
  const required: Record<string, string> = {
    SESSION_SECRET: process.env.SESSION_SECRET || '',
    ANALYTICS_SALT_SECRET: process.env.ANALYTICS_SALT_SECRET || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    SITE_URL: process.env.SITE_URL || '',
  };
  const smtpValues = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
  if (smtpValues.some(Boolean) && !smtpValues.every((value) => value?.trim())) {
    console.error('SMTP is partially configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS together, or leave all three unset.');
    process.exit(1);
  }
  if (!usesRemoteStorage) required.UPLOAD_DIR = process.env.UPLOAD_DIR || '';
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
  if (!usesRemoteStorage && !env.uploadDir.startsWith('/')) {
    console.error('Refusing to start in production. UPLOAD_DIR must be an absolute persistent path.');
    process.exit(1);
  }
  if (process.env.VERCEL && !usesRemoteStorage) {
    console.error('Refusing to start on Vercel without durable Supabase Storage configuration.');
    process.exit(1);
  }
}

