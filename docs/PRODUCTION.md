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

## Backups

For PostgreSQL, make a consistent database backup with `pg_dump "$DATABASE_URL" --format=custom --file=backup.dump`. Archive uploads with `tar -czf uploads.tar.gz uploads/`. Restore into an isolated database using `pg_restore --clean --if-exists --dbname="$RESTORE_DATABASE_URL" backup.dump`, restore the upload archive into a temporary directory, then verify `/readyz` and representative media URLs against the isolated restore before promoting it.

For local SQLite development, stop the app before copying `prisma/dev.db`; keep the copy outside the repository.

## Demo data cleanup

Run `npm run cleanup:demo -- --dry-run` to list matching demo records and counts. The script must be reviewed before destructive use; deletion requires an explicit `--confirm` flag and writes an audit record. No cleanup is run as part of this release.
