# Phase 0 Research - 002-mqtt-async-adapter

## MQTT Client and Connection Management

- Decision: Use Eclipse Paho MQTT client with a dedicated connector component that manages connect, reconnect, publish, subscribe, and graceful shutdown.
- Rationale: The project already uses Spring Boot and Maven; Paho is stable for Java 21, supports callback-based async handling, and keeps transport logic isolated from domain classes.
- Alternatives considered: Build a custom MQTT protocol client was rejected due to complexity and reliability risk; using synchronous request-response wrapper was rejected because it conflicts with non-blocking requirements.

## Wire Format and Adapter Boundary

- Decision: Use Protobuf as canonical wire format for both telemetry and configuration topics; implement adapters for domain-to-wire and wire-to-domain conversion.
- Rationale: The specification clarified Protobuf as canonical format and requires decoupling transport from domain behavior.
- Alternatives considered: JSON-only transport was rejected because it violates clarified contract; mixed JSON/Protobuf by topic was rejected because it increases operational and testing complexity.

## Topic and QoS Policy

- Decision: Enforce topics `safeair/{emulatorId}/telemetry`, `safeair/{emulatorId}/config`, and `safeair/config` with QoS 0 for telemetry and QoS 1 for configuration.
- Rationale: Matches clarified spec decisions and balances high-throughput telemetry with reliable command delivery.
- Alternatives considered: QoS 1 for all traffic was rejected due to unnecessary telemetry overhead; QoS 0 for config was rejected due to weaker delivery guarantees for control messages.

## Security and Runtime Configuration

- Decision: Enforce TLS in all environments and externalize MQTT host, port, credentials, and console logging toggle through Spring `@ConfigurationProperties` and YAML.
- Rationale: Constitution and clarified feature decisions require strict transport security and externally managed runtime settings.
- Alternatives considered: Optional TLS in local was rejected by clarification; hardcoded broker credentials was rejected due to security and maintainability issues.

## Asynchronous Config Processing and Backpressure

- Decision: Introduce a bounded `ConfigDispatcher` queue with drop-oldest overflow policy and asynchronous processing to `EmulatorManager`.
- Rationale: Preserves ingestion continuity during bursts and matches explicit requirement to keep system stable under load.
- Alternatives considered: Unbounded queue was rejected due to memory-risk at scale; drop-newest policy was rejected because it can discard the most relevant command state.

## Conflict Resolution Semantics

- Decision: Resolve conflicting commands with priority specific-emulator over global; when scope matches, apply newest command.
- Rationale: Clarified session decision establishes deterministic and auditable behavior under concurrent command arrival.
- Alternatives considered: Last-write-wins across all scopes was rejected because global commands could accidentally override targeted corrections; rejecting all conflicts was rejected due to operational complexity.

## Virtual Thread Migration Strategy

- Decision: Migrate manager/dispatcher/emulator task execution to virtual-thread-backed executors while preserving current lifecycle sequencing and domain logic.
- Rationale: Meets high-concurrency and memory-efficiency goals without forcing domain algorithm changes.
- Alternatives considered: Keep platform threads and scale pools was rejected because it does not satisfy feature objective; reactive-stack migration was rejected by constitution constraints.

## Testing and Validation Strategy

- Decision: Expand unit and integration coverage to include adapters, QoS/topic routing, TLS enforcement, queue overflow behavior, conflict policy, and virtual-thread regressions.
- Rationale: Direct traceability is required for FR/SC acceptance and constitution quality gates.
- Alternatives considered: Unit-only validation was rejected because transport and callback semantics require integration confidence.
