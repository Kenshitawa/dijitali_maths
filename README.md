# Dijitali Maths — NGO Website, API & Admin Portal

> *"Every learner can do maths. Sometimes they just need the right way in."*

Official web platform for **Dijitali Maths**, a mathematics-education nonprofit in Kenya (Nairobi and Nakuru Counties). Includes the responsive public NGO website, REST API, privacy-first visitor analytics, WebP media pipeline, and role-based admin portal (`/admin`).

## Folder Structure

```text
dijitali_maths/
├── src/
│   ├── app.ts              # Express app, Helmet CSP, CORS, 301 redirects, routes
│   ├── server.ts           # HTTP server entrypoint
│   ├── config/env.ts       # Environment configuration
│   ├── lib/                # Prisma, crypto, mailer, sanitize, storage adapter, audit
│   ├── middleware/         # Auth, CSRF, RBAC, rate limiting
│   ├── routes/             # public.ts, auth.ts, admin.ts, adminContent.ts
│   └── views/              # Shared HTML partials & 12 public page templates
├── public/                 # Built public HTML, design-system.css, app.js, /admin UI
├── prisma/                 # schema.prisma (SQLite), schema.postgresql.prisma, seed.ts
├── scripts/                # build-pages.ts, create-admin.ts, migrate-images.ts, check-links.ts
├── tests/                  # Vitest unit/API tests & Playwright E2E tests
├── images/                 # Original NGO photos & logos (retained)
├── documents/              # Annual report PDF
├── uploads/                # Optimized WebP images (originals, web, small, thumbs)
└── docs/                   # AUDIT.md, ADMIN_GUIDE.md, PRIVACY.md
```

## Setup from a Clean Clone

1. **Install dependencies** (requires Node.js 20+):
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set strong random values for `SESSION_SECRET` and `ANALYTICS_SALT_SECRET`.
3. **Initialize the database & seed NGO content**:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```
4. **Migrate existing `images/` to optimized WebP**:
   ```bash
   npm run migrate-images
   ```
5. **Create the first admin user** (no default password exists):
   ```bash
   npm run create-admin
   ```
6. **Build the public pages & TypeScript server**:
   ```bash
   npm run build
   ```
7. **Start the server**:
   - Development: `npm run dev`
   - Production: `npm start`
   - Public site: `http://localhost:3000`
   - Admin portal: `http://localhost:3000/admin`

## Running Tests & Checks

```bash
npm run typecheck     # TypeScript type check
npm run lint          # ESLint
npm test              # Vitest unit & API integration tests
npm run check:links   # Internal link & asset checker
npm run test:e2e      # Playwright end-to-end tests
```

For deployment probes, `GET /api/health` reports that the process is alive, while
`GET /api/health/ready` also checks that the database is reachable and returns
HTTP 503 if it is not.

## Deployment

### Option A: cPanel ("Setup Node.js App")
1. In cPanel, open **Setup Node.js App**, choose Node.js 20+, set Application Startup File to `dist/src/server.js`, and configure your `.env` variables (including PostgreSQL `DATABASE_URL` and SMTP settings).
2. Run `npm run db:generate:pg && npx prisma db push --schema=prisma/schema.postgresql.prisma` and `npm run seed`.
3. `.cpanel.yml` copies `dist/`, `public/`, `prisma/`, `images/`, `documents/`, installs production dependencies, and touches `tmp/restart.txt`.

### Option B: Render / Railway / Docker
- **Render / Railway**: Set Build Command to `npm ci && npm run db:generate:pg && npm run build` and Start Command to `npx prisma db push --schema=prisma/schema.postgresql.prisma && npm start`.
- **Docker**: Run `docker compose up --build -d` (includes PostgreSQL 16 and persistent `uploads_data` volume).

## Backups
- **Database**: Back up `prisma/dev.db` (SQLite) or run `pg_dump $DATABASE_URL > backup.sql` (PostgreSQL).
- **Uploaded Images**: Back up the `uploads/` directory regularly alongside the database.
