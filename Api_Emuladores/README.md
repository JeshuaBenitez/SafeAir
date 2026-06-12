# SafeAir API

Backend de la plataforma SafeAir para monitoreo y control de calidad de aire en espacios cerrados.

## Objetivo

API REST TypeScript/Node.js que proporciona:
- Autenticación JWT con verificación OTP opcional
- Persistencia de datos en PostgreSQL
- Recepción de telemetría desde emuladores vía MQTT
- Control bidireccional de dispositivos (actuadores)
- Reportes históricos con filtros y exportación
- Logs visuales para debug y demos

## Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20.x | Runtime |
| Express | 4.x | Framework web |
| TypeScript | 5.x | Tipado estático |
| PostgreSQL | 16 | Base de datos |
| Sequelize | 6.x | ORM |
| MQTT.js | 5.x | Cliente MQTT |
| EMQX | latest | Broker MQTT |

---

## Pre-requisitos

### Para desarrollo local

```bash
# Node.js 18+ required
node --version

# npm
npm --version

# PostgreSQL (puede ser Docker)
# Puerto esperado: 5432 o 6543
```

### Para Docker

```bash
# Docker instalado
docker --version
```

---

## Instalación

### 1. Instalar dependencias

```bash
cd Api_Emuladores
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar según necesidad
# Ver sección de variables de entorno más abajo
```

### 3. Compilar TypeScript

```bash
npm run build
```

### 4. Iniciar servidor

```bash
# Desarrollo (con watched)
npm run dev

# Producción
npm start
```

El servidor estará disponible en: **http://localhost:3000**

---

## Variables de Entorno

### Variables Obligatorias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host de PostgreSQL | `localhost` o `db` (Docker) |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de base de datos | `safeair` |
| `DB_USER` | Usuario PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña PostgreSQL | `postgres` |
| `MQTT_URL` | URL del broker MQTT | `mqtt://localhost:1883` |

### Variables Opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Entorno: development, production |
| `PORT` | `3000` | Puerto del servidor |
| `JWT_SECRET` | - | Secret para JWT (obligatorio en prod) |
| `AUTH_SKIP_OTP` | `false` | Saltar verificación OTP para demos |
| `CORS_ORIGINS` | `localhost:*` | Orígenes permitidos para CORS |
| `API_HOST` | `0.0.0.0` | Host para bind (0.0.0.0 = todas las interfaces) |

### Ejemplo .env para Docker Compose

```bash
NODE_ENV=production
PORT=3000
API_HOST=0.0.0.0
DB_HOST=db
DB_PORT=5432
DB_NAME=safeair
DB_USER=postgres
DB_PASSWORD=postgres
DB_LOGGING=false
DB_SYNC_ON_STARTUP=true
MQTT_URL=mqtt://mqtt:1883
AUTH_SKIP_OTP=true
CORS_ORIGINS=http://localhost:4200,http://localhost:8080
JWT_SECRET=tu-secret-aqui-mínimo-32-caracteres
```

### Ejemplo .env para LAN

```bash
NODE_ENV=production
PORT=3000
API_HOST=0.0.0.0
DB_HOST=IP_PC_DB_MQTT
DB_PORT=5432
DB_NAME=safeair
DB_USER=postgres
DB_PASSWORD=postgres
MQTT_URL=mqtt://IP_PC_DB_MQTT:1883
AUTH_SKIP_OTP=true
CORS_ORIGINS=http://IP_PC_FRONTEND:4200,http://localhost:4200,http://127.0.0.1:4200
JWT_SECRET=tu-secret-aqui
```

---

## Endpoints Principales

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/register` | Registrar usuario |
| POST | `/api/v1/auth/verify-otp` | Verificar código OTP |
| POST | `/api/v1/auth/resend-otp` | Reenviar código OTP |
| GET | `/api/v1/auth/me` | Obtener usuario actual |

### Habitaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/rooms` | Listar todas las habitaciones |
| GET | `/api/v1/rooms/:id` | Obtener habitación por ID |
| POST | `/api/v1/rooms` | Crear habitación |
| PUT | `/api/v1/rooms/:id` | Actualizar habitación |
| PUT | `/api/v1/rooms/:id/setup` | Configurar dimensiones, cantidades y tamaños de actuadores |
| DELETE | `/api/v1/rooms/:id` | Eliminar habitación |

