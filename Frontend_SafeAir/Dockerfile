FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src

RUN npm run build -- --configuration production

FROM nginx:1.27-alpine

# Build arg para la URL de la API
# Docker Compose local: API_BASE_URL=host.docker.internal:3000 o localhost:3000
# Red local (LAN): API_BASE_URL=192.168.x.x:3000 (IP de la laptop con la API)
# Render producción: API_BASE_URL=safeair-api.onrender.com
ARG API_BASE_URL=host.docker.internal:3000

# Copiar nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Reemplazar la URL del API en tiempo de build
# Para Docker Compose: API_BASE_URL=api:3000 → proxy_pass http://api:3000/api/
# Para Render: --build-arg API_BASE_URL=tu-api.onrender.com → proxy_pass http://tu-api.onrender.com/api/
RUN sed -i "s|PLACEHOLDER_API_URL|${API_BASE_URL}|g" /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/safeair-frontend/browser /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
