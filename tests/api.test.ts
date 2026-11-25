import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/crypto.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

let adminEmail = '';
let viewerEmail = '';
const testPassword = 'TestPassword#2026!';

beforeAll(async () => {
  const ts = Date.now();
  adminEmail = `test-admin-${ts}@dijitalimaths.test`;
  viewerEmail = `test-viewer-${ts}@dijitalimaths.test`;

  const passwordHash = await hashPassword(testPassword);
  await prisma.user.create({
    data: { email: adminEmail, name: 'Test Admin', passwordHash, role: 'admin', isActive: true },
  });
  await prisma.user.create({
    data: { email: viewerEmail, name: 'Test Viewer', passwordHash, role: 'viewer', isActive: true },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, viewerEmail] } } });
  await prisma.contactMessage.deleteMany({ where: { email: 'test-contact@example.com' } });
  await prisma.volunteerApplication.deleteMany({ where: { email: 'test-vol@example.com' } });
  await prisma.partnerInquiry.deleteMany({ where: { email: 'test-partner@example.com' } });
  await prisma.eventRegistration.deleteMany({ where: { email: 'test-event@example.com' } });
  await prisma.subscriber.deleteMany({ where: { email: 'test-sub@example.com' } });
  await prisma.$disconnect();
});

describe('Public API & Legacy Redirects', () => {
  it('reports database readiness separately from liveness', async () => {
    const live = await request(app).get('/api/health');
    expect(live.status).toBe(200);
    expect(live.body).toEqual({ ok: true, service: 'dijitali-maths' });

    const ready = await request(app).get('/api/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({
      ok: true,
      service: 'dijitali-maths',
      database: 'ready',
    });
  });

  it('returns 301 redirects for legacy stub URLs', async () => {
    const r1 = await request(app).get('/annual-reports.html');
    expect(r1.status).toBe(301);
    expect(r1.headers.location).toBe('/impact.html');

    const r2 = await request(app).get('/memoranda.html');
    expect(r2.status).toBe(301);
    expect(r2.headers.location).toBe('/impact.html');

    const r3 = await request(app).get('/corona.html');
    expect(r3.status).toBe(301);
    expect(r3.headers.location).toBe('/aboutus.html');

    const r4 = await request(app).get('/donation_test.html');
    expect(r4.status).toBe(301);
    expect(r4.headers.location).toBe('/donation.html');
  });

  it('serves public content endpoints', async () => {
    const settings = await request(app).get('/api/site-settings');
    expect(settings.status).toBe(200);
    expect(settings.body.settings).toBeDefined();
    expect(settings.body.settings.mpesaStkEnabled).toEqual(expect.any(Boolean));

    const programs = await request(app).get('/api/programs');
    expect(programs.status).toBe(200);
    expect(Array.isArray(programs.body.items)).toBe(true);

    const events = await request(app).get('/api/events');
    expect(events.status).toBe(200);
    expect(Array.isArray(events.body.items)).toBe(true);

    const gallery = await request(app).get('/api/gallery');
    expect(gallery.status).toBe(200);
    expect(Array.isArray(gallery.body.items)).toBe(true);

    const posts = await request(app).get('/api/posts');
    expect(posts.status).toBe(200);

    const videos = await request(app).get('/api/videos');
    expect(videos.status).toBe(200);
  });

  it('validates and saves public form submissions', async () => {
    const badContact = await request(app).post('/api/contact').send({ name: 'A' });
    expect(badContact.status).toBe(400);

    const okContact = await request(app).post('/api/contact').send({
      name: 'Test Contact',
      email: 'test-contact@example.com',
      phone: '0712345678',
      enquiryType: 'General Question',
      message: 'Hello Dijitali Maths team!',
    });
    expect(okContact.status).toBe(201);

    const okVol = await request(app).post('/api/volunteers').send({
      name: 'Test Volunteer',
      email: 'test-vol@example.com',
      phone: '0712345678',
      county: 'Nairobi County',
      skills: ['Maths Education'],
      availability: 'Weekends (Saturdays/Sundays)',
      motivation: 'I want to help children enjoy mathematics.',
    });
    expect(okVol.status).toBe(201);

    const okPartner = await request(app).post('/api/partners').send({
      name: 'Test Partner',
      organization: 'Partner Org',
      email: 'test-partner@example.com',
      phone: '0712345678',
      partnershipType: 'Sponsor a Learner',
      message: 'We would like to sponsor a learner.',
    });
    expect(okPartner.status).toBe(201);

    const okEvent = await request(app).post('/api/event-registrations').send({
      eventTitle: 'Nakuru Community Maths Fest',
      name: 'Test Attendee',
      email: 'test-event@example.com',
      phone: '0712345678',
      roleType: 'Parent / Guardian',
    });
    expect(okEvent.status).toBe(201);

    const okSub = await request(app).post('/api/subscribers').send({
      email: 'test-sub@example.com',
    });
    expect(okSub.status).toBe(201);
  });

  it('records privacy-first pageviews and filters bots', async () => {
    const pv = await request(app)
      .post('/api/analytics/pageview')
      .set('User-Agent', 'Mozilla/5.0')
      .send({ path: '/index.html', deviceType: 'desktop', browserFamily: 'Chrome' });
    expect(pv.status).toBe(204);

    const botPv = await request(app)
      .post('/api/analytics/pageview')
      .set('User-Agent', 'Googlebot/2.1')
      .send({ path: '/index.html' });
    expect(botPv.status).toBe(204);
  });
});

