# --- Stage 1: deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# --- Stage 2: runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl dumb-init

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

USER node

CMD ["dumb-init", "node", "src/index.js"]
