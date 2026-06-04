# Quickstart - 001 Foundation Local Emulation

## Prerequisites

- Java 21.0.5
- Maven 3.8.7
- Docker with Java 21 runtime support
- Active branch: `001-foundation-local-emulation`

## Build and Test

```bash
mvn clean test
```

## Run Local Emulation Mode

```bash
mvn spring-boot:run
```

Expected runtime conditions:
- Local mode runs without external broker dependency.
- Multiple emulators run concurrently with independent loops.
- Telemetry output appears only from dispatcher worker.

## Determinism Verification Scenario

1. Configure a fixed setup for one emulator with known initial room state.
2. Run 300 ticks and capture telemetry payload sequence.
3. Re-run with same setup and same `emulatorId`.
4. Compare payload streams; values must match exactly tick-by-tick.

## Cross-Emulator Noise Divergence Scenario

1. Configure two emulators with identical initial room/device state and interval.
2. Use different `emulatorId` values.
3. Run the same number of ticks.
4. Validate telemetry sequences are not identical because seed derives from `emulatorId`.

## Overflow/Backpressure Scenario

1. Force dispatcher slowdown to saturate telemetry queue.
2. Confirm queue caps at exactly 1024 entries.
3. Confirm overflow behavior is drop-oldest and producer remains non-blocking.
4. Confirm `droppedTelemetryCount > 0` and tick cadence remains within $\pm10\%$ tolerance for at least 99% of ticks.

## Constitution Gate Checklist Before Merge

- UML conformance mapping attached.
- Factory-only instantiation verified.
- Domain formula and bounds tests passing.
- Integration tests for API storage client and MQTT publisher passing.
- Coverage >= 80% for Emulator, RoomEnvironmentHelper, SensorFactory, ElectrodomesticFactory.
- Sonar critical issues = 0.
- No TODO comments, unused imports, or commented-out code.
