# RetroVault Dockerfile
# Uses next start (not standalone) for maximum compatibility

FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Defer the app-level postinstall (prisma generate) until the source tree is
# available in the builder stage, but explicitly rebuild native dependencies so
# the runtime image includes better-sqlite3's compiled binding.
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure prisma directory is present (needed for generate)
COPY prisma ./prisma

# Create minimal data stubs for build
RUN mkdir -p data && \
    echo '[]' > data/inventory.json && \
    echo '{"appName":"RetroVault","tagline":"Your Retro Gaming Collection Engine","ownerName":"","themeColor":"green","currency":"$","dateFormat":"US","region":"NTSC","publicUrl":"","standaloneMode":true,"auth":{"enabled":false,"passwordHash":""},"plex":{"url":"","token":""},"fetchScheduleHour":0,"priceDataSource":"pricecharting","githubRepo":"theretrovault/retrovault","scrapers":{"craigslistCity":"portland"},"features":{"business":true,"fieldTools":true,"social":true,"personal":true},"platforms":["NES","SNES","Nintendo 64","Gamecube","Nintendo Switch","Sega Genesis","Sega CD","Dreamcast","PS1","PS2","PS3","PSP","Xbox","Xbox 360"]}' > data/app.config.json && \
    for f in favorites.json watchlist.json goals.json grails.json playlog.json events.json value-history.json achievements-unlocked.json bug-reports.json; do echo '[]' > data/$f; done && \
    for f in tags.json youtube-cache.json; do echo '{}' > data/$f; done && \
    echo '{"people":[],"favorites":{},"regrets":{}}' > data/favorites.json && \
    echo '{"sales":[],"acquisitions":[]}' > data/sales.json && \
    echo '{"sellers":[],"streams":[]}' > data/whatnot.json && \
    echo '[]' > data/scrapers.json

# Generate Prisma client types (does NOT connect to DB — just generates TS types)
# DATABASE_URL must be set but the file doesn't need to exist at this stage
ENV DATABASE_URL="file:/tmp/build-placeholder.db"
RUN npx prisma generate

# Build — force-dynamic on all API routes prevents static pre-rendering
# which would try to open the DB during build with multiple parallel workers
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy everything needed for next start
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data/sample ./data/sample
COPY --from=builder /app/prisma ./prisma
# node_modules/.bin/prisma needed for migrate deploy at runtime
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Only chown the directories nextjs needs to write to. Prisma also writes into
# @prisma/engines during migrate deploy, so make that narrow path writable
# without recursively chowning all of node_modules.
RUN mkdir -p data logs && \
    chown -R nextjs:nodejs /app/data /app/logs /app/public /app/node_modules/@prisma/engines && \
    chmod +x /app/scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
