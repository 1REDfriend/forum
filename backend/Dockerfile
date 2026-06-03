# Forum backend — Express + Drizzle ORM.
# Single stage on purpose: keeps drizzle-kit + tsx available so DB migrations
# and seeding can run inside the container.
FROM node:20-alpine

WORKDIR /app

# Install all deps (dev included: needed for `tsc` build, drizzle-kit migrate, tsx seed)
COPY package*.json ./
RUN npm ci

# App source
COPY . .

# Compile TypeScript -> dist/
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3636

# Apply pending migrations, then start the compiled server.
CMD ["sh", "-c", "npm run migrate && node dist/index.js"]
