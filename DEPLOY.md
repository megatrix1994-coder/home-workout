# Hosted deployment (Render)

This is the staging and production path for Home Workout. The app is one Docker image plus PostgreSQL. Render supplies HTTPS, a managed Postgres 16 database, and daily backups on a paid plan.

## First-time setup (admin)

1. Sign in to [Render](https://dashboard.render.com) with GitHub and approve a paid workspace. Persistent Postgres and daily backups need a paid plan (`basic-256mb` for the database, `starter` for the web service in `render.yaml`).
2. New + Blueprint, choose `megatrix1994-coder/home-workout`, and apply [render.yaml](render.yaml).
3. When the first deploy finishes, copy the service URL (`https://<name>.onrender.com`).
4. In the web service Environment, set:
   - `CORS_ORIGIN` = that URL
   - `PUBLIC_URL` = that URL
5. In the service settings, set Auto-Deploy to **After CI passes**, so a push only deploys after [`.github/workflows/ci.yml`](.github/workflows/ci.yml) is green.
6. In the service Shell, run once (seeding takes several minutes):

```bash
npm run db:seed
ADMIN_EMAIL=admin@homeworkout.local ADMIN_NAME=Admin ADMIN_PASSWORD='choose-a-long-password' npm run admin:create
```

7. For Playwright against staging, create a second admin that must not claim leftover workouts:

```bash
ADMIN_EMAIL=e2e-admin@example.com ADMIN_NAME="E2E Admin" ADMIN_PASSWORD='a-long-test-password' npm run admin:create -- --keep-unowned
```

8. In GitHub, Settings → Secrets and variables → Actions → Variables, add `PUBLIC_URL` with the same HTTPS address. That starts the [uptime workflow](.github/workflows/uptime.yml).

9. In the Render Postgres dashboard, confirm **Daily backups** are on. Once, restore a backup into a scratch database and check that `SELECT count(*) FROM "User"` matches staging.

## After every deploy

The container runs `prisma migrate deploy` on start. Do not run the seed again unless the catalogue files changed.

## Go-live checklist

- [ ] Content review sheets in `content-review/` are filled in by a trainer and a nutritionist.
- [ ] Privacy notice is live at `/privacy`.
- [ ] The test admin password is changed, or that account is deleted and a real admin is created with `npm run admin:create`.
- [ ] Staging smoke checks and Playwright against `E2E_BASE_URL` have passed.
- [ ] Daily backups are on and one restore has been tested.

## Rollback

1. In Render, open the web service → Events / Deploys, and **Rollback** to the previous successful deploy. Or check out the previous git tag (`v1.0.0` and later) and redeploy that commit.
2. If a migration caused the failure, restore the latest Postgres backup first, then roll the app back. Never apply a forward-only schema change without a backup.
3. To rotate secrets: change `ADMIN_PASSWORD` through `npm run admin:create` or the Account page, and rotate the Render database password from the dashboard (the `DATABASE_URL` env var updates automatically).

## Optional error tracking

Set `SENTRY_DSN` later and load `@sentry/node` in `server/src/index.ts` if you want server error reports. Until then, use the Render logs and the uptime workflow.
