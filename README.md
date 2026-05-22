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

## Tests
- Frontend: npm test, npm run test:e2e
- Backend: npm run typecheck

## Docs
Feature specs and contracts:
- specs/001-safeair-integration/
