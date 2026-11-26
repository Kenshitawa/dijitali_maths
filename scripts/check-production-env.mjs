import process from 'node:process';
import path from 'node:path';
import { URL } from 'node:url';

const errors = [];
const required = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'ANALYTICS_SALT_SECRET',
  'APP_ORIGIN',
  'SITE_URL',
];
const smtpValues = [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS];
if (smtpValues.some(Boolean) && !smtpValues.every((value) => value?.trim())) {
  errors.push('SMTP is partially configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS together, or leave all three unset.');
}
const hasSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
if (!hasSupabaseStorage) required.push('UPLOAD_DIR');
if (process.env.VERCEL && !hasSupabaseStorage) {
  errors.push('SUPABASE_URL and SUPABASE_SECRET_KEY are required on Vercel for durable media storage.');
}
if (Boolean(process.env.SUPABASE_URL) !== Boolean(process.env.SUPABASE_SECRET_KEY)) {
  errors.push('SUPABASE_URL and SUPABASE_SECRET_KEY must be configured together.');
}
if (hasSupabaseStorage) {
  try {
    const supabaseUrl = new URL(process.env.SUPABASE_URL || '');
    if (supabaseUrl.protocol !== 'https:') errors.push('SUPABASE_URL must use HTTPS.');
  } catch {
    errors.push('SUPABASE_URL must be a valid HTTPS URL.');
  }
}

if (process.env.NODE_ENV !== 'production') {
  errors.push('NODE_ENV must be production.');
}
if (Number(process.versions.node.split('.')[0]) < 20) {
  errors.push('Node.js 20 or newer is required.');
}

for (const key of required) {
  if (!process.env[key]?.trim()) errors.push(`${key} is required.`);
}

for (const key of ['SESSION_SECRET', 'ANALYTICS_SALT_SECRET']) {
  const value = process.env[key] || '';
  if (value.length < 32 || /change|default|example/i.test(value)) {
    errors.push(`${key} must be a unique value of at least 32 characters.`);
  }
}

for (const key of ['APP_ORIGIN', 'SITE_URL']) {
  try {
    const url = new URL(process.env[key] || '');
    if (url.protocol !== 'https:') errors.push(`${key} must use HTTPS.`);
  } catch {
    errors.push(`${key} must be a valid HTTPS URL.`);
  }
}

try {
  const databaseUrl = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol) || !databaseUrl.hostname) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (databaseUrl.searchParams.get('sslmode') !== 'require') {
    errors.push('DATABASE_URL must require TLS with sslmode=require.');
  }
} catch {
  errors.push('DATABASE_URL must be a valid PostgreSQL connection URL.');
}

if (!hasSupabaseStorage) {
  const uploadDir = process.env.UPLOAD_DIR || '';
  const absoluteUploadDir = path.resolve(uploadDir || '.');
  const appRoot = path.resolve(process.cwd());
  const publicRoot = path.resolve(appRoot, '..', 'public_html');
  if (
    !path.isAbsolute(uploadDir) ||
    absoluteUploadDir === path.parse(absoluteUploadDir).root ||
    absoluteUploadDir === appRoot ||
    absoluteUploadDir.startsWith(`${appRoot}${path.sep}`) ||
    absoluteUploadDir === publicRoot ||
    absoluteUploadDir.startsWith(`${publicRoot}${path.sep}`)
  ) {
    errors.push('UPLOAD_DIR must be an absolute persistent directory outside public_html.');
  }
}

if (errors.length) {
  process.stderr.write('Production configuration is incomplete:\n');
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.exit(1);
}

process.stdout.write('Production environment checks passed.\n');