El `setup` de una habitación conserva el tamaño seleccionado para cada tipo de actuador con los valores permitidos `small`, `medium` y `large`:

```json
{
  "roomWidth": 10,
  "roomLength": 10,
  "roomHeight": 2.7,
  "windowCount": 2,
  "windowAreaTotal": 3,
  "minisplitCount": 1,
  "purifierCount": 1,
  "extractorCount": 1,
  "minisplitSize": "small",
  "purifierSize": "medium",
  "extractorSize": "large"
}
```

### Métricas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/rooms/:id/metrics/current` | Métricas actuales |
| GET | `/api/v1/rooms/:id/metrics/history` | Reporte histórico |
| GET | `/api/v1/rooms/:id/metrics/history/export` | Exportar CSV/HTML |
| GET | `/api/v1/rooms/:id/metrics/actuator-state` | Estado de actuadores |

### Control de Dispositivos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/rooms/:roomId/actuators/:deviceType/command` | Enviar comando a dispositivo |
| POST | `/api/v1/edit/emulador/:emulatorId` | Controlar actuador por emulador asignado |
| POST | `/api/v1/emulators/:emulatorId/actuators` | Alias REST para controlar actuador |

**Comando**: Control bidireccional
```bash
curl -X POST "http://localhost:3000/api/v1/rooms/{ROOM_ID}/actuators/minisplit/command" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"action":"turn_on","value":true,"source":"frontend"}'
```

**Control por emulador con Bearer token**

Publica al topic MQTT existente `safeair/{emulatorExternalId}/actuator-state`, valida que el emulador pertenezca a una room del usuario autenticado y no modifica datos estructurales de room, usuario, area, ventanas, sensores, dispositivos ni IDs.

Formato recomendado:

```bash
curl -X POST "http://localhost:3000/api/v1/edit/emulador/EMU-U001-R001" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"actuator":"MiniSplit#1","action":"turn_off"}'

curl -X POST "http://localhost:3000/api/v1/edit/emulador/EMU-U001-R001" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"actuator":"MiniSplit#1","action":"set_state","value":24}'
```

Formato legacy compatible:

```bash
curl -X POST "http://localhost:3000/api/v1/edit/emulador/EMU-U001-R001" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"extractor1":"on"}'
```

Mapeos soportados:

```txt
extractor1: "on" | "off"
minisplit1: "on" | "off"
minisplit1Setpoint: 19..30
purifier1: "on" | "off"
purifier1Level: 1..5
```

Respuesta exitosa:

```json
{
  "ok": true,
  "emulatorExternalId": "EMU-U001-R001",
  "command": {
    "actuator": "AirExtractor#1",
    "action": "turn_on"
  },
  "correlationId": "uuid"
}
```

### Telemetry (para emuladores)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/telemetry` | Recibir telemetría (API key) |
| POST | `/api/v1/actuators/state` | Recibir estado de actuador |

---

## Rutas de Debug (Visuales)

Estas rutas sirven para evidenciar el funcionamiento del sistema:

| Ruta | Formato | Descripción |
|------|---------|-------------|
| `/debug/logs.html` | HTML | Logs visuales en navegador |
| `/debug/logs` | JSON | Logs en formato JSON |
| `/debug/emulators.html` | HTML | Dashboard de emuladores |
| `/debug/emulators` | JSON | Estado de emuladores |
| `/debug/status` | JSON | Estado del sistema |

---

## Comandos de Prueba

### Verificar que API responde

```bash
curl http://localhost:3000/health
# Respuesta: {"status":"ok"}
```

### Login (sin OTP - modo demo)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safeair.io","password":"admin123"}'
```

### Login (con OTP - producción)

```bash
# Paso 1: Obtener código
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safeair.io","password":"admin123"}'

# Paso 2: Verificar OTP
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safeair.io","code":"123456"}'
```

### Consultar habitaciones

```bash
curl -H "Authorization: Bearer {TOKEN}" \
  http://localhost:3000/api/v1/rooms
