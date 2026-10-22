# Home Workout

A muscle-first workout app. Browse the exercise catalogue, then build a workout from a muscle group, a training goal, your experience, and the equipment you have. Later sprints add animations, recovery, and nutrition.

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
npm run dev
```

The API runs at http://localhost:4000 and the client at http://localhost:5173. The client proxies `/api` to the API.

If Docker is not available, start a local Postgres from `server/` with `npx prisma dev --detach --name home-workout` and set `DATABASE_URL` in `server/.env` to the URL it prints before migrating and seeding.

`npm run db:seed` can be run more than once. It upserts muscle groups, equipment, exercises, and warm-up stretches by slug, and replaces each exercise's muscle and equipment links, so a second run does not create duplicate rows.

## Scripts

- `npm test` runs the client and server test suites
- `npm run build` typechecks and builds both packages
- `npm run lint` runs ESLint
- `npm run format` runs Prettier

## Catalogue API

- `GET /api/v1/muscles`
- `GET /api/v1/exercises?search=&muscle=&equipmentCategory=&limit=&offset=`
- `GET /api/v1/exercises/:id`
- `GET /api/v1/workouts/recommendations?muscle=&goal=&experience=&equipment=`
- `POST /api/v1/workouts`
- `GET /api/v1/workouts/:id`
- `PATCH /api/v1/workouts/:id`
- `POST /api/v1/workouts/:id/start`

`equipmentCategory` is `free_weight`, `machine`, or `bodyweight`. On the recommendations endpoint, `equipment` is a comma-separated list of those categories. `goal` is `strength`, `hypertrophy`, `general_fitness`, or `endurance`. `experience` is `beginner`, `intermediate`, or `advanced`. An exercise `:id` accepts an exercise id or slug.

Recommendations are rules for a long session of one muscle, not a claim that one session is best for every person. Each recommendation includes a warm-up for that muscle and an estimate aimed at 90 to 120 minutes. A saved workout has no user account. The id in the address is the only key, so treat a workout link as private. After changing the schema, run `npm run db:migrate` and `npm run db:seed` before starting the app.
