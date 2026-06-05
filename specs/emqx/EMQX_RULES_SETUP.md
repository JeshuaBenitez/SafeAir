# Configurar reglas EMQX (paso a paso)

Esta guia traduce `docs/EMQX_RULES.md` a pasos ejecutables en EMQX Dashboard.

## 1) Prerrequisitos

- Tener broker EMQX accesible.
- Tener usuario administrador de EMQX Dashboard.
- Confirmar topic de entrada: `safeair/+/telemetry`.

## 2) Crear R1 (mensaje invalido -> topic de errores)

1. Ir a Rule Engine > Rules > Create.
2. Nombre: `r1_invalid_telemetry_to_errors`.
3. SQL:

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

4. Action: Republish.
5. Topic destino: `safeair/errors/telemetry`.
6. Payload sugerido:

```json
{
  "reason": "missing_required_fields",
  "topic": "${topic}",
  "clientid": "${clientid}",
  "payload": "${payload}",
  "broker_ts": "${broker_ts}"
}
```

7. Guardar y habilitar.

## 3) Crear R2 (mensaje valido -> topic interno normalizado)

1. Rule Engine > Rules > Create.
2. Nombre: `r2_valid_telemetry_to_internal_validated`.
3. SQL:

```sql
SELECT
  payload.emulatorId as emulatorId,
  payload.roomId as roomId,
  payload.temperature as temperature,
  payload.humidity as humidity,
  payload.co2 as co2,
  payload.pm25 as pm25,
  coalesce(payload.timestamp, now_timestamp()) as timestamp,
  timestamp as brokerReceivedAt
FROM "safeair/+/telemetry"
WHERE
  not is_null(payload.temperature)
  AND not is_null(payload.humidity)
  AND not is_null(payload.co2)
  AND not is_null(payload.pm25)
```

4. Action: Republish.
5. Topic destino: `safeair/internal/telemetry/validated`.
6. Payload: default del resultado SQL.
7. Guardar y habilitar.

## 4) Crear R3 (DLQ)

Implementacion recomendada:

- Si una accion de regla falla, reenviar al topic `safeair/dlq/telemetry`.
- Incluir metadata de error y payload original.

Nota: la forma exacta depende de la version/configuracion de EMQX (5.x) y del tipo de action usada.

## 5) ACL minima sugerida

- Emuladores: publish solo a `safeair/+/telemetry`.
- API backend: subscribe a `safeair/+/telemetry` o `safeair/internal/telemetry/validated`.
- Frontend: sin acceso MQTT directo, salvo requerimiento explicito.

## 6) Prueba tecnica minima

1. Publicar mensaje valido en `safeair/emulator-001/telemetry`.
2. Verificar conteo de hits en R2.
3. Publicar mensaje invalido (sin `co2`).
4. Verificar mensaje en `safeair/errors/telemetry` y hit en R1.
5. Verificar que la API persiste el mensaje valido en BD.

## 7) Cierre de task EMQX

Se considera terminado cuando:

- R1 y R2 habilitadas.
- ACL aplicada para emuladores/backend.
- Pruebas de mensaje valido/invalido exitosas.
- Evidencia (capturas o logs) compartida al equipo.
