# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm rebuild esbuild

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# dukungan migrasi (drizzle-orm & postgres driver disalin terpisah, tidak ke-trace standalone)
COPY --from=builder /app/migrate.mjs ./migrate.mjs
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
