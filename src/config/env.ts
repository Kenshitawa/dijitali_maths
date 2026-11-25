import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  siteUrl: (process.env.SITE_URL || 'https://dijitalimaths.com').replace(/\/+$/, ''),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-session-secret-change-me-in-prod-32chars',
  analyticsSaltSecret: process.env.ANALYTICS_SALT_SECRET || 'dev-only-analytics-salt-change-me',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 12),
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES || 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadFileBytes: Number(process.env.MAX_UPLOAD_FILE_MB || 10) * 1024 * 1024,
  maxVideoUploadFileBytes: Number(process.env.MAX_VIDEO_FILE_MB || 100) * 1024 * 1024,
  maxUploadFiles: Number(process.env.MAX_UPLOAD_FILES || 20),
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
