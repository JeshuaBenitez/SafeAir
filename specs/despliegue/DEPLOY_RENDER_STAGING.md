# Deploy de API en Render (staging)

Objetivo: publicar la API para que Front y Emuladores puedan integrarse ya.

## 1) Requisitos previos

- Repositorio subido a GitHub.
- Base de datos PostgreSQL accesible desde internet (staging).
- Broker EMQX accesible desde internet (staging).

## 2) Crear servicio Web en Render

- New + Web Service
- Conectar repositorio
- Root directory: raiz del proyecto
- Build command: `npm install && npm run build`
- Start command: `npm run start`

## 3) Variables de entorno requeridas

Usar como base `.env.example` y cargar en Render:

- NODE_ENV=production
- PORT=10000
- API_PREFIX=/api/v1
- JWT_SECRET=<secreto-fuerte>
- JWT_EXPIRES_IN=24h
- DB_HOST=<host>
- DB_PORT=5432
- DB_NAME=<database>
- DB_USER=<user>
- DB_PASSWORD=<password>
- DB_LOGGING=false
- MQTT_URL=<mqtt://host:1883 o ssl://host:8883>
- MQTT_USERNAME=<usuario>
- MQTT_PASSWORD=<password>
- MQTT_CLIENT_ID=safeair-api-staging
- MQTT_TELEMETRY_TOPIC=safeair/+/telemetry
- MQTT_QOS=1

## 4) Health check de despliegue

Endpoint de salud:

- GET /health

Si responde 200, la API está en linea.

## 5) Validacion funcional minima

1. Login:
   - POST /api/v1/auth/login
2. Telemetria por HTTP (opcional, para prueba):
   - POST /api/v1/metrics/telemetry
3. Telemetria por MQTT (principal):
   - Publicar en `safeair/{emulatorId}/telemetry`

## 6) Criterio de "staging listo"

- API responde /health.
- API conecta DB sin errores.
- API conecta MQTT y suscribe `safeair/+/telemetry`.
- Un mensaje de telemetria queda persistido en BD.

## 7) Errores comunes

- La API no arranca si falla DB o MQTT.
- Puerto de MQTT bloqueado por firewall.
- Credenciales de EMQX incorrectas.
- `emulatorId` no registrado en backend.
