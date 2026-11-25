# Changelog

## 2.0.0 — 2026-11-24
### Added
- **Backend API (Node.js 20+, Express, TypeScript, Prisma, Zod):**
  - Public endpoints for site settings, gallery, programs, events, posts, videos, and privacy-first pageviews.
  - Form endpoints replacing FormSubmit: `/api/contact`, `/api/volunteers`, `/api/partners`, `/api/event-registrations`, and double opt-in `/api/subscribers`, with optional SMTP email notifications.
  - Admin endpoints with session cookies, CSRF protection, rate limiting, account lockout, and RBAC (`admin`, `editor`, `viewer`).
  - Image pipeline (`multer` + magic-byte validation + `sharp` EXIF stripping + WebP generation) behind a `StorageAdapter`.
  - CLI scripts: `npm run create-admin`, `npm run migrate-images`, `npm run build:pages`, `npm run check:links`.
- **Admin Portal (`/admin`):**
  - Responsive dashboard, tabbed Inbox with CSV export, Subscribers, drag-and-drop Images manager, Programs/Events/Posts/Videos CRUD, Visitors analytics charts, Users & invites, Site Settings with change history, and Audit Log.
- **Frontend Overhaul (`public/`):**
  - Unified design system (`public/css/design-system.css`) preserving Dijitali Maths brand colors and typography (`Inter`, `Outfit`).
  - Shared partials (`head`, `header`, `footer`, `widgets`) compiled into 12 responsive public pages + auto-generated `sitemap.xml` and `robots.txt`.
  - Accessible mobile drawer (focus trap, Escape, `aria-expanded`), preserved accessibility widget, cookie/privacy notice, YouTube click-to-load facade, and WebP `srcset` gallery with keyboard lightbox.
- **Security, Testing & Deployment:**
  - Helmet CSP, CORS, rate limiters, bcrypt cost 12, audit logs.
  - Vitest unit & API integration tests, Playwright E2E tests, `Dockerfile`, `docker-compose.yml`, updated `.cpanel.yml`, `README.md`, `docs/AUDIT.md`, `docs/ADMIN_GUIDE.md`, and `docs/PRIVACY.md`.

### Removed / Redirected
- Removed stray files (`Esc`, `git`, `.FullName`, `MINIMAL-UPDATE-NOTES.txt`).
- Replaced legacy CSS (`home.css`, `style2.css`, `style3.css`, `donation.css`, `volunteer.css`, `style.css`) with `public/css/design-system.css`.
- Replaced stub redirect HTML files (`annual-reports.html`, `memoranda.html`, `corona.html`, `donation_test.html`) with server-side `301` redirects.
