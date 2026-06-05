# Estado EMQX para SafeAir

## Estado actual

Parcialmente listo.

## Ya listo

- Convencion de topics definida (`safeair/{emulatorId}/telemetry`, `safeair/{roomId}/actions`, `safeair/{roomId}/alarms`, `safeair/{emulatorId}/config`).
- API suscrita a telemetria MQTT.
- Reglas propuestas documentadas en `docs/EMQX_RULES.md`.

## Falta para declarar "listo"

- Crear reglas en consola de EMQX (R1-R4).
- Configurar autenticacion/autorizacion de clientes MQTT.
- Probar flujo con mensajes validos e invalidos.
- Confirmar trazabilidad (errores y DLQ).

## Definicion de terminado

EMQX se considera listo cuando:

1. Un emulador publica telemetria valida y la API persiste en BD.
2. Un mensaje invalido se redirige a `safeair/errors/telemetry`.
3. Las metricas de broker muestran trafico esperado sin perdida.
