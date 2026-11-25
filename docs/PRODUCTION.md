# Production operations

## Required environment

Production startup requires `SESSION_SECRET` and `ANALYTICS_SALT_SECRET` (each a unique random value of at least 32 characters), `DATABASE_URL`, and SMTP host/user/password values. `APP_ORIGIN` must be HTTPS. Copy `.env.example`, then replace every example secret before deployment. Never commit `.env`.

## Build and deploy

```sh
npm ci
npm run db:generate:pg
npm run build
npm run db:migrate:deploy
npm start
```

Put the app behind an HTTPS reverse proxy and set `APP_ORIGIN` and `SITE_URL` to its canonical HTTPS URL. The server trusts one proxy hop and redirects HTTP requests to `SITE_URL` in production. Check `GET /healthz` for process health and `GET /readyz` for database readiness.

## cPanel backend with Supabase Postgres

Keep the Express API and public site on cPanel, and use Supabase as the managed PostgreSQL database. This avoids rewriting the existing backend. Create a Supabase project, then set `DATABASE_URL` in the cPanel Node.js application's environment settings to its PostgreSQL session-pooler connection string (port `5432`) with `sslmode=require`. Do not put the real connection string in Git. The cPanel host must allow outbound PostgreSQL connections and support the Node.js version required by this app.

The cPanel deployment uses `prisma/schema.postgresql.prisma`, generates the matching Prisma client, and applies checked-in migrations. The initial migration creates tables in an empty Supabase database. If production already contains data, back it up and migrate/import that data before switching `DATABASE_URL`; do not point this initial migration at a populated database. After deployment, verify `/readyz`, admin sign-in, public forms, and media URLs.

Supabase's direct connection may require IPv6 support on the cPanel host. If it does not support IPv6, use the session pooler connection string supplied by Supabase. For a long-running Node backend, session mode is appropriate; transaction pooling is mainly for short-lived/serverless connections.

## Backups

For PostgreSQL, make a consistent database backup with `pg_dump "$DATABASE_URL" --format=custom --file=backup.dump`. Archive uploads with `tar -czf uploads.tar.gz uploads/`. Restore into an isolated database using `pg_restore --clean --if-exists --dbname="$RESTORE_DATABASE_URL" backup.dump`, restore the upload archive into a temporary directory, then verify `/readyz` and representative media URLs against the isolated restore before promoting it.

For local SQLite development, stop the app before copying `prisma/dev.db`; keep the copy outside the repository.

## Demo data cleanup

Run `npm run cleanup:demo -- --dry-run` to list matching demo records and counts. The script must be reviewed before destructive use; deletion requires an explicit `--confirm` flag and writes an audit record. No cleanup is run as part of this release.
