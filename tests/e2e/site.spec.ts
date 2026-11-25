import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ADMIN_EMAIL = `e2e-admin-${Date.now()}@dijitalimaths.test`;
const VIEWER_EMAIL = `e2e-viewer-${Date.now()}@dijitalimaths.test`;
const TEST_PASS = 'E2eSecurePass#2026';

test.beforeAll(() => {
  execFileSync(
    'npx',
    ['tsx', 'scripts/create-admin.ts', '--email', ADMIN_EMAIL, '--name', 'E2E Admin', '--password', TEST_PASS],
    { stdio: 'inherit', shell: true }
  );
});

test('Admin login supports password visibility and a persistent dark theme', async ({ page }) => {
  await page.goto('/admin');

  const password = page.locator('#loginPassword');
  const passwordToggle = page.locator('[data-password-toggle="loginPassword"]');
  await password.fill('VisibilityCheck#123');
  await passwordToggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(passwordToggle).toHaveAttribute('aria-label', 'Hide password');
  await passwordToggle.click();
  await expect(password).toHaveAttribute('type', 'password');

  const themeToggle = page.locator('[data-theme-toggle]').first();
  const initiallyDark = await page.locator('body').evaluate((body) => body.classList.contains('dark-mode'));
  if (initiallyDark) await themeToggle.click();
  await expect(page.locator('body')).not.toHaveClass(/dark-mode/);

  await themeToggle.click();
  await expect(page.locator('body')).toHaveClass(/dark-mode/);
  await expect(page.locator('#authView .auth-card > section:last-child')).toHaveCSS('background-color', 'rgb(17, 31, 51)');
  await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to light mode');
  await passwordToggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.mouse.move(0, 0);
  await expect(passwordToggle).toHaveCSS('color', 'rgb(208, 220, 237)');
  await passwordToggle.click();
  await expect(password).toHaveAttribute('type', 'password');

  await page.reload();
  await expect(page.locator('body')).toHaveClass(/dark-mode/);
});

test('Admin signs out after ten minutes without activity', async ({ page }) => {
  await page.clock.install();
  await page.goto('/admin');
  await page.fill('#loginEmail', ADMIN_EMAIL);
  await page.fill('#loginPassword', TEST_PASS);
  await page.click('#loginForm button[type="submit"]');
  await expect(page.locator('#adminShell')).toBeVisible();

  await page.clock.fastForward(10 * 60 * 1000);
  await expect(page.locator('#authView')).toBeVisible();
  await expect(page.locator('#loginForm .form-status')).toContainText('10 minutes of inactivity');
});

test('1. Submit contact form and verify it appears in admin inbox', async ({ page }) => {
  const uniqueEmail = `contact-e2e-${Date.now()}@example.com`;
  await page.goto('/contactus.html');
  await page.fill('#cf-name', 'Amina Ochieng');
  await page.fill('#cf-email', uniqueEmail);
  await page.fill('#cf-phone', '0712345678');
  await page.selectOption('#cf-reason', 'General Question');
  await page.fill('#cf-message', 'E2E test inquiry for Dijitali Maths.');
  await page.click('#contactForm button[type="submit"]');

  await expect(page.locator('#contactForm .form-status')).toContainText('Message sent');

  await page.goto('/admin');
  await page.fill('#loginEmail', ADMIN_EMAIL);
  await page.fill('#loginPassword', TEST_PASS);
  await page.click('#loginForm button[type="submit"]');

  await page.waitForSelector('[data-tab="inbox"]');
  await page.click('[data-tab="inbox"]');
  await expect(page.locator('#adminContent')).toContainText(uniqueEmail);
});

test('2. Admin uploads an image and it appears in the public gallery', async ({ page }) => {
  // Create a minimal valid 1x1 PNG in memory
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const tmpPng = path.resolve('tests/e2e/tmp-upload.png');
  fs.writeFileSync(tmpPng, Buffer.from(pngBase64, 'base64'));

  try {
    await page.goto('/admin');
    await page.fill('#loginEmail', ADMIN_EMAIL);
    await page.fill('#loginPassword', TEST_PASS);
    await page.click('#loginForm button[type="submit"]');

    await page.click('[data-tab="images"]');
    const uniqueAlt = `E2E Uploaded Photo ${Date.now()}`;
    await page.fill('#uploadAlt', uniqueAlt);
    await page.setInputFiles('#imgFileInput', tmpPng);

    await expect(page.locator(`#adminContent img[alt="${uniqueAlt}"]`)).toBeVisible({ timeout: 10_000 });

    await page.goto('/photos.html');
    await expect(page.locator('#dynamicGalleryGrid')).toContainText(uniqueAlt);
  } finally {
    if (fs.existsSync(tmpPng)) fs.unlinkSync(tmpPng);
  }
});

