# SafeAir

SafeAir is a multi-service system for emulator telemetry, room control, and monitoring.
This repo contains two apps:

- Api_Emuladores: Node.js/Express API with PostgreSQL and MQTT.
- Frontend_SafeAir: Angular frontend.

## Project goal
Provide a reliable local and multi-device environment for SafeAir emulator integration,
with clear contracts and repeatable setup.

## Quick start (local)

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

## Docker (optional)
- docker compose up -d --build
- http://localhost:3000/health
- http://localhost:8080/auth/login

## Multi-device setup (network)

Devices:
- DB host (Postgres)
- API host (Backend)
- MQTT host (broker)
- Frontend hosts (1 or more)

DB host:
- cd Api_Emuladores/database
- docker compose up -d
- Open port 6543

MQTT host:
- docker run -d --name safeair-mqtt -p 1883:1883 eclipse-mosquitto:2
- Open port 1883 (and 8083 if using WebSocket)

API host (.env):
- DB_HOST=DB_HOST_IP
- DB_PORT=6543
- MQTT_URL=mqtt://MQTT_HOST_IP:1883
- BACKEND_BIND_HOST=0.0.0.0
- BACKEND_PORT=3000

Start API:
- cd Api_Emuladores
- npm run dev
- Open port 3000

Frontend host (environment.ts):
- API_BASE_URL=http://API_HOST_IP:3000
- MQTT_BROKER_URL=ws://MQTT_HOST_IP:1883/mqtt

Start Frontend:
- cd Frontend_SafeAir
- npm start -- --host 0.0.0.0 --port 4200
- Open port 4200

Checks:
- http://API_HOST_IP:3000/health
- http://FRONTEND_HOST_IP:4200/auth/login

## Tests
- Frontend: npm test, npm run test:e2e
- Backend: npm run typecheck

## Docs
Feature specs and contracts:
- specs/001-safeair-integration/