```

### Consultar métricas actuales

```bash
curl -H "Authorization: Bearer {TOKEN}" \
  http://localhost:3000/api/v1/rooms/{ROOM_ID}/metrics/current
```

### Consultar reporte histórico

```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:3000/api/v1/rooms/{ROOM_ID}/metrics/history?from=2026-06-04T00:00:00Z&to=2026-06-04T23:59:59Z"
```

### Exportar CSV

```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "http://localhost:3000/api/v1/rooms/{ROOM_ID}/metrics/history/export?format=csv&from=2026-06-04T00:00:00Z&to=2026-06-04T23:59:59Z"
```

### Encender minisplit

```bash
curl -X POST "http://localhost:3000/api/v1/rooms/{ROOM_ID}/actuators/minisplit/command" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"action":"turn_on","value":true,"source":"frontend"}'
```

### Establecer temperatura

```bash
curl -X POST "http://localhost:3000/api/v1/rooms/{ROOM_ID}/actuators/minisplit/command" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"action":"set_temperature","value":24,"source":"frontend"}'
```

---

## Docker

### Construir imagen

```bash
docker build -t safeair-api .
```

### Ejecutar contenedor

```bash
docker run -d -p 3000:3000 \
  -e DB_HOST=IP_PC_DB_MQTT \
  -e DB_PORT=5432 \
  -e DB_NAME=safeair \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e MQTT_URL=mqtt://IP_PC_DB_MQTT:1883 \
  -e AUTH_SKIP_OTP=true \
  safeair-api
```

### Docker Compose

Desde la raíz del proyecto:
```bash
docker compose up -d api
```

---

## Conexión a EMQX

El API se conecta a EMQX como cliente MQTT:
- Suscribe a: `safeair/+/telemetry` y `safeair/+/actuator-state`
- Publica a: `safeair/{emulatorExternalId}/actuator-state`

### Verificar conexión MQTT

```bash
# Ver logs del contenedor
docker logs safeair-api | grep -i mqtt

# Debería mostrar: "MQTT connected"
```

---

## Tablas de PostgreSQL

| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios y autenticación |
| `rooms` | Habitaciones/aulas |
| `cycles` | Ciclos de monitoreo |
| `cycle_measurements` | Lecturas de sensores |
| `device_states` | Estados de dispositivos |
| `device_actions` | Comandos ejecutados |
| `emulators` | Mapeo room ↔ emulatorExternalId |
| `alarms` | Alarmas del sistema |

---

## Solución de Problemas

### Error: No conecta a PostgreSQL

```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Verificar conexión
curl -v postgresql://postgres:postgres@localhost:5432
```

### Error: No conecta a EMQX

```bash
# Verificar que EMQX esté corriendo
docker ps | grep emqx

# Verificar puertos
docker logs safeair-mqtt | grep listening
```

### Error: CORS bloqueado

Agregar origen al `.env`:
```bash
CORS_ORIGINS=http://localhost:4200,http://localhost:8080,http://TU_IP:8080
```

### Error: JWT inválido

Verificar que el JWT_SECRET está configurado:
```bash
JWT_SECRET=tu-secret-de-al-menos-32-caracteres
```

---

## Estado Actual del API

- ✅ Autenticación JWT
- ✅ Verificación OTP (opcional para demos)
- ✅ CRUD de habitaciones
- ✅ Recepción de telemetría MQTT
- ✅ Recepción de estados de actuadores
- ✅ Persistencia en PostgreSQL
- ✅ Reportes históricos con filtros
- ✅ Exportación CSV/HTML
- ✅ Control de dispositivos via REST
- ✅ Publicación de comandos a EMQX
- ✅ Logs visuales (/debug/logs.html)
- ✅ Dashboard emuladores (/debug/emulators.html)

---

## Referencias

- [Frontend SafeAir](../Frontend_SafeAir/README.md)
- [Emulador Java](../SafeAir-System-Emulator/README.md)
- [Docker Compose](../../docker-compose.yml)
- [Documentación Final](../../specs/001-safeair-integration/documentacion-final-safeair.md)

---

*Última actualización: Junio 2026*
*Parte del proyecto SafeAir - Desarrollo de Sistemas en Red*
