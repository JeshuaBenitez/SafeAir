# SafeAir/SIGOEV: pruebas local y LAN

Esta guia prepara pruebas sin Dockerfile nuevo, sin secretos y sin IPs reales versionadas. Reemplaza los placeholders `IP_PC_*` en archivos locales antes de ejecutar.

## Escenarios de configuracion

API local fuera de Docker hacia DB/MQTT en Docker Compose:

```env
DB_HOST=127.0.0.1
DB_PORT=6543
MQTT_URL=mqtt://127.0.0.1:1883
```

API dentro de Docker:

```env
DB_HOST=db
DB_PORT=5432
MQTT_URL=mqtt://mqtt:1883
```

API en otra computadora LAN:

```env
DB_HOST=IP_PC_DB_MQTT
DB_PORT=6543
MQTT_URL=mqtt://IP_PC_DB_MQTT:1883
```

Para cambiar escenario del API:

```bash
cd Api_Emuladores
cp .env.local .env
# o
cp .env.lan .env
```

Para cambiar escenario del frontend:

```bash
cd Frontend_SafeAir
cp src/assets/env.local.js src/assets/env.js
# o
cp src/assets/env.lan.js src/assets/env.js
```

## Puertos

| Componente | Puerto |
| --- | --- |
| API | 3000 |
| PostgreSQL externo Docker | 6543 |
| PostgreSQL interno Docker | 5432 |
| MQTT TCP | 1883 |
| MQTT WebSocket | 8084 |
| EMQX Dashboard | 18083 |
| Frontend Angular | 4200 |
| Emulador Spring Boot | 8081 o `SERVER_PORT` |

## Prueba local

1. Levanta PostgreSQL y EMQX con el Docker Compose actual.
2. Configura API local: `cd Api_Emuladores && cp .env.local .env`.
3. Levanta API: `npm run dev`.
4. Configura frontend local: `cd Frontend_SafeAir && cp src/assets/env.local.js src/assets/env.js`.
5. Levanta frontend: `npm start`.
6. Registra/login usuario, completa OTP y crea rooms desde el frontend.
7. Obtiene `emulatorExternalId` desde `/debug/emulators/html`, endpoint `/api/v1/emulators`, CLI o SQL.
8. Levanta emulador:

```bash
cd SafeAir-System-Emulator
SAFEAIR_EMULATOR_IDS=<emulatorExternalId1>,<emulatorExternalId2> ./scripts/run-local.sh
```

9. Prueba CLI local:

```bash
cd Api_Emuladores
SAFEAIR_API_URL=http://localhost:3000 \
SAFEAIR_MQTT_URL=mqtt://localhost:1883 \
npm run cli -- rooms list
```

10. Revisa tiempo real en `/debug/logs/html` y `/debug/emulators/html`.
11. En frontend, selecciona un rango valido y genera reporte.

## Prueba en 2 computadoras

PC 1:

```txt
PostgreSQL
EMQX
API Node.js
```

PC 2:

```txt
Frontend Angular
Emulador Spring Boot
CLI
```

En PC 1 configura `Api_Emuladores/.env` desde `.env.lan`, reemplazando `IP_PC_DB_MQTT` por la IP de PC 1 y `IP_PC_FRONTEND` por la IP de PC 2.

En PC 2 configura `Frontend_SafeAir/src/assets/env.js` desde `env.lan.js`, reemplazando `IP_PC_API` e `IP_PC_DB_MQTT` por la IP de PC 1.

Emulador en PC 2:

```bash
cd SafeAir-System-Emulator
MQTT_HOST=IP_PC_DB_MQTT \
SAFEAIR_EMULATOR_IDS=<emulatorExternalId1>,<emulatorExternalId2> \
./scripts/run-lan.sh
```

CLI en PC 2:

