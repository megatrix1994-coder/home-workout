# Home Workout

A muscle-first workout app. Browse the exercise catalogue, then build a workout from a muscle group, a training goal, your experience, and the equipment you have. Each person signs in to their own account, and their workouts and history are visible only to them. Meal ideas around training are general guidance.

## Prerequisites

- Node.js 22 or newer
- Docker, for the local PostgreSQL database

## Setup

```bash
npm install
copy server\.env.example server\.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run admin:create
npm run dev
```

The API runs at http://localhost:4000 and the client at http://localhost:5173. The client proxies `/api` to the API.

If Docker is not available, start a local Postgres from `server/` with `npx prisma dev --detach --name home-workout` and set `DATABASE_URL` in `server/.env` to the URL it prints before migrating and seeding.

`npm run db:seed` can be run more than once. It upserts muscle groups, equipment, exercises, warm-up stretches, foods, and meals by slug, and replaces each exercise's muscle and equipment links and each food's nutrient rows, so a second run does not create duplicate rows.

After changing the schema, run `npm run db:migrate` and `npm run db:seed` before starting the app.

## Accounts and access

Access is by invite only. There is no public sign-up.

1. Create the first admin with `npm run admin:create`. It asks for an email, a name, and a password of at least 10 characters. It can also read `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` from the environment. Running it again for the same email resets that password and makes the account an active admin.
2. It also assigns every workout that has no owner, such as those saved before accounts existed, to that admin. Add `-- --keep-unowned` to skip that step.
3. Sign in and open **Admin**. Create an invite link, optionally locked to one email, and send it to the person yourself, for example with the WhatsApp button. A link works once and lasts 7 days.
4. From the same page you can revoke an unused invite, remove a person's access (they are signed out at once and their workouts are kept), restore access, create a password reset link (24 hours, once), change a role, or delete an account and its workouts after typing the email to confirm.

An admin cannot remove, demote, or delete their own account, and the last active admin cannot be removed. There is no email delivery, so a forgotten password needs a reset link from the admin.

## Scripts

- `npm test` runs the client and server test suites
- `npm run test:e2e` runs the Playwright suites against a running production build
- `npm run build` typechecks and builds both packages
- `npm run lint` runs ESLint
- `npm run format` runs Prettier
- `npm run admin:create` creates or resets an admin
- `npm run content:sheet` writes the content review sheets to `content-review/` (see `content-review/README.md`)

GitHub Actions (`.github/workflows/ci.yml`) runs lint, the unit tests, the build, and `npm audit` on every push and pull request, then builds the Docker image, starts the production stack, seeds it, and runs the Playwright suites against it.

## End-to-end tests

The Playwright tests sign in as an admin, so they need an account in the database the server uses:

```bash
set ADMIN_EMAIL=e2e-admin@example.com
set ADMIN_NAME=E2E Admin
set ADMIN_PASSWORD=a-long-test-password
npm run admin:create -- --keep-unowned
```

Build and start the production server on port 8080 (see below), then run:

```bash
set E2E_ADMIN_EMAIL=e2e-admin@example.com
set E2E_ADMIN_PASSWORD=a-long-test-password
npm run test:e2e
```

`--keep-unowned` stops the test admin from claiming workouts saved before accounts existed. `E2E_BASE_URL` points the tests at another address. The suites run on a desktop and a phone viewport and cover the full workout journey, media fallbacks, axe accessibility scans, keyboard reach, and the invite, privacy, removal, and deletion flow.

## API

Successful bodies use `{ data }`. Failures use `{ error: { code, message } }`. Every route except `/api/v1/auth` and `GET /api/health` needs a signed-in session and returns `401` without one. A state-changing request must come from the app's own address or one listed in `CORS_ORIGIN`; anything else gets `403`. Browsers handle this on their own. A script calling the API must send a matching `Origin` header, for example `Origin: http://localhost:8080`.

Auth

- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `GET /api/v1/auth/tokens/:token` checks an invite or reset link
- `POST /api/v1/auth/accept-invite`, `POST /api/v1/auth/reset-password`, `POST /api/v1/auth/change-password`

