# Alpine-based Node.js image, this is ideal for its smaller size.
FROM node:22-alpine
WORKDIR /app

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

# Copy dependency files first for better layer caching
COPY package*.json ./

# Install dependencies (cached if package files unchanged)
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY . .

# The server's host port. Change as needed.. 
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Use dumb-init to handle signals properly
CMD ["dumb-init", "node", "src/index.js"]