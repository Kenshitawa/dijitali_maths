import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return transporter;
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const tx = getTransporter();
  if (!tx) {
    return { sent: false, reason: 'SMTP not configured' };
  }
  try {
    await tx.sendMail({
      from: env.smtpFrom,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[mailer] Email delivery failed (${err instanceof Error ? err.name : 'UnknownError'}).`);
    return { sent: false, reason: 'Email delivery failed' };
  }
}

export async function notifyAdmin(subject: string, lines: string[]): Promise<void> {
  const text = lines.join('\n');
  await sendEmail({
    to: env.notifyEmail,
    subject: `[Dijitali Maths] ${subject}`,
    text,
  });
}
