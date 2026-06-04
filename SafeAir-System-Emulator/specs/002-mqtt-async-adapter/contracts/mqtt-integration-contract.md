# MQTT Integration Contract - 002-mqtt-async-adapter

## Scope

Defines external transport contracts for telemetry publication and configuration subscription in the MQTT integration feature.

## Transport Topics

- Telemetry publish topic: `safeair/{emulatorId}/telemetry`
- Emulator-targeted config topic: `safeair/{emulatorId}/config`
- Global config topic: `safeair/config`

## QoS and Security Policy

- Telemetry QoS: `0`
- Configuration QoS: `1`
- TLS policy: mandatory in all environments.
- Channel objective: availability >=99.5% over 30-minute validation window, with reconnect recovery <=10 seconds for transient disconnects.

## Contract A: Telemetry Publish Envelope

### Producer and Consumer

- Producer: Telemetry dispatcher through MQTT publisher.
- Consumer: MQTT broker subscribers for emulator telemetry streams.

### Payload Format

- Encoding: Protobuf.
- Message type: `TelemetryMessage`.

### Required Fields

- `messageId`
- `emulatorId`
- `eventTimestampUtc`
- `tickNumber`
- `sensorValues`
- `deviceStates`
- `roomState`

### Behavioral Rules

- Topic must include the producer emulator id.
- Invalid payloads must be rejected before publish attempt and logged as transport validation failures.
- Telemetry publication failures must trigger retry/reconnect policy without stopping emulator tick production.

## Contract B: Config Subscribe Envelope

### Producer and Consumer

- Producer: External control publisher(s).
- Consumer: MQTT subscriber callback and config dispatcher pipeline.

### Payload Format

- Encoding: Protobuf.
- Message type: `ConfigCommand`.

### Required Fields

- `commandId`
- `scope` (`GLOBAL` or `EMULATOR`)
- `targetEmulatorId` when scope is `EMULATOR`
- `receivedAtUtc` or sequence metadata
- `payload`

### Behavioral Rules

- Callback flow must be `MQTT -> ConfigAdapter -> ConfigDispatcher -> EmulatorManager`.
- Config dispatcher queue capacity is fixed at 1024 commands.
- On queue saturation, oldest pending command is dropped and newest admitted.
- Conflict resolution:
- Specific-emulator command overrides global command.
- If same scope conflicts, newest command wins.
- Malformed commands are rejected without interrupting processing of valid subsequent commands.

## Callback Contract

Expected callback behavior:

1. Receive bytes and source topic.
2. Decode Protobuf command.
3. Validate scope/target/ordering metadata.
4. Enqueue command asynchronously.
5. Acknowledge processing path through metrics/logging hooks.

## Error Semantics

- Authentication/TLS connection failure: startup or reconnect failure event, no silent fallback to plaintext.
- Broker disconnect: auto-reconnect workflow with bounded retry strategy.
- Decode/validation failure: drop offending payload, increment failure counter, continue stream handling.

## Configuration Contract

Runtime properties must provide at least:

- `mqtt.host`
- `mqtt.port`
- `mqtt.tls.enabled` (must be true)
- `mqtt.username`
- `mqtt.password`
- `mqtt.console-log-enabled`