test('Admin video uploads show publicly and can be deleted', async ({ page }) => {
  const title = `E2E Video ${Date.now()}`;
  const mp4 = Buffer.alloc(16);
  mp4.write('ftyp', 4);
  mp4.write('isom', 8);

  await page.goto('/admin');
  await page.fill('#loginEmail', ADMIN_EMAIL);
  await page.fill('#loginPassword', TEST_PASS);
  await page.click('#loginForm button[type="submit"]');
  await page.click('[data-tab="videos"]');
  await page.click('#addVidBtn');
  await page.fill('#newVidForm input[name="title"]', title);
  await page.fill('#newVidForm textarea[name="description"]', 'Browser test uploaded video.');
  await page.setInputFiles('#newVidForm input[name="video"]', {
    name: 'browser-test.mp4',
    mimeType: 'video/mp4',
    buffer: mp4,
  });
  await page.click('#newVidForm button[type="submit"]');
  await expect(page.locator('#adminContent')).toContainText(title);

  try {
    await page.goto('/videos.html');
    const player = page.locator('#dynamicVideosGrid article').filter({ hasText: title }).locator('video');
    await expect(player).toHaveAttribute('src', /\/uploads\/videos\/.+\.mp4$/);
    await expect(player).toHaveAttribute('controls', '');
  } finally {
    await page.goto('/admin');
    if (await page.locator('#adminShell').isHidden()) {
      await page.fill('#loginEmail', ADMIN_EMAIL);
      await page.fill('#loginPassword', TEST_PASS);
      await page.click('#loginForm button[type="submit"]');
    }
    await page.click('[data-tab="videos"]');
    const row = page.locator('#adminContent tr').filter({ hasText: title });
    if (await row.count()) {
      page.once('dialog', (dialog) => dialog.accept());
      await row.locator('.vid-del').click();
      await expect(row).toHaveCount(0);
    }
  }
});

test('3. Subscribe to newsletter and see it in subscribers list', async ({ page }) => {
  const subEmail = `sub-e2e-${Date.now()}@example.com`;
  await page.goto('/index.html');
  await page.fill('.footer-newsletter-form input[type="email"]', subEmail);
  await page.click('.footer-newsletter-form button[type="submit"]');
  await expect(page.locator('#toastContainer')).toContainText('subscribing');

  await page.goto('/admin');
  await page.fill('#loginEmail', ADMIN_EMAIL);
  await page.fill('#loginPassword', TEST_PASS);
  await page.click('#loginForm button[type="submit"]');

  await page.click('[data-tab="subscribers"]');
  await expect(page.locator('#adminContent')).toContainText(subEmail);
});

test('4. Viewer role cannot change content', async ({ page, request }) => {
  // Log in as admin first to invite viewer, then accept invite
  await page.goto('/admin');
  await page.fill('#loginEmail', ADMIN_EMAIL);
  await page.fill('#loginPassword', TEST_PASS);
  await page.click('#loginForm button[type="submit"]');

  await page.click('[data-tab="users"]');
  await page.click('#inviteUserBtn');
  await page.fill('#inviteForm input[name="name"]', 'E2E Viewer');
  await page.fill('#inviteForm input[name="email"]', VIEWER_EMAIL);
  await page.selectOption('#inviteForm select[name="role"]', 'viewer');
  await page.click('#inviteForm button[type="submit"]');

  const linkText = await page.locator('#inviteLinkOut code').textContent();
  expect(linkText).toContain('inviteToken=');

  // Sign out and accept invite as viewer
  await page.click('#adminModalClose');
  await page.click('#logoutBtn');
  await page.getByRole('button', { name: 'Sign out', exact: true }).last().click();

  await page.goto(linkText!);
  await page.fill('#newPasswordInput', TEST_PASS);
  await page.click('#tokenPasswordForm button[type="submit"]');
  await expect(page.locator('#tokenPasswordForm .form-status')).toContainText('activated');

  await page.goto('/admin');
  await page.fill('#loginEmail', VIEWER_EMAIL);
  await page.fill('#loginPassword', TEST_PASS);
  await page.click('#loginForm button[type="submit"]');

  await expect(page.locator('#adminShell')).toBeVisible();
  await expect(page.locator('#userRoleBadge')).toHaveText('VIEWER');
  await page.click('[data-tab="programs"]');
  await expect(page.locator('#addProgBtn')).toHaveCount(0);

  // Direct API write attempt by viewer must return 403
  const cookies = await page.context().cookies();
  const meRes = await request.get('/api/auth/me', {
    headers: { Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; ') },
  });
  const meData = await meRes.json();
  const writeRes = await request.post('/api/admin/programs', {
    headers: {
      Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      'X-CSRF-Token': meData.csrfToken,
    },
    data: {
      slug: 'viewer-blocked',
      title: 'Blocked',
      categoryLabel: 'Test',
      summary: 'Blocked summary',
      description: 'Blocked description',
    },
  });
  expect(writeRes.status()).toBe(403);
});

test('5. Responsive viewports (375px, 768px, 1280px) & legacy redirects', async ({ page, request }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/index.html');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  }

  for (const [oldUrl, expectedTarget] of [
    ['/annual-reports.html', '/impact.html'],
    ['/memoranda.html', '/impact.html'],
    ['/corona.html', '/aboutus.html'],
    ['/donation_test.html', '/donation.html'],
  ]) {
    const res = await request.get(oldUrl, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe(expectedTarget);
  }
});