describe('Auth, CSRF, RBAC & Rate Limiting', () => {
  it('blocks unauthenticated access to admin endpoints', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('enforces viewer read-only permissions and CSRF', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({
      email: viewerEmail,
      password: testPassword,
    });
    expect(login.status).toBe(200);
    expect(login.body.sessionIdleMinutes).toBeGreaterThan(0);
    const csrf = login.body.csrfToken;

    const dash = await agent.get('/api/admin/dashboard');
    expect(dash.status).toBe(200);

    // Viewer cannot export CSV (admin only)
    const exp = await agent.get('/api/admin/inbox/contact/export');
    expect(exp.status).toBe(403);

    // Missing CSRF is rejected
    const noCsrf = await agent.post('/api/admin/programs').send({ slug: 'x' });
    expect(noCsrf.status).toBe(403);

    // Viewer with CSRF is still forbidden from creating content
    const forbidden = await agent
      .post('/api/admin/programs')
      .set('X-CSRF-Token', csrf)
      .send({
        slug: 'test-prog',
        title: 'Test',
        categoryLabel: 'Test',
        summary: 'Summary text',
        description: 'Description text',
      });
    expect(forbidden.status).toBe(403);
  });

  it('validates M-Pesa requests and donation amounts without sending provider calls', async () => {
    const badPhone = await request(app).post('/api/donations/mpesa/stk').send({
      amount: 500,
      phoneNumber: '12345',
    });
    expect(badPhone.status).toBe(400);

    const invalidCallback = await request(app).post('/api/donations/mpesa/callback').send({});
    expect(invalidCallback.status).toBe(404);

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: adminEmail, password: testPassword });
    const invalidAmounts = await agent
      .patch('/api/admin/settings')
      .set('X-CSRF-Token', login.body.csrfToken)
      .send({ donationAmounts: '500, 500' });
    expect(invalidAmounts.status).toBe(400);
  });

  it('stores, publishes, and removes validated video uploads', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: adminEmail, password: testPassword });
    const csrf = login.body.csrfToken;
    const mp4 = Buffer.alloc(16);
    mp4.write('ftyp', 4);
    mp4.write('isom', 8);

    const upload = await agent
      .post('/api/admin/videos/upload')
      .set('X-CSRF-Token', csrf)
      .field('title', 'API Upload Test Video')
      .field('category', 'Learner Session')
      .field('description', 'A test video uploaded through the admin API.')
      .field('status', 'published')
      .attach('video', mp4, { filename: 'api-test.mp4', contentType: 'video/mp4' });
    expect(upload.status).toBe(201);
    const { id, videoUrl } = upload.body.item;

    try {
      const videos = await request(app).get('/api/videos');
      expect(videos.body.items).toContainEqual(expect.objectContaining({ id, videoUrl }));
      const file = await request(app).get(videoUrl);
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toContain('video/mp4');
    } finally {
      const deleted = await agent.delete(`/api/admin/videos/${id}`).set('X-CSRF-Token', csrf);
      expect(deleted.status).toBe(200);
    }

    expect((await request(app).get(videoUrl)).status).toBe(404);
  });

  it('allows admin to read inbox and export CSV', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({
      email: adminEmail,
      password: testPassword,
    });
    expect(login.status).toBe(200);

    const inbox = await agent.get('/api/admin/inbox/contact');
    expect(inbox.status).toBe(200);
    expect(inbox.body.items.some((m: { email: string }) => m.email === 'test-contact@example.com')).toBe(
      true
    );

    const volunteerInbox = await agent.get('/api/admin/inbox/volunteers');
    expect(volunteerInbox.status).toBe(200);
    const application = volunteerInbox.body.items.find(
      (item: { email: string }) => item.email === 'test-vol@example.com'
    );
    expect(application).toMatchObject({
      name: 'Test Volunteer',
      email: 'test-vol@example.com',
      phone: '0712345678',
      county: 'Nairobi County',
      availability: 'Weekends (Saturdays/Sundays)',
      motivation: 'I want to help children enjoy mathematics.',
    });
    expect(JSON.parse(application.skillsJson)).toEqual(['Maths Education']);

    const partnerInbox = await agent.get('/api/admin/inbox/partners');
    expect(partnerInbox.status).toBe(200);
    expect(partnerInbox.body.items).toContainEqual(
      expect.objectContaining({
        name: 'Test Partner',
        organization: 'Partner Org',
        email: 'test-partner@example.com',
        phone: '0712345678',
        partnershipType: 'Sponsor a Learner',
        message: 'We would like to sponsor a learner.',
      })
    );

    const eventInbox = await agent.get('/api/admin/inbox/events');
    expect(eventInbox.status).toBe(200);
    expect(eventInbox.body.items).toContainEqual(
      expect.objectContaining({
        name: 'Test Attendee',
        email: 'test-event@example.com',
        eventTitle: 'Nakuru Community Maths Fest',
        roleType: 'Parent / Guardian',
      })
    );

    const subscribers = await agent.get('/api/admin/subscribers');
    expect(subscribers.status).toBe(200);
    expect(subscribers.body.items).toContainEqual(
      expect.objectContaining({ email: 'test-sub@example.com' })
    );

    const csv = await agent.get('/api/admin/inbox/contact/export');
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('test-contact@example.com');
  });

  it('rate limits repeated login attempts', async () => {
    // 5 failed attempts from same IP, 6th should be 429
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.99')
        .send({ email: 'nobody@example.com', password: 'wrong' });
    }
    const sixth = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ email: 'nobody@example.com', password: 'wrong' });
    expect(sixth.status).toBe(429);
  });
});
