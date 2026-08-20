# ==========================================
# 1. Base stage (Dependencies & Build Tools)
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Install native dependencies required for build modules (e.g., bcrypt) and ffmpeg for video processing
RUN apk add --no-cache python3 make g++ ffmpeg


# Copy package manifests
COPY package*.json ./

# ==========================================
# 2. Development stage (Local docker-compose with hot reload)
# ==========================================
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

# ==========================================
# 3. Build stage (Compile TypeScript into JavaScript)
# ==========================================
FROM base AS build

WORKDIR /app

# Install all dependencies
RUN npm ci

# Copy full source
COPY . .

# Build application
RUN npm run build

# Remove devDependencies to minimize image footprint
RUN npm prune --production

# ==========================================
# 4. Production stage (Lean & Secure runtime)
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal forwarding and process management, and ffmpeg
RUN apk add --no-cache dumb-init ffmpeg

# Copy built artifacts and production dependencies with appropriate ownership
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

# Use non-root user for security
USER node

# Expose backend port
EXPOSE 8008

# Run application using dumb-init
CMD ["dumb-init", "node", "dist/main"]
