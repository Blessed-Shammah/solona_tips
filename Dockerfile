# syntax=docker/dockerfile:1

###############################################################################
# SolTip — lightweight multi-stage Alpine image.
# better-sqlite3 is a native (C++) addon, so we compile it against musl in a
# builder stage and copy only the runtime artifacts into a slim final image.
###############################################################################

# ── 1. deps: install + compile node_modules (incl. native better-sqlite3) ────
FROM node:20-alpine AS deps
# Build toolchain needed to compile better-sqlite3 against musl. Removed in the
# final image — none of this ships.
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# Reproducible install. Falls back to `npm install` if no lockfile is present.
RUN npm ci || npm install

# ── 2. builder: produce the Next standalone server ───────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── 3. runner: minimal runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/soltip.db
# libstdc++ is the only runtime dep the compiled sqlite addon needs on Alpine.
RUN apk add --no-cache libstdc++ \
 && addgroup -g 1001 -S nodejs \
 && adduser -u 1001 -S nextjs -G nodejs

# Next standalone bundle (server.js + traced node_modules) and static assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Ensure the compiled native sqlite binary is present (belt-and-suspenders over nft tracing).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
# Blog content is read from the filesystem at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

# Writable, persistable ledger directory.
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
VOLUME ["/app/data"]

USER nextjs
EXPOSE 3000

# Liveness probe against the health endpoint.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
