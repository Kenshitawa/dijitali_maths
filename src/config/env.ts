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
