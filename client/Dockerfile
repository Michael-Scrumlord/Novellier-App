# Suitable due to its small size.
# I'm separating the build stages to allow for a dev environment with hot-reloading
# so that I don't have to keep rebuilding the entire image every time I make a change to the client code. 
FROM node:22-alpine AS base-stage
WORKDIR /app
COPY package*.json ./

# Development stage with hot reloading
FROM base-stage AS development
RUN npm install \
    && chown -R node:node /app
EXPOSE 80
USER node
CMD ["npm", "run", "dev"]

# Build stage to compile the app for production.
FROM base-stage AS build
RUN npm install
COPY . .
RUN npm run build


# Using nginx to serve the react production app
FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