Admin (admins only)

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/invites`, `POST /api/v1/admin/invites`, `DELETE /api/v1/admin/invites/:id`
- `POST /api/v1/admin/users/:id/remove`, `POST /api/v1/admin/users/:id/restore`, `POST /api/v1/admin/users/:id/reset-link`
- `PATCH /api/v1/admin/users/:id` with `role`, `DELETE /api/v1/admin/users/:id` with `confirmEmail`

Catalogue, workouts, and nutrition

- `GET /api/v1/muscles`
- `GET /api/v1/exercises?search=&muscle=&equipmentCategory=&limit=&offset=`
- `GET /api/v1/exercises/:id`
- `GET /api/v1/exercises/prerequisites?muscle=&goal=&experience=`
- `GET /api/v1/workouts/recommendations?muscle=&goal=&experience=&equipment=`
- `GET /api/v1/workouts?status=` lists your 50 newest workouts with progress summaries
- `POST /api/v1/workouts`
- `GET /api/v1/workouts/:id`
- `PATCH /api/v1/workouts/:id`
- `POST /api/v1/workouts/:id/start`
- `GET /api/v1/nutrition/recommendations?timing=&region=&diet=&exclude=&budget=&maxPrepMinutes=&goal=&intent=`

A workout belongs to the person who saved it. Another person's workout returns `404`, and progression hints use only your own earlier sessions.

`timing` is `pre` or `post`. `region` is `local` or `international`. `diet` is `vegetarian` or `vegan`. `exclude` is a comma-separated list of `milk`, `egg`, `peanut`, `fish`, `soy`, `gluten`, and `tree_nut`. `budget` is `low` or `moderate`. `intent` is `cut` or `bulk`. A cut lists protein-leaning meals first. A bulk lists carbohydrate-leaning meals first before training and protein-leaning meals first after. The intent only changes that order. A nutrient number is returned only when that food has a named source. The response always says the meals are general guidance, not a medical diet or a performance guarantee.

`GET /api/v1/exercises/prerequisites` returns one easier exercise per region for the muscle and goal. Intermediate looks for beginner exercises, and advanced looks for intermediate exercises. Beginner returns an empty list.

`equipmentCategory` is `free_weight`, `machine`, or `bodyweight`. On the recommendations endpoint, `equipment` is a comma-separated list of those categories. `goal` is `strength`, `hypertrophy`, `general_fitness`, or `endurance`. `experience` is `beginner`, `intermediate`, or `advanced`. An exercise `:id` accepts an exercise id or slug. `status` is `draft`, `started`, or `completed`.

Recommendations are rules for a long session of one muscle, not a claim that one session is best for every person. Each recommendation includes a warm-up for that muscle and an estimate aimed at 90 to 120 minutes.

## Production

In production the API serves the built client, so the app and the API share one address.

Without Docker:

```bash
npm run build
npm run db:migrate
set NODE_ENV=production
set PORT=8080
set CORS_ORIGIN=http://localhost:8080
npm run start -w server
```

With Docker:

```bash
copy server\.env.production.example server\.env.production
docker compose --env-file server/.env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file server/.env.production -f docker-compose.prod.yml run --rm app npm run db:seed
docker compose --env-file server/.env.production -f docker-compose.prod.yml run --rm app npm run admin:create
```

Replace every placeholder in `server/.env.production` first. The app runs `prisma migrate deploy` each time it starts and refuses to start without `DATABASE_URL`.

Production settings:

- `CORS_ORIGIN` is the address people open, comma-separated for several.
- `PUBLIC_URL` is the address used in invite and reset links. Without it, links use the address the admin is on.
- `TRUST_PROXY=1` is needed when a host or proxy terminates HTTPS in front of the app, so the app sees the real client address and protocol.
- Session cookies are `Secure` in production, so browsers send them only over HTTPS or to `localhost`. `COOKIE_SECURE=false` turns that off for a plain-HTTP test on another machine. Do not use it for real users.

Serve real users over HTTPS. Back up the PostgreSQL volume, because it holds every account and workout.

### Hosted on Render

See [DEPLOY.md](DEPLOY.md) for the first-time Render steps, go-live gates, rollback, and backup restore. The blueprint is [render.yaml](render.yaml). After the service URL exists, set GitHub Actions variable `PUBLIC_URL` so [`.github/workflows/uptime.yml`](.github/workflows/uptime.yml) pings `/api/health` every 15 minutes.

### Health and shutdown

- `GET /api/health` needs no session. It runs `SELECT 1` and returns `{ "status": "ok" }` or `503` `{ "status": "unavailable" }`. Responses are not cached. The Docker image and `docker-compose.prod.yml` probe this path.
- `SIGTERM` and `SIGINT` stop accepting connections, disconnect Prisma, and then exit.

### Go-live and rollback

1. Apply the Render blueprint, set `CORS_ORIGIN` and `PUBLIC_URL` to the HTTPS address, seed, and create the admin (commands in [DEPLOY.md](DEPLOY.md)).
2. Smoke-check `/api/health`, `/login`, a 401 without a session, and a 403 cross-site write.
3. Run `set E2E_BASE_URL=https://your-service.onrender.com` then `npm run test:e2e` with a staging admin.
4. Confirm daily backups and complete the gates in [content-review/GO_LIVE.md](content-review/GO_LIVE.md).
5. To roll back: use the previous Render deploy, or check out a git tag such as `v1.0.0` and redeploy. Restore the Postgres backup first if a migration was the problem. Rotate the admin password from Account or `npm run admin:create`.

The privacy notice is at `/privacy`.
