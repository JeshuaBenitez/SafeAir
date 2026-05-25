# SafeAir

SafeAir es un sistema multi-servicio para telemetria de emuladores, control de salas y monitoreo.
Este repo contiene dos apps:

- Api_Emuladores: API Node.js/Express con PostgreSQL y MQTT.
- Frontend_SafeAir: frontend Angular.

## Objetivo del proyecto
Proveer un entorno local y multi-dispositivo confiable para la integracion de emuladores SafeAir,
con contratos claros y setup repetible.

## Inicio rapido (local)

Backend:
- cd Api_Emuladores
- npm install
- cp .env.example .env
- cd database && cp .env.example .env
- docker compose up -d
- cd .. && npm run dev

Frontend:
- cd Frontend_SafeAir
- npm install
- npm start

Health check:
- http://localhost:3000/health
- http://localhost:4200/auth/login

## Docker (opcional)
- docker compose up -d --build
- http://localhost:3000/health
- http://localhost:8080/auth/login

## Setup multi-dispositivo (red)

Dispositivos:
- Host DB (Postgres)
- Host API (Backend)
- Host MQTT (broker)
- Hosts Frontend (1 o mas)

Host DB:
- cd Api_Emuladores/database
- docker compose up -d
- Abrir puerto 6543

Host MQTT:
- docker run -d --name safeair-mqtt -p 1883:1883 eclipse-mosquitto:2
- Abrir puerto 1883 (y 8083 si se usa WebSocket)

Host API (.env):
- DB_HOST=DB_HOST_IP
- DB_PORT=6543
- MQTT_URL=mqtt://MQTT_HOST_IP:1883
- BACKEND_BIND_HOST=0.0.0.0
- BACKEND_PORT=3000

Iniciar API:
- cd Api_Emuladores
- npm run dev
- Abrir puerto 3000

Host Frontend (environment.ts):
- API_BASE_URL=http://API_HOST_IP:3000
- MQTT_BROKER_URL=ws://MQTT_HOST_IP:1883/mqtt

Iniciar Frontend:
- cd Frontend_SafeAir
- npm start -- --host 0.0.0.0 --port 4200
- Abrir puerto 4200

Checks:
- http://API_HOST_IP:3000/health
- http://FRONTEND_HOST_IP:4200/auth/login

## Tests
- Frontend: npm test, npm run test:e2e
- Backend: npm run typecheck

## Docs
Specs y contratos:
- specs/001-safeair-integration/