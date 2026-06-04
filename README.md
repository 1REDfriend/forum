# IT.FORUM

A community forum platform — threads, posts, likes, profiles, search, admin, with a BMW-corporate-inspired UI.

## Stack

| Layer | Tech |
|---|---|
| Backend | [Elysia](https://elysiajs.com) on **Bun**, Drizzle ORM, PostgreSQL |
| Frontend | Vue 3 + Vite + Tailwind CSS v4 + Pinia |
| Auth | JWT (access + refresh), Google OAuth, bcrypt |
| Uploads | Local disk or pluggable CDN driver |
| Infra | Docker Compose (db + backend + frontend) |

Design system: `frontend/DESIGN.md` (BMW corporate — blue `#1c69d4`, rectangular, flat, Inter 700/300).

## Layout

```
backend/   Elysia API — routes → services → repositories → db (Drizzle)
frontend/  Vue SPA — views, components, Pinia stores, api client
docker-compose.yml
```

## Local development

Prereqs: [Bun](https://bun.com), Docker.

```bash
# 1. Database
docker run -d --name forum-db -e POSTGRES_USER=forum -e POSTGRES_PASSWORD=forum \
  -e POSTGRES_DB=forum -p 5432:5432 postgres:16-alpine

# 2. Backend
cd backend
cp .env.example .env          # set DATABASE_URL=postgres://forum:forum@localhost:5432/forum, JWT_SECRET, ...
bun install
bun run migrate               # apply Drizzle migrations
bun run seed                  # optional sample data (admin@forum.com / password123)
bun run dev                   # http://localhost:3636  — OpenAPI docs at /openapi

# 3. Frontend
cd ../frontend
cp .env.example .env          # set VITE_API_URL=http://localhost:3636
bun install
bun run dev                   # http://localhost:5173
```

## Backend scripts

| Script | Action |
|---|---|
| `bun run dev` | watch-mode server |
| `bun run start` | run server |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run generate` / `migrate` | Drizzle schema → SQL / apply |
| `bun run seed` | seed sample data |

## Production (Docker Compose)

Requires a root `.env` (see `.env.example`) with `POSTGRES_*`, `*_PORT`, `JWT_SECRET`, URLs, etc.

```bash
docker compose up -d --build        # db + backend + frontend
# backend image (oven/bun) runs `drizzle-kit migrate` on start, then serves
```

## API

REST under the backend root; interactive OpenAPI docs at `/openapi`. Error responses are `{ "error": "..." }`. Auth via `Authorization: Bearer <accessToken>`; refresh via `POST /auth/refresh`.
