# Reglas EMQX (propuesta inicial)

Este documento define que reglas debe tener EMQX para la arquitectura actual.

## Decision clave

La API ya procesa telemetria MQTT y hace:

- validacion
- persistencia en PostgreSQL
- evaluacion de reglas de negocio
- publicacion de acciones y alarmas

Por eso, EMQX no debe insertar directo en PostgreSQL en esta fase, para evitar duplicidad de datos.

## Flujo actual recomendado

1. Emulator publica en `safeair/{emulatorId}/telemetry`.
2. EMQX aplica reglas de calidad/enrutamiento.
3. API suscrita a `safeair/+/telemetry` consume y persiste.

## Reglas sugeridas en EMQX

## R1 - Validar payload minimo

Objetivo: detectar mensajes invalidos y moverlos a un topic de errores.

- Source topic: `safeair/+/telemetry`
- Condicion minima: payload JSON y campos numericos basicos.
- Action:
  - publish a `safeair/errors/telemetry`
  - incluir `topic`, `clientid`, `payload`, `reason`

SQL base (referencial):

```sql
SELECT
  topic,
  clientid,
  payload,
  timestamp as broker_ts
FROM "safeair/+/telemetry"
WHERE
  is_null(payload.temperature)
  OR is_null(payload.humidity)
  OR is_null(payload.co2)
  OR is_null(payload.pm25)
```

## R2 - Normalizar y enrutar telemetria valida

Objetivo: estandarizar campos y reenviar a topic interno estable.

- Source topic: `safeair/+/telemetry`
- Action:
  - republish a `safeair/internal/telemetry/validated`
  - payload con campos normalizados

SQL base (referencial):

```sql
SELECT
  topic,
  payload.emulatorId as emulatorId,
  payload.roomId as roomId,
  payload.temperature as temperature,
  payload.humidity as humidity,
  payload.co2 as co2,
  payload.pm25 as pm25,
  coalesce(payload.timestamp, now_timestamp()) as measuredAt,
  timestamp as brokerReceivedAt
FROM "safeair/+/telemetry"
WHERE
  not is_null(payload.temperature)
  AND not is_null(payload.humidity)
  AND not is_null(payload.co2)
  AND not is_null(payload.pm25)
```

Nota: si usas esta regla, la API puede suscribirse a `safeair/internal/telemetry/validated` en lugar de `safeair/+/telemetry`.

## R3 - Dead letter para fallos de entrega

Objetivo: no perder mensajes cuando falle una accion/regla.

- Action:
  - usar fallback topic `safeair/dlq/telemetry`
  - registrar metadata de error

## R4 - Trazabilidad operativa

Objetivo: auditoria tecnica del broker.

- Action:
  - log de eventos de conexion/desconexion por cliente
  - metrica de mensajes por topic

## Reglas que NO se recomiendan hoy

- Insert directo a PostgreSQL desde EMQX Rule Engine.
- Logica de negocio compleja dentro de EMQX.

Motivo: esa logica ya vive en la API (`TelemetryIngestionService` y servicios de dominio).

## Evolucion futura (fase 2)

Si luego decides que EMQX persista en BD, define arquitectura de escritor unico:

- Opcion A: solo API escribe en PostgreSQL.
- Opcion B: solo EMQX escribe eventos crudos y API procesa vistas derivadas.

No combinar A y B sobre la misma tabla de mediciones.
