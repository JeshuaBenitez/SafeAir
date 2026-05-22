# Funcionamiento de integracion (EMQX + API + DB)

Este documento resume lo esencial para que Front y Emuladores se conecten sin friccion.

## Componentes

- EMQX: transporte MQTT y reglas de enrutamiento/validacion.
- API SafeAir: validacion, logica de negocio, persistencia y publicacion de acciones/alertas.
- PostgreSQL: almacenamiento historico de mediciones y eventos.

## Contratos de integracion

## Emuladores por MQTT

- Topic de entrada: `safeair/{emulatorId}/telemetry`
- Topic de estado de actuadores: `safeair/{emulatorId}/actuator-state`
- QoS recomendado: 1
- Formato de payload recomendado: Protobuf (JSON en texto UTF-8 sigue soportado como compatibilidad).
- Esquema Protobuf oficial: `proto/safeair.proto`
- Payload requerido: `temperature`, `humidity`, `co2`, `pm25`
- Payload opcional: `timestamp`, `roomId`

## Emuladores por HTTP (alternativo)

- Endpoint: `POST /api/v1/metrics/telemetry`
- Header obligatorio: `x-api-key: <TELEMETRY_API_KEY>`
- Body JSON con el mismo contrato de telemetria.

### Estado de actuadores por HTTP

- Endpoint: `POST /api/v1/actuators/state`
- Header obligatorio: `x-api-key: <TELEMETRY_API_KEY>`
- Body JSON ejemplo:

```json
{
	"emulatorId": "emu-room-a",
	"deviceType": "minisplit",
	"isOn": true,
	"mode": "cool",
	"targetTemperature": 23,
	"ambientTemperature": 24.2,
	"ambientHumidity": 47.1,
	"timestamp": "2026-04-04T17:00:00Z"
}
```

## Frontend

- Base API: `<API_URL>/api/v1`
- Registro de cuenta: `POST /auth/register`
- Login: `POST /auth/login`
- Endpoints protegidos por JWT (`Authorization: Bearer <token>`).
- Estado actual de actuadores por sala: `GET /rooms/{roomId}/actuators/state`

### Registro (campos requeridos)

- `firstName`
- `lastName`
- `email`
- `password`
- `confirmPassword`

### Login (campos requeridos)

- `email`
- `password`

## Seguridad

- `x-api-key` solo para ingreso de telemetria por HTTP.
- JWT para endpoints de usuario y consulta.
- En EMQX aplicar ACL para limitar publicacion de emuladores a `safeair/+/telemetry`.

## Flujo operativo

1. Emulador publica telemetria por MQTT o HTTP.
2. API valida y resuelve `emulatorId`.
3. API persiste measurement en PostgreSQL.
4. API evalua reglas de negocio.
5. API publica acciones y alarmas a topics de salida.

## Consulta de estado de actuadores

El estado de actuadores se expone por API para el Front con la ultima accion registrada y las ultimas metricas medidas:

- Endpoint: `GET /api/v1/rooms/{roomId}/actuators/state`
- Seguridad: JWT
- Respuesta: incluye `metrics` (temperature/humidity/co2/pm25), `measuredAt`, `receivedAt` y estado por actuador (`isOn`, `lastAction`, `mode`, `targetTemperature`, `ambientTemperature`, `ambientHumidity`, `level`, `updatedAt`, `source`).

## Datos que debes compartir al equipo

- URL de API.
- Puerto/API base.
- Topic MQTT de entrada.
- API key de telemetria HTTP.
- Ejemplo de payload valido.

## Verificacion de llegada de data

Para validar que el backend esta recibiendo informacion de emuladores:

1. Revisar logs de Render:
	- Debe aparecer `MQTT connected`.
	- No deben aparecer errores de parsing/validation para payload.

2. Consultar base de datos:

```sql
SELECT room_id, measured_at, received_at, metric, value
FROM dictionary_compat.cycle_measurement
ORDER BY received_at DESC
LIMIT 20;
```

```sql
SELECT roomId, deviceType, isOn, mode, targetTemperature, ambientTemperature, ambientHumidity, reportedAt
FROM device_states
ORDER BY reportedAt DESC
LIMIT 20;
```

## Estrategia de emulador no registrado

El backend soporta estrategia configurable cuando llega `emulatorId` no existente:

- `EMULATOR_MISSING_STRATEGY=reject`: responde `EMULATOR_NOT_FOUND`.
- `EMULATOR_MISSING_STRATEGY=auto-provision`: crea instancia/sala/emulador automaticamente y asocia telemetria.

Variables relacionadas:

- `EMULATOR_AUTO_INSTANCE_NAME`
- `EMULATOR_AUTO_ROOM_PREFIX`
- `EMULATOR_AUTO_CREATE_DEVICES`
