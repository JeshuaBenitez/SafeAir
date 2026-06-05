# Quickstart - 002 MQTT Async Adapter

## Prerequisites

- Java 21.0.5
- Maven 3.8.7+
- Docker (optional for container validation)
- Active branch: `002-mqtt-async-adapter`

## Build and Quality Checks

```bash
mvn clean verify
```

## Run Locally

```bash
mvn spring-boot:run
```

Expected runtime conditions:

- MQTT connector initializes with TLS enabled.
- Telemetry is published to `safeair/{emulatorId}/telemetry` with QoS 0.
- Subscriber listens to `safeair/{emulatorId}/config` and `safeair/config` with QoS 1.
- Config callback flow routes through adapter and asynchronous dispatcher.

## Telemetry Publish Validation Scenario

1. Start emulator runtime with at least three active emulators.
2. Observe broker traffic for each emulator telemetry topic.
3. Verify each active emulator emits telemetry continuously.
4. Verify publish metadata uses QoS 0.

## Config Subscription Validation Scenario

1. Publish a valid global command to `safeair/config`.
2. Verify command is enqueued and applied to all active emulators.
3. Publish an emulator-specific command to `safeair/{emulatorId}/config`.
4. Verify target emulator applies specific command with precedence over global.

## Queue Overflow Validation Scenario

1. Generate burst load of configuration commands to exceed queue capacity.
2. Verify queue remains bounded at fixed capacity of 1024 commands.
3. Verify oldest pending command is discarded when full.
4. Verify callback ingestion remains available and processing continues.

## TLS and Resilience Validation Scenario

1. Start with valid TLS credentials and verify successful broker session.
2. Introduce temporary broker interruption.
3. Verify reconnect behavior restores publish/subscribe without process restart and within 10 seconds.
4. Verify no plaintext fallback occurs.

## Channel Availability Validation Scenario

1. Run the platform continuously for 30 minutes with MQTT enabled.
2. Measure publish/subscribe channel uptime window.
3. Verify channel availability is at least 99.5%.
4. Verify at least 95% of induced transient disconnect events recover in 10 seconds or less.

## Virtual Thread Regression Scenario

1. Run workload with at least 20 emulators for 30 minutes.
2. Capture memory and throughput metrics.
3. Verify continuity and acceptance targets from spec success criteria.

## Merge Gate Checklist

- UML updates completed and consistent with architecture.
- Unit and integration tests for adapters, dispatcher, MQTT paths, and virtual-thread migration are passing.
- Quality gates pass: checkstyle, spotbugs, jacoco thresholds.
- No constitutional violations remain open.
