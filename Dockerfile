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

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create user first, then install global tools or set permissions
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app/uploads /app/.next

# Install prisma globally *after* user setup, or grant npm global cache permissions
RUN npm install -g prisma@7.8.0 @prisma/config

USER nextjs

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
