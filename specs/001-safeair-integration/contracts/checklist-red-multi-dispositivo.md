# Checklist de red (2-3 dispositivos)

## A. Preparacion de IPs
- Identificar IP LAN de cada equipo (API, DB, MQTT, Frontend).
- Definir:
  - API_HOST_IP (maquina backend)
  - DB_HOST_IP (maquina Postgres)
  - MQTT_HOST_IP (maquina broker)
  - FRONTEND_HOST_IP (maquina frontend)

## B. Backend (API)
- Configurar .env:
  - BACKEND_BIND_HOST=0.0.0.0
  - BACKEND_PORT=3000
  - DB_HOST=DB_HOST_IP
  - DB_PORT=6543 (o el puerto real publicado)
  - MQTT_URL=mqtt://MQTT_HOST_IP:1883
- Arrancar API:
  - npm run dev
- Verificar desde otro equipo:
  - curl http://API_HOST_IP:3000/health

## C. Base de datos (Postgres)
- En la maquina DB:
  - docker compose up -d
- Verificar puerto expuesto (ej. 6543)

## D. MQTT
- En la maquina del broker:
  - docker run -d --name safeair-mqtt -p 1883:1883 eclipse-mosquitto:2
- Verificar conectividad en logs de API

## E. Frontend
- Configurar environment.ts:
  - API_BASE_URL=http://API_HOST_IP:3000
  - MQTT_BROKER_URL=ws://MQTT_HOST_IP:1883/mqtt (si usas WebSocket)
- Arrancar frontend:
  - npm start -- --host 0.0.0.0 --port 4200
- Acceder desde otros equipos:
  - http://FRONTEND_HOST_IP:4200

## F. Firewall/Red
- Abrir puertos:
  - 3000 (API)
  - 4200 (Frontend)
  - 6543 (Postgres, si remoto)
  - 1883 (MQTT)
  - 8083 (MQTT WS, si aplica)
- Verificar conectividad con ping y curl

## G. Pruebas basicas
- API:
  - curl http://API_HOST_IP:3000/health
- Frontend:
  - abrir http://FRONTEND_HOST_IP:4200/auth/login
