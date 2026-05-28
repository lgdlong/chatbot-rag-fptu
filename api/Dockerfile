# ==========================================
# Builder Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy Prisma schema and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project
RUN npm run build

# Remove development dependencies to keep the production image slim
RUN npm prune --omit=dev

# ==========================================
# Runner Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules, Prisma client and built dist folder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose Hono port (default is 8000)
EXPOSE 8000

# Start command: push prisma schema directly and start the Node server
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
