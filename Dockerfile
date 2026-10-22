# syntax=docker/dockerfile:1
# ==============================================================================
# ARGUS — Production Multi-Stage Hardened Dockerfile
# ==============================================================================

# --- Stage 1: Build Frontend Client ---
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Copy package files first for cached dependency installation
COPY client/package*.json ./
RUN npm ci

# Copy client source and build production bundle
COPY client/ ./
RUN npm run build

# --- Stage 2: Production Server Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only at root
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./server/
COPY db/ ./db/

# Copy built frontend assets from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Non-root user execution for defense-in-depth container security
USER node

# Expose server port
EXPOSE 5000

# Health check against live endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Launch production server
CMD ["node", "server/src/index.js"]
