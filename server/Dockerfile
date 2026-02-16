# Alpine-based Node.js image, this is ideal for its smaller size.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# Ideal for the same reason as above. 
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# The server's host port. Change as needed.. 
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000
CMD ["node", "index.js"]