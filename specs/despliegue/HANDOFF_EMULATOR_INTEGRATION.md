# Handoff para equipo de Emuladores

Este documento define lo minimo para integrar emuladores con la API desplegada.

## 1) Datos que se entregan al equipo de emuladores

- URL de broker EMQX (host, puerto, protocolo).
- Usuario y password MQTT.
- URL base de API staging.
- Ejemplo de payload esperado.

## 2) Topic oficial de telemetria

Publicar en:

- `safeair/{emulatorId}/telemetry`

Ejemplo:

- `safeair/emulator-001/telemetry`

## 3) Payload JSON esperado

```json
{
  "temperature": 24.3,
  "humidity": 46.5,
  "co2": 640,
  "pm25": 14,
  "timestamp": "2026-03-31T18:22:00Z"
}
```

Campos:

- obligatorios: `temperature`, `humidity`, `co2`, `pm25`
- opcionales: `timestamp`, `roomId`

Nota: `emulatorId` se obtiene del topic y no es obligatorio en payload MQTT.

## 4) Frecuencia recomendada

- Enviar cada 5 a 10 segundos por emulador durante pruebas.

## 5) QoS recomendado

- QoS 1.

## 6) Prueba minima de integracion

1. Publicar 1 mensaje valido.
2. Confirmar que API no reporta error.
3. Confirmar persistencia en BD.
4. Repetir con mensaje invalido y verificar ruta de errores en EMQX.

## 7) Checklist para aceptar integracion

- Se conecta al broker con credenciales asignadas.
- Publica en topic correcto por emulador.
- Respeta contrato JSON.
- Mantiene frecuencia estable.
