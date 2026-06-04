# Data Model - 002-mqtt-async-adapter

## Entity: TelemetryMessage

- Purpose: Canonical outbound telemetry event published to MQTT.
- Fields:
- `messageId: String` (required, immutable)
- `emulatorId: String` (required, format `EMU-0001`)
- `eventTimestampUtc: Instant` (required)
- `tickNumber: long` (required, >= 0)
- `sensorValues: Map<String, double>` (required)
- `deviceStates: List<DeviceState>` (required)
- `roomState: RoomStateSnapshot` (required)
- Validation rules:
- `emulatorId` must match constitutional identity format.
- Payload must be immutable after adapter conversion.
- Topic target must be derived as `safeair/{emulatorId}/telemetry`.

## Entity: ConfigCommand

- Purpose: Canonical inbound command applied to emulator runtime behavior.
- Fields:
- `commandId: String` (required, immutable)
- `scope: CommandScope` (`GLOBAL | EMULATOR`)
- `targetEmulatorId: String?` (required when scope is `EMULATOR`)
- `receivedAtUtc: Instant` (required)
- `versionOrSequence: long` (required for deterministic ordering)
- `payload: ConfigPayload` (required)
- Validation rules:
- Scope `EMULATOR` requires non-empty `targetEmulatorId`.
- Invalid payloads are rejected without stopping processing pipeline.
- Conflict policy: specific command overrides global; same scope resolves by newest.

## Entity: DispatchQueueItem

- Purpose: Queue item wrapping validated command metadata for asynchronous processing.
- Fields:
- `command: ConfigCommand` (required)
- `enqueuedAtUtc: Instant` (required)
- `priorityScope: int` (`1` specific, `0` global)
- `orderingKey: long` (monotonic for same-scope tie-break)
- Validation rules:
- Queue is bounded with fixed capacity of 1024 commands.
- On saturation, oldest queue item is discarded before adding newest.
- Dispatcher processing must not block MQTT callback thread.

## Entity: BrokerConnectionProfile

- Purpose: Runtime connection configuration for MQTT transport.
- Fields:
- `host: String` (required)
- `port: int` (required, > 0)
- `tlsEnabled: boolean` (must be true in all environments)
- `username: String` (required)
- `passwordSecretRef: String` (required)
- `consoleLogEnabled: boolean` (required)
- Validation rules:
- TLS must remain enabled.
- Missing credentials fail fast at startup/config validation.

## Entity: MqttEnvelope

- Purpose: Transport envelope for publish/subscribe boundaries.
- Fields:
- `topic: String` (required)
- `qos: int` (required, telemetry 0, config 1)
- `retain: boolean` (default false)
- `payloadBytes: byte[]` (required, Protobuf encoded)
- Validation rules:
- Telemetry envelopes only target emulator telemetry topics.
- Config envelopes only target `safeair/{emulatorId}/config` or `safeair/config`.

## Relationships

- `TelemetryPayload` (domain existing) -> `TelemetryAdapter` -> `TelemetryMessage` -> `MqttEnvelope` -> MQTT broker.
- MQTT callback payload -> `ConfigAdapter` -> `ConfigCommand` -> `DispatchQueueItem` -> `ConfigDispatcher` -> `EmulatorManager`.
- `BrokerConnectionProfile` configures connector and subscriber/publisher lifecycle.
