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

# Build args para configurar la URL de la API (default: api:3000 para Docker Compose)
ARG API_BASE_URL=http://api:3000
ENV API_BASE_URL=${API_BASE_URL}

# Copy optimized nginx config with API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Reemplazar la URL del API en la configuración de nginx
# Para Docker Compose: http://api:3000
# Para Render: pasar --build-arg API_BASE_URL=https://tu-api.onrender.com
RUN sed -i "s|http://api:3000|${API_BASE_URL}|g" /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Copy compiled Angular app from build stage
COPY --from=build /app/dist/safeair-frontend/browser ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
