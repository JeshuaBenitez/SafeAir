# Local Telemetry and Lifecycle Contracts

## Scope

This document defines externalized contracts for local mode observability and manager lifecycle control in feature 001-foundation-local-emulation.

## Contract A: Dispatcher Telemetry Payload (Structured Log/Event)

### Channel

- Producer: Telemetry dispatcher worker.
- Consumer: Local log sink and QA/developer tooling.
- Transport in this phase: local structured logs (JSON object per payload).

### Schema

```json
{
  "eventId": "EVT-000001",
  "emulatorId": "EMU-0001",
  "tickNumber": 0,
  "timestampUtc": "2026-03-12T12:00:00Z",
  "tickDurationMs": 100,
  "tickIntervalMs": 100,
  "timingWithinTolerance": true,
  "activeEmulatorCount": 3,
  "queueSizeAtEnqueue": 12,
  "droppedTelemetryCount": 0,
  "roomState": {
    "temperatureC": 24.1,
    "humidityPct": 48.0,
    "co2Ppm": 516.0,
    "pm25UgM3": 8.1,
    "roomSquareMeters": 35,
    "windowCount": 0,
    "dispersionRate": 0.17
  },
  "sensorValues": {
    "TemperatureSensor": 24.1,
    "HumiditySensor": 48.0,
    "CO2Sensor": 516.0,
    "PM25Sensor": 8.1
  },
  "deviceStates": [
    {"deviceType": "MiniSplit", "isOn": true, "normalizedState": 23},
    {"deviceType": "HumidifierPurifier", "isOn": true, "normalizedState": 3},
    {"deviceType": "AirExtractor", "isOn": false, "normalizedState": 0}
  ]
}
```

### Contract Rules

- Payload must be immutable after creation.
- `queueSizeAtEnqueue` must never exceed 1024.
- If queue is full, oldest payload is dropped before enqueueing new payload and `droppedTelemetryCount` increments.
- Emulator workers must never log directly; all telemetry output flows through dispatcher.

## Contract B: Emulator Manager Lifecycle Operations

### Operations

- `setupAll()` initializes all configured emulators.
- `startAll()` starts all configured emulators.
- `stopAll()` requests graceful shutdown for all workers.
- `setup(emulatorId)` applies setup to one emulator.
- `removeEmulator(emulatorId)` is idempotent and safe when emulator is absent.

### Behavioral Guarantees

- Repeated start/stop calls are idempotent.
- Stop operation must not force thread termination.
- Lifecycle worker remains separate from tick and dispatcher workers.
- Under telemetry pressure, lifecycle commands remain responsive and do not block on telemetry I/O.
