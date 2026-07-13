# Forum backend — Hono + Drizzle ORM, running on Bun.
# Single stage on purpose: keeps drizzle-kit available so DB migrations run in-container.
FROM oven/bun:1-alpine

WORKDIR /app

# Install all deps (dev included: drizzle-kit is needed for `migrate`).
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# App source
COPY . .

ENV NODE_ENV=production
EXPOSE 3636

# Apply pending migrations, then start the server (Bun runs TypeScript directly).
CMD ["sh", "-c", "bunx drizzle-kit migrate && bun src/index.ts"]
