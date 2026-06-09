FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
RUN npm ci --workspace=apps/api --workspace=packages/database

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY package.json ./
RUN npm run build --workspace=packages/database
RUN npm run build --workspace=apps/api

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodeuser

COPY --from=builder --chown=nodeuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

USER nodeuser
EXPOSE 3001
CMD ["node", "dist/index.js"]
