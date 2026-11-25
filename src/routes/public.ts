import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { generateToken, hashToken, hashVisitorDaily } from '../lib/crypto.js';
import { initiateStkPush, isMpesaConfigured, normalizeKenyanPhoneNumber } from '../lib/mpesa.js';
import { isSmtpConfigured, notifyAdmin, sendEmail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { sanitizePlainText } from '../lib/sanitize.js';
import { analyticsLimiter, publicFormLimiter } from '../middleware/rateLimit.js';

export const publicRouter = Router();
const DEFAULT_DONATION_AMOUNTS = '500,1000,2500,5000,10000';

const BOT_UA_REGEX =
  /bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|whatsapp|telegrambot|curl|wget|python-requests|headless/i;

// GET /api/site-settings
publicRouter.get('/site-settings', async (_req, res, next) => {
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
    settings.donationAmounts ??= DEFAULT_DONATION_AMOUNTS;
    settings.mpesaStkEnabled = isMpesaConfigured();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

const stkPushSchema = z.object({
  amount: z.coerce.number().int().min(1).max(250_000),
  phoneNumber: z.string().trim().min(9).max(20),
});

publicRouter.post('/donations/mpesa/stk', publicFormLimiter, async (req, res, next) => {
  try {
    const parsed = stkPushSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter a valid donation amount and Kenyan mobile number.' });
      return;
    }

    const phoneNumber = normalizeKenyanPhoneNumber(parsed.data.phoneNumber);
    if (!phoneNumber) {
      res.status(400).json({ error: 'Enter a valid Kenyan mobile number, such as 0712 345 678.' });
      return;
    }

    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ['donationAmounts', 'mpesaPaybill'] } },
    });
    const settings = Object.fromEntries(
      rows.map((row) => {
        try {
          return [row.key, JSON.parse(row.valueJson) as unknown];
        } catch {
          return [row.key, row.valueJson];
        }
      })
    );
    const allowedAmounts =
      typeof settings.donationAmounts === 'string'
        ? settings.donationAmounts.split(',').map((value) => Number(value.trim()))
        : DEFAULT_DONATION_AMOUNTS.split(',').map(Number);
    if (!allowedAmounts.includes(parsed.data.amount)) {
      res.status(400).json({ error: 'Choose one of the currently listed donation amounts.' });
      return;
    }

    const shortcode = String(settings.mpesaPaybill || env.mpesaShortcode).replace(/\D/g, '');
    if (!shortcode || !isMpesaConfigured()) {
      res.status(503).json({ error: 'M-Pesa Express is not available right now. Use the Paybill or bank instructions.' });
      return;
    }

    let result: Awaited<ReturnType<typeof initiateStkPush>>;
    try {
      result = await initiateStkPush({
        amount: parsed.data.amount,
        phoneNumber,
        shortcode,
      });
    } catch (err) {
      console.error('[mpesa] STK push request failed:', err);
      res.status(502).json({ error: err instanceof Error ? err.message : 'M-Pesa payment could not be started.' });
      return;
    }
    await prisma.donationPayment.create({
      data: {
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        amount: parsed.data.amount,
        phoneLastFour: phoneNumber.slice(-4),
      },
    });
    res.status(202).json({
      checkoutRequestId: result.checkoutRequestId,
      message: 'A payment request was sent to your phone. Enter your M-Pesa PIN to continue.',
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/donations/mpesa/status/:checkoutRequestId', async (req, res, next) => {
  try {
    const checkoutRequestId = Array.isArray(req.params.checkoutRequestId)
      ? req.params.checkoutRequestId[0]
      : req.params.checkoutRequestId;
    const payment = await prisma.donationPayment.findUnique({
      where: { checkoutRequestId },
      select: { status: true, resultDescription: true, amount: true, mpesaReceiptNumber: true },
    });
    if (!payment) {
      res.status(404).json({ error: 'Payment request not found.' });
      return;
    }
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/donations/mpesa/callback', async (req, res, next) => {
  try {
    const suppliedToken = typeof req.query.token === 'string' ? Buffer.from(req.query.token) : Buffer.alloc(0);
    const expectedToken = Buffer.from(env.mpesaCallbackToken);
    if (
      !expectedToken.length ||
      suppliedToken.length !== expectedToken.length ||
      !timingSafeEqual(suppliedToken, expectedToken)
    ) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }

    const callback = z
      .object({
        Body: z.object({
          stkCallback: z.object({
            CheckoutRequestID: z.string(),
            ResultCode: z.number().int(),
            ResultDesc: z.string().max(500),
            CallbackMetadata: z
              .object({
                Item: z.array(z.object({ Name: z.string(), Value: z.union([z.string(), z.number()]).optional() })),
              })
              .optional(),
          }),
        }),
      })
      .safeParse(req.body);
    if (!callback.success) {
      res.status(400).json({ error: 'Invalid M-Pesa callback.' });
      return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback.data.Body.stkCallback;
    const metadata = new Map((CallbackMetadata?.Item || []).map((item) => [item.Name, item.Value]));
    const receipt = metadata.get('MpesaReceiptNumber');
    const transactionDate = metadata.get('TransactionDate');
    const transactionDateValue =
      typeof transactionDate === 'number' && /^\d{14}$/.test(String(transactionDate))
        ? new Date(`${String(transactionDate).slice(0, 4)}-${String(transactionDate).slice(4, 6)}-${String(transactionDate).slice(6, 8)}T${String(transactionDate).slice(8, 10)}:${String(transactionDate).slice(10, 12)}:${String(transactionDate).slice(12, 14)}+03:00`)
        : null;

    await prisma.donationPayment.updateMany({
      where: { checkoutRequestId: CheckoutRequestID, status: 'pending' },
      data: {
        status: ResultCode === 0 ? 'completed' : 'failed',
        resultCode: ResultCode,
        resultDescription: ResultDesc,
        mpesaReceiptNumber: typeof receipt === 'string' ? receipt : null,
        transactionDate: transactionDateValue,
      },
    });
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/gallery
publicRouter.get('/gallery', async (req, res, next) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const where: { published: boolean; category?: string } = { published: true };
    if (category && category !== 'all') {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.image.count({ where }),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/gallery/:id
publicRouter.get('/gallery/:id', async (req, res, next) => {
  try {
    const item = await prisma.image.findFirst({
      where: { id: req.params.id, published: true },
    });
    if (!item) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

// GET /api/programs
publicRouter.get('/programs', async (_req, res, next) => {
  try {
    const items = await prisma.program.findMany({
      where: { status: 'published' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({
      items: items.map((p) => ({
        ...p,
        tags: safeJsonArray(p.tagsJson),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/programs/:slug
publicRouter.get('/programs/:slug', async (req, res, next) => {
  try {
    const item = await prisma.program.findFirst({
      where: { slug: req.params.slug, status: 'published' },
    });
    if (!item) {
      res.status(404).json({ error: 'Program not found' });
      return;
    }
    res.json({ item: { ...item, tags: safeJsonArray(item.tagsJson) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/events
publicRouter.get('/events', async (_req, res, next) => {
  try {
    const items = await prisma.event.findMany({
      where: { status: 'published' },
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:slug
publicRouter.get('/events/:slug', async (req, res, next) => {
  try {
    const item = await prisma.event.findFirst({
      where: { slug: req.params.slug, status: 'published' },
    });
    if (!item) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts
publicRouter.get('/posts', async (_req, res, next) => {
  try {
    const items = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:slug
publicRouter.get('/posts/:slug', async (req, res, next) => {
  try {
    const item = await prisma.post.findFirst({
      where: { slug: req.params.slug, status: 'published' },
    });
    if (!item) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

// GET /api/videos
publicRouter.get('/videos', async (_req, res, next) => {
  try {
    const items = await prisma.video.findMany({
      where: { status: 'published' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/contact
const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().max(40).optional().default(''),
  enquiryType: z.string().trim().min(2, 'Please select a reason for enquiry').max(120),
  message: z.string().trim().min(5, 'Please enter a message').max(4000),
  _honey: z.string().max(200).optional().default(''),
});

publicRouter.post('/contact', publicFormLimiter, async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid form input' });
      return;
    }
    if (parsed.data._honey) {
      res.status(200).json({ ok: true, message: 'Thank you for your message.' });
      return;
    }

    const created = await prisma.contactMessage.create({
      data: {
        name: sanitizePlainText(parsed.data.name),
        email: parsed.data.email.toLowerCase(),
        phone: sanitizePlainText(parsed.data.phone),
        enquiryType: sanitizePlainText(parsed.data.enquiryType),
        message: sanitizePlainText(parsed.data.message),
      },
    });

    await notifyAdmin(`New Contact Message (${created.enquiryType})`, [
      `From: ${created.name} <${created.email}>`,
      `Phone: ${created.phone || 'N/A'}`,
      `Enquiry Type: ${created.enquiryType}`,
      '',
      created.message,
    ]);

    res.status(201).json({
      ok: true,
      id: created.id,
      message: "Message sent! We'll get back to you within 24 hours.",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/volunteers
const volunteerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().min(6, 'Please enter your phone or WhatsApp number').max(40),
  county: z.string().trim().min(2, 'Please select your county or location').max(120),
  skills: z.array(z.string().trim().max(80)).min(1, 'Please select at least one skill or interest'),
  availability: z.string().trim().min(2, 'Please select your general availability').max(120),
  motivation: z.string().trim().min(10, 'Please share why you would like to volunteer').max(4000),
  _honey: z.string().max(200).optional().default(''),
});

publicRouter.post('/volunteers', publicFormLimiter, async (req, res, next) => {
  try {
    const parsed = volunteerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid application input' });
      return;
    }
    if (parsed.data._honey) {
      res.status(200).json({ ok: true, message: 'Application received.' });
      return;
    }

    const cleanSkills = parsed.data.skills.map(sanitizePlainText);
    const created = await prisma.volunteerApplication.create({
      data: {
        name: sanitizePlainText(parsed.data.name),
        email: parsed.data.email.toLowerCase(),
        phone: sanitizePlainText(parsed.data.phone),
        county: sanitizePlainText(parsed.data.county),
        skillsJson: JSON.stringify(cleanSkills),
        availability: sanitizePlainText(parsed.data.availability),
        motivation: sanitizePlainText(parsed.data.motivation),
      },
    });

    await notifyAdmin(`New Volunteer Application: ${created.name}`, [
      `Name: ${created.name}`,
      `Email: ${created.email}`,
      `Phone: ${created.phone}`,
      `County: ${created.county}`,
      `Skills: ${cleanSkills.join(', ')}`,
      `Availability: ${created.availability}`,
      '',
      `Motivation:\n${created.motivation}`,
    ]);

    res.status(201).json({
      ok: true,
      id: created.id,
      message: 'Volunteer application received! Our team will follow up with you soon.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/partners
const partnerSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  organization: z.string().trim().max(160).optional().default(''),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().min(6, 'Please enter your phone number').max(40),
  partnershipType: z.string().trim().min(2, 'Please select a partnership type').max(120),
  amountLabel: z.string().trim().max(80).optional().default(''),
  message: z.string().trim().min(5, 'Please share how you would like to partner').max(4000),
  _honey: z.string().max(200).optional().default(''),
});

publicRouter.post('/partners', publicFormLimiter, async (req, res, next) => {
  try {
    const parsed = partnerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid partner inquiry' });
      return;
    }
    if (parsed.data._honey) {
      res.status(200).json({ ok: true, message: 'Partnership inquiry received.' });
      return;
    }

    const created = await prisma.partnerInquiry.create({
      data: {
        name: sanitizePlainText(parsed.data.name),
        organization: sanitizePlainText(parsed.data.organization),
        email: parsed.data.email.toLowerCase(),
        phone: sanitizePlainText(parsed.data.phone),
        partnershipType: sanitizePlainText(parsed.data.partnershipType),
        amountLabel: sanitizePlainText(parsed.data.amountLabel),
        message: sanitizePlainText(parsed.data.message),
      },
    });

    await notifyAdmin(`New Partnership Inquiry: ${created.name}`, [
      `Name: ${created.name}`,
      `Organization: ${created.organization || 'Individual'}`,
      `Email: ${created.email}`,
      `Phone: ${created.phone}`,
      `Type: ${created.partnershipType}`,
      `Amount/Support: ${created.amountLabel || 'N/A'}`,
      '',
      created.message,
    ]);

    res.status(201).json({
      ok: true,
      id: created.id,
      message: 'Partnership inquiry received! Thank you for supporting mathematics education in Kenya.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/event-registrations
const eventRegSchema = z.object({
  eventTitle: z.string().trim().min(2, 'Please select an event').max(200),
  eventId: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  phone: z.string().trim().min(6, 'Please enter your phone or WhatsApp number').max(40),
  roleType: z.string().trim().min(2, 'Please select how you are registering').max(80),
  _honey: z.string().max(200).optional().default(''),
});

publicRouter.post('/event-registrations', publicFormLimiter, async (req, res, next) => {
  try {
    const parsed = eventRegSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration' });
      return;
    }
    if (parsed.data._honey) {
      res.status(200).json({ ok: true, message: 'Registration confirmed.' });
      return;
    }

    let resolvedEventId: string | null = null;
    if (parsed.data.eventId) {
      const ev = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
      if (ev) resolvedEventId = ev.id;
    }

    const created = await prisma.eventRegistration.create({
      data: {
        eventTitle: sanitizePlainText(parsed.data.eventTitle),
        eventId: resolvedEventId,
        name: sanitizePlainText(parsed.data.name),
        email: parsed.data.email.toLowerCase(),
        phone: sanitizePlainText(parsed.data.phone),
        roleType: sanitizePlainText(parsed.data.roleType),
      },
    });

    await notifyAdmin(`New Event Registration: ${created.eventTitle}`, [
      `Event: ${created.eventTitle}`,
      `Name: ${created.name}`,
      `Email: ${created.email}`,
      `Phone: ${created.phone}`,
      `Role: ${created.roleType}`,
    ]);

    res.status(201).json({
      ok: true,
      id: created.id,
      message: 'Registration confirmed! We look forward to exploring mathematics with you.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscribers (double opt-in)
const subscriberSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(160),
  _honey: z.string().max(200).optional().default(''),
});

publicRouter.post('/subscribers', publicFormLimiter, async (req, res, next) => {
  try {
    const parsed = subscriberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid email address' });
      return;
    }
    if (parsed.data._honey) {
      res.status(200).json({ ok: true, message: 'Subscribed!' });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const rawToken = generateToken(24);
    const confirmTokenHash = hashToken(rawToken);
    const smtpActive = isSmtpConfigured();

    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing && existing.status === 'confirmed') {
      res.json({ ok: true, status: 'confirmed', message: 'You are already subscribed to Dijitali Maths updates!' });
      return;
    }

    await prisma.subscriber.upsert({
      where: { email },
      update: {
        status: smtpActive ? 'pending' : 'confirmed',
        confirmTokenHash: smtpActive ? confirmTokenHash : null,
        confirmedAt: smtpActive ? null : new Date(),
        unsubscribedAt: null,
      },
      create: {
        email,
        status: smtpActive ? 'pending' : 'confirmed',
        confirmTokenHash: smtpActive ? confirmTokenHash : null,
        confirmedAt: smtpActive ? null : new Date(),
      },
    });

    if (smtpActive) {
      const confirmUrl = `${env.appOrigin}/api/subscribers/confirm?token=${rawToken}`;
      await sendEmail({
        to: email,
        subject: 'Confirm your Dijitali Maths newsletter subscription',
        text: `Thank you for subscribing to Dijitali Maths!\n\nPlease confirm your subscription by clicking this link:\n${confirmUrl}\n\nIf you did not request this, you can ignore this email.`,
      });
    }

    await notifyAdmin('New Newsletter Subscriber', [`Email: ${email}`, `Double opt-in email sent: ${smtpActive}`]);

    res.status(201).json({
      ok: true,
      status: smtpActive ? 'pending' : 'confirmed',
      message: smtpActive
        ? 'Please check your inbox to confirm your newsletter subscription!'
        : 'Thank you for subscribing to Dijitali Maths updates!',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscribers/confirm
publicRouter.get('/subscribers/confirm', async (req, res, next) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
      res.status(400).send('Invalid confirmation link.');
      return;
    }
    const tokenHash = hashToken(token);
    const sub = await prisma.subscriber.findUnique({ where: { confirmTokenHash: tokenHash } });
    if (!sub) {
      res.status(404).send('Confirmation link is invalid or already used.');
      return;
    }
    await prisma.subscriber.update({
      where: { id: sub.id },
      data: { status: 'confirmed', confirmedAt: new Date(), confirmTokenHash: null },
    });
    res.redirect('/?subscribed=1');
  } catch (err) {
    next(err);
  }
});

// POST /api/analytics/pageview
const pageviewSchema = z.object({
  path: z.string().trim().min(1).max(300),
  referrerDomain: z.string().trim().max(160).optional().default('direct'),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional().default('desktop'),
  browserFamily: z.string().trim().max(60).optional().default('other'),
});

publicRouter.post('/analytics/pageview', analyticsLimiter, async (req, res, next) => {
  try {
    const ua = req.get('user-agent') || '';
    if (!ua || BOT_UA_REGEX.test(ua)) {
      res.status(204).end();
      return;
    }

    const parsed = pageviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid pageview payload' });
      return;
    }

    const cleanPath = parsed.data.path.split('?')[0].slice(0, 300);
    if (cleanPath.startsWith('/admin') || cleanPath.startsWith('/api')) {
      res.status(204).end();
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const visitorHash = hashVisitorDaily(ip, ua, dateStr);
    const refDomain = sanitizePlainText(parsed.data.referrerDomain || 'direct') || 'direct';
    const browser = sanitizePlainText(parsed.data.browserFamily || 'other') || 'other';

    await prisma.dailyPageStat.upsert({
      where: {
        date_path_referrerDomain_deviceType_browserFamily: {
          date: dateStr,
          path: cleanPath,
          referrerDomain: refDomain,
          deviceType: parsed.data.deviceType,
          browserFamily: browser,
        },
      },
      update: { views: { increment: 1 } },
      create: {
        date: dateStr,
        path: cleanPath,
        referrerDomain: refDomain,
        deviceType: parsed.data.deviceType,
        browserFamily: browser,
        views: 1,
      },
    });

    await prisma.dailyUniqueVisitor
      .upsert({
        where: { date_visitorHash: { date: dateStr, visitorHash } },
        update: {},
        create: { date: dateStr, visitorHash },
      })
      .catch(() => {});

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function safeJsonArray(jsonStr: string): string[] {
  try {
    const val = JSON.parse(jsonStr);
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}
