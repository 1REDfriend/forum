# Forum frontend — Vue 3 + Vite, built to static files and served by nginx.
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
# Note: npm install (not ci) because the committed lock file is out of sync
# (missing @emnapi/*), and --legacy-peer-deps sidesteps the vite-plugin-inspect
# vs vite@8 peer conflict from vite-plugin-vue-devtools.
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY . .

# These are baked into the static bundle at build time (browser-facing values).
ARG VITE_API_URL=http://localhost:3636
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# build-only = `vite build` without the vue-tsc type-check step (lighter on an SBC).
RUN npm run build-only

# ─── Serve ───────────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
