# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the schema and config
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so the
# public origin must be supplied as a build argument (Coolify: build variable).
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma CLI + schema so the entrypoint can run `migrate deploy` on boot
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
RUN npm install --no-save prisma@7.8.0

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app/uploads /app/.next
USER nextjs

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
