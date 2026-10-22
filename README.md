# Home Workout

A muscle-first exercise catalogue. Sprint 1 covers browsing muscle groups, searching and filtering exercises, and reading text instructions. Later sprints add workout building, animations, recovery, and nutrition.

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

`npm run db:seed` can be run more than once. It upserts muscle groups, equipment, and exercises by slug, and replaces each exercise's muscle and equipment links, so a second run does not create duplicate rows.

## Scripts

- `npm test` runs the client and server test suites
- `npm run build` typechecks and builds both packages
- `npm run lint` runs ESLint
- `npm run format` runs Prettier

## Catalogue API

- `GET /api/v1/muscles`
- `GET /api/v1/exercises?search=&muscle=&equipmentCategory=&limit=&offset=`
- `GET /api/v1/exercises/:id`

`equipmentCategory` is `free_weight`, `machine`, or `bodyweight`. `:id` accepts an exercise id or slug.
