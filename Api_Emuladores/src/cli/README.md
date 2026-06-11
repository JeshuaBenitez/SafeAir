# SafeAir CLI

`safeairctl` vive dentro del backend y se ejecuta con:

```bash
npm run cli -- <comando>
```

## Variables de entorno

Local:

```env
SAFEAIR_API_URL=http://localhost:3000
SAFEAIR_MQTT_URL=mqtt://localhost:1883
SAFEAIR_TOKEN=
```

Tailscale:

```env
SAFEAIR_API_URL=http://100.66.40.85:3000
SAFEAIR_MQTT_URL=mqtt://100.79.106.54:1883
SAFEAIR_TOKEN=
```

`SAFEAIR_TOKEN` tiene prioridad sobre el token guardado por `login`. Si no se define, el CLI usa `~/.safeairctl.json`.

Los comandos de usuarios, rooms, emulators list/assign/release, actuators y logs llaman al API HTTP. Los comandos de escenario/comportamiento del emulador publican MQTT directo y requieren que el emulador Java este corriendo y conectado al broker.

## Auth

```bash
npm run cli -- login --email admin@safeair.local
npm run cli -- whoami
npm run cli -- logout
```

`login` llama al API. Si el API responde que requiere OTP, el CLI pide el código y llama a `/api/v1/auth/verify-otp`. No imprime el password ni el token.

## Users

Requiere JWT admin.

```bash
npm run cli -- users list
npm run cli -- users get --email user@test.local
npm run cli -- users create --email user@test.local --firstName Juan --lastName Perez --password Password123!
npm run cli -- users update --email user@test.local --firstName Nuevo --lastName Nombre
npm run cli -- users update-email --email old@test.local --newEmail new@test.local
npm run cli -- users reset-password --email user@test.local --password NuevaPassword123!
npm run cli -- users disable --email user@test.local
npm run cli -- users enable --email user@test.local
```

`enable` y `disable` actualizan `users.enabled`. Un usuario deshabilitado no puede iniciar login ni completar OTP.

## Rooms

```bash
npm run cli -- rooms list
npm run cli -- rooms list --user user@test.local
npm run cli -- rooms create --name "Laboratorio 1"
npm run cli -- rooms rename --roomId <roomId> --name "Nuevo nombre"
npm run cli -- rooms update --roomId <roomId> --name "Sala A"
npm run cli -- rooms delete --roomId <roomId>
npm run cli -- rooms metrics --roomId <roomId>
npm run cli -- rooms devices --roomId <roomId>
```

Si `rooms create` no recibe `--instanceId`, el API usa la primera instancia activa del usuario o crea una instancia default.

## Emulators

Consultas administrativas por API:

```bash
npm run cli -- emulators list
npm run cli -- emulators free
npm run cli -- emulators assigned
npm run cli -- emulators get --id EMU-U001-R001
npm run cli -- emulators assign --roomId <roomId> --emulator EMU-U001-R001
npm run cli -- emulators release --emulator EMU-U001-R001
```

Comportamiento por MQTT directo:

```bash
npm run cli -- emulators scenario --emulator EMU-U001-R001 --scenario hot-room
npm run cli -- emulators scenario --emulator EMU-U001-R001 --scenario normal
npm run cli -- emulators set-temp --emulator EMU-U001-R001 --value 32
npm run cli -- emulators set-humidity --emulator EMU-U001-R001 --value 70
npm run cli -- emulators set-co2 --emulator EMU-U001-R001 --value 900
npm run cli -- emulators set-pm25 --emulator EMU-U001-R001 --value 80
npm run cli -- emulators pause --emulator EMU-U001-R001
npm run cli -- emulators resume --emulator EMU-U001-R001
```

Escenarios soportados por el emulador Java:

```txt
normal
hot-room
poor-air
high-humidity
high-co2
```

Comandos de comportamiento soportados:

```txt
set_temperature
set_humidity
set_co2
set_pm25
pause
resume
```

## Actuators

Flujo: CLI -> API -> MQTT -> emulador -> MQTT -> API -> PostgreSQL -> frontend.

```bash
npm run cli -- actuators on --roomId <roomId> --device minisplit --index 1
npm run cli -- actuators off --roomId <roomId> --device minisplit --index 1
npm run cli -- actuators set-temp --roomId <roomId> --device minisplit --index 1 --value 24
npm run cli -- actuators on --roomId <roomId> --device purifier --index 1
npm run cli -- actuators off --roomId <roomId> --device extractor --index 1
```

## Logs

Requiere JWT admin.

```bash
npm run cli -- logs api
npm run cli -- logs emulators
npm run cli -- logs tail
npm run cli -- logs room --roomId <roomId>
npm run cli -- logs emulator --emulator EMU-U001-R001
```

`tail` usa polling.

## Topics MQTT

Existentes y compatibles:

```txt
safeair/{emulatorExternalId}/telemetry
safeair/{emulatorExternalId}/actuator-state
safeair/{emulatorExternalId}/config
safeair/{roomId}/actions
safeair/{roomId}/alarms
```

Nuevos para comportamiento desde CLI/API:

```txt
safeair/{emulatorExternalId}/commands
safeair/{emulatorExternalId}/scenario
```

Payload base:

```json
{
  "correlationId": "uuid",
  "source": "safeairctl",
  "timestamp": "ISO_DATE"
}
```

El emulador Java escucha `commands`, `scenario`, `config` y `actuator-state`. Al aplicar cambios encola telemetria o publica estado de actuador para que el API la procese por los flujos existentes.
