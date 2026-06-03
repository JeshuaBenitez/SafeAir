FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (npm install para evitar conflictos de lock)
RUN npm install

# Copy build config and source
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src

# Build Angular app in production mode with optimizations
RUN npm run build -- --configuration production

# Production stage: lightweight nginx
FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

# Copy optimized nginx config with API proxy for Docker Compose
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled Angular app from build stage
COPY --from=build /app/dist/safeair-frontend/browser ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
