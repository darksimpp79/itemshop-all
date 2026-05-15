# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

ARG ITEMSHOP_BACKEND_URL=http://backend:8080
ENV ITEMSHOP_BACKEND_URL=${ITEMSHOP_BACKEND_URL}

RUN npm run build

# ── Stage 2: Runtime (tylko standalone output, zero node_modules devowych) ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S itemshop && adduser -S itemshop -G itemshop

# Standalone build zawiera tylko produkcyjne zależności
COPY --from=builder --chown=itemshop:itemshop /app/.next/standalone ./
COPY --from=builder --chown=itemshop:itemshop /app/.next/static ./.next/static
COPY --from=builder --chown=itemshop:itemshop /app/public ./public

USER itemshop

EXPOSE 3000
CMD ["node", "server.js"]
