import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const BCRYPT_COST = 12;

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', env.sessionSecret).update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashVisitorDaily(ip: string, userAgent: string, dateStr: string): string {
  return crypto
    .createHmac('sha256', env.analyticsSaltSecret)
    .update(`${dateStr}:${ip}:${userAgent}`)
    .digest('hex')
    .slice(0, 32);
}
