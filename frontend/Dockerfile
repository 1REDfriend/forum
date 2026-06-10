# Forum frontend — Vue 3 + Vite, built to static files and served by nginx.
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .

# These are baked into the static bundle at build time (browser-facing values).
ARG VITE_API_URL=http://localhost:3636
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_SITE_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SITE_URL=$VITE_SITE_URL

# build-only = `vite build` without the vue-tsc type-check step (lighter on an SBC).
RUN npm run build-only

# ─── Serve ───────────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