```bash
cd Api_Emuladores
SAFEAIR_API_URL=http://IP_PC_API:3000 \
SAFEAIR_MQTT_URL=mqtt://IP_PC_DB_MQTT:1883 \
npm run cli -- rooms list
```

## Prueba en 4 computadoras LAN

PC 1:

```txt
PostgreSQL
EMQX
```

PC 2:

```txt
API Node.js
```

PC 3:

```txt
Frontend Angular
```

PC 4:

```txt
Emuladores Spring Boot
CLI
```

Configura API en PC 2 con:

```env
DB_HOST=IP_PC_DB_MQTT
DB_PORT=6543
MQTT_URL=mqtt://IP_PC_DB_MQTT:1883
CORS_ORIGINS=http://IP_PC_FRONTEND:4200,http://localhost:4200,http://127.0.0.1:4200
```

Configura frontend en PC 3:

```js
window.__env = {
  API_BASE_URL: "http://IP_PC_API:3000",
  MQTT_BROKER_URL: "ws://IP_PC_DB_MQTT:8084/mqtt"
};
```

Configura emulador/CLI en PC 4 usando `MQTT_HOST=IP_PC_DB_MQTT`, `SAFEAIR_API_URL=http://IP_PC_API:3000` y `SAFEAIR_MQTT_URL=mqtt://IP_PC_DB_MQTT:1883`.

## Obtener IDs de emuladores asignados

Endpoint/debug:

```txt
GET /debug/emulators/html
GET /api/v1/emulators
```

SQL:

```sql
SELECT
  u.email,
  r.id AS room_id,
  r.name AS room_name,
  e."emulatorExternalId"
FROM users u
JOIN instances i ON i."userId" = u.id
JOIN rooms r ON r."instanceId" = i.id
LEFT JOIN emulators e ON e."roomId" = r.id
ORDER BY u.email, r.name;
```

## Validar metricas

```sql
SELECT
  r.name AS room_name,
  e."emulatorExternalId",
  COUNT(cm.id) AS measurements,
  MAX(cm."measuredAt") AS latest_measurement
FROM rooms r
LEFT JOIN emulators e ON e."roomId" = r.id
LEFT JOIN cycle_measurements cm ON cm."roomId" = r.id
GROUP BY r.id, r.name, e."emulatorExternalId"
ORDER BY latest_measurement DESC NULLS LAST;
```

## Listener MQTT

```bash
cd Api_Emuladores

node - <<'NODE'
const mqtt = require('mqtt');

const client = mqtt.connect(process.env.SAFEAIR_MQTT_URL || 'mqtt://127.0.0.1:1883', {
  clientId: 'safeair-debug-sub-' + Date.now()
});

client.on('connect', () => {
  console.log('[MQTT-DEBUG] conectado, escuchando safeair/#');
  client.subscribe('safeair/#');
});

client.on('message', (topic, payload) => {
  console.log('\n[MQTT]', new Date().toISOString());
  console.log('topic:', topic);
  console.log('payload:', payload.toString().slice(0, 800));
});

client.on('error', (err) => {
  console.error('[MQTT-DEBUG] error:', err.message);
});
NODE
```

## Probar CLI y escenarios

Local:

```bash
SAFEAIR_API_URL=http://localhost:3000 \
SAFEAIR_MQTT_URL=mqtt://localhost:1883 \
npm run cli -- rooms list
```

LAN:

```bash
SAFEAIR_API_URL=http://IP_PC_API:3000 \
SAFEAIR_MQTT_URL=mqtt://IP_PC_DB_MQTT:1883 \
npm run cli -- rooms list
```

Escenario:

```bash
SAFEAIR_API_URL=http://localhost:3000 \
SAFEAIR_MQTT_URL=mqtt://localhost:1883 \
npm run cli -- emulators scenario --emulator <emulatorExternalId> --scenario hot-room
```

`<emulatorExternalId>` debe reemplazarse por el ID real asignado al room. No uses IDs de ejemplo como obligatorios.
