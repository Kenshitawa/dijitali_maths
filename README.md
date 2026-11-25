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

The cPanel Git repository path and Node.js application's **Application root must both be** `/home/dijitali/dijitalimaths-app`. Keep this directory outside `public_html`; Express serves only the configured public assets. Select Node.js 22, set the startup file to `dist/src/server.js`, and point the application URL at a dedicated HTTPS host such as `admin.dijitalimaths.org` so the current primary-domain website remains in place. The deployment hook activates the corresponding CloudLinux environment at `/home/dijitali/nodevenv/dijitalimaths-app/22/bin/activate`.

Create an untracked `.env` file in the repository/application root before the first deployment. Set `NODE_ENV=production`, `APP_ORIGIN` to the exact HTTPS admin URL, `SITE_URL=https://dijitalimaths.org`, a Supabase PostgreSQL `DATABASE_URL`, unique random `SESSION_SECRET` and `ANALYTICS_SALT_SECRET` values (at least 32 characters each), SMTP host/user/password, and an absolute persistent `UPLOAD_DIR` outside the Git checkout. Do not commit `.env`. Use URL-encoded credentials in `DATABASE_URL` and quote values containing shell-special characters.

The checked-in `.cpanel.yml` activates the Node 22 environment and runs `scripts/deploy-cpanel.mjs`. It validates production settings before installing dependencies, generates the PostgreSQL Prisma client, builds the server and static pages, applies checked-in PostgreSQL migrations, removes development dependencies, restarts Passenger, and waits for the database readiness probe. The initial migration expects a new/empty Supabase database. If the database already contains these tables, stop and baseline it before deploying; do not run `db push` against production. Do not run `npm run seed` on an existing database without reviewing its deletes and upserts.

The current cPanel account has a 500 MB disk quota and about 238 MB free. The repository checkout includes roughly 184 MB of media; the full local dependency tree is about 545 MB during the build, and the trimmed production dependency tree is still about 262 MB. This account needs a substantial storage increase (or the application must move to a Node host with adequate disk) before this deploy hook can complete. cPanel's Node.js feature is available, but the app is not live until the repository is created at the configured path, the Node app and environment are configured, and `/api/health/ready` returns HTTP 200.

### Option B: Render / Railway / Docker
- **Render / Railway**: Set Build Command to `npm ci && npm run db:generate:pg && npm run build` and Start Command to `npm run db:migrate:pg && npm start`. Add all production environment variables in the service dashboard before first start.
- **Docker**: Run `docker compose up --build -d` (includes PostgreSQL 16 and persistent `uploads_data` volume).

## Backups
- **Database**: Back up `prisma/dev.db` (SQLite) or run `pg_dump $DATABASE_URL > backup.sql` (PostgreSQL).
- **Uploaded Images**: Back up the `uploads/` directory regularly alongside the database.
