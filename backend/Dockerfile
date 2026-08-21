# ==============================================================================
# Multi-stage Dockerfile for NestJS Backend (Development & Production)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base stage (Shared runtime and build toolchain)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install native dependencies required for build modules (bcrypt) and ffmpeg for video processing
RUN apk add --no-cache python3 make g++ ffmpeg dumb-init

# Copy package manifests
COPY package*.json ./

# ------------------------------------------------------------------------------
# 2. Development stage (Local docker-compose with hot reload)
# ------------------------------------------------------------------------------
FROM base AS development

WORKDIR /app

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Expose backend port
EXPOSE 8008

# Start in development watch mode
CMD ["npm", "run", "start:dev"]

# ------------------------------------------------------------------------------
# 3. Build stage (Compile TypeScript into JavaScript)
# ------------------------------------------------------------------------------
FROM base AS build

WORKDIR /app

# Clean install all dependencies
RUN npm ci

# Copy full source
COPY . .

# Build application
RUN npm run build

# ------------------------------------------------------------------------------
# 4. Production dependencies stage
# ------------------------------------------------------------------------------
FROM base AS prod-deps

WORKDIR /app

COPY package*.json ./

# Clean install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# ------------------------------------------------------------------------------
# 5. Production runtime stage (Lean & Secure)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8008

# Install dumb-init and runtime ffmpeg
RUN apk add --no-cache dumb-init ffmpeg

# Copy built artifacts and production dependencies with appropriate ownership
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

# Use non-root user for security
USER node

# Expose backend port
EXPOSE 8008

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8008/api/docs || exit 1

# Run application using dumb-init
CMD ["dumb-init", "node", "dist/main.js"]
