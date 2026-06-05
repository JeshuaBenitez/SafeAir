# Metrics Contract / Contrato de Métricas

## Purpose / Propósito
Define the live room metrics read path between the frontend dashboard and the backend API.

## Read Endpoints / Endpoints de Lectura
- `GET /api/v1/rooms`
- `GET /api/v1/rooms/{id}/metrics/current`
- Optional history path if needed for later phases: `GET /api/v1/rooms/{id}/metrics/history`

## Current Metrics Shape / Forma de Métricas Actuales
- `temperature`
- `humidity`
- `co2`
- `pm25`
- `measuredAt`
- `receivedAt`

## Behavior / Comportamiento
- The frontend polls the current metric path every 2-3 seconds.
- The dashboard may fall back to mock data only while the live adapter is not yet enabled.
- The backend should require authentication for room metrics.

## Error Behavior / Comportamiento de Error
- Unauthorized responses redirect the user to login.
- Unavailable backend responses should surface a non-blocking UI message.
- Malformed metric payloads must be rejected before reaching the dashboard.
