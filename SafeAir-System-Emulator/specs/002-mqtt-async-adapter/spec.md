# Feature Specification: MQTT Integration with Adapter and Asynchronous Dispatch

**Feature Branch**: `002-mqtt-async-adapter`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "desarrolla una especificacion para lo que se requiere: Integración MQTT, Adapter Pattern y Procesamiento Asíncrono con Virtual Threads"

## Clarifications

### Session 2026-04-05

- Q: How should conflicting global and emulator-specific config commands be resolved for the same emulator? → A: Specific command takes priority over global; if same scope conflicts, newest command wins.
- Q: What MQTT QoS levels should be used for telemetry and configuration messages? → A: Use QoS 0 for telemetry and QoS 1 for configuration messages.
- Q: What transport security policy should be enforced for MQTT connections? → A: TLS is mandatory in all environments, including local.
- Q: What should happen when the configuration dispatcher queue is full? → A: Use a bounded queue and drop the oldest command to admit the newest one.
- Q: Which payload format should be canonical on MQTT topics? → A: Use Protobuf for telemetry and configuration on MQTT, then adapt to domain objects internally.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish Telemetry to MQTT Reliably (Priority: P1)

As a platform operator, I can run multiple emulators that continuously publish telemetry through MQTT so I can observe all active emulators in near real time.

**Why this priority**: Telemetry publication is the core business outcome of the emulator platform and enables all downstream monitoring and validation.

**Independent Test**: Run multiple emulators concurrently and validate that each emulator publishes telemetry to its own topic continuously without blocking other emulators.

**Acceptance Scenarios**:

1. **Given** three active emulators and valid broker credentials, **When** telemetry generation is running, **Then** telemetry messages are published to each emulator-specific telemetry topic.
2. **Given** a temporary broker I/O interruption, **When** connectivity is restored, **Then** telemetry publication resumes automatically without restarting the platform.

---

### User Story 2 - Apply Incoming Configuration Commands (Priority: P2)

As an operations user, I can send configuration commands through MQTT so I can update one emulator or all emulators without stopping the system.

**Why this priority**: Runtime configurability reduces operational downtime and is the main value of bidirectional MQTT integration.

**Independent Test**: Publish targeted and global configuration commands to subscribed topics and verify that valid commands are applied to the intended emulators.

**Acceptance Scenarios**:

1. **Given** a command published to a specific emulator configuration topic, **When** the command is received, **Then** only the addressed emulator applies the configuration.
2. **Given** a command published to the global configuration topic, **When** the command is received, **Then** all active emulators apply the configuration consistently.

---

### User Story 3 - Process Messages Through a Decoupled Asynchronous Flow (Priority: P3)

As a software maintainer, I can process incoming messages through an adapter and dispatcher queue so transport concerns remain decoupled from domain behavior.

**Why this priority**: Decoupling and asynchronous processing improve maintainability and scaling while reducing failure propagation between components.

**Independent Test**: Feed configuration messages at a burst rate and verify that transport conversion, queueing, and domain application occur as separate steps without direct transport-domain coupling.

**Acceptance Scenarios**:

1. **Given** incoming MQTT payloads, **When** they are ingested, **Then** payload conversion and command dispatch occur through separate adapter and dispatcher responsibilities.
2. **Given** a burst of incoming commands, **When** queue depth grows, **Then** emulator execution continues and queued commands are processed asynchronously.

### Edge Cases

- If broker authentication data is missing or invalid, connection attempts fail safely and actionable operational feedback is produced.
- If malformed telemetry or configuration payloads are received, invalid messages are rejected without stopping valid message processing.
- If targeted and global configuration commands arrive close together, command ordering rules remain deterministic and auditable.
- If incoming command volume temporarily exceeds normal processing speed, the platform maintains stability and recovers without manual restart.
- If an emulator is disconnected while a targeted configuration arrives, the command outcome is reported consistently (applied later or rejected according to policy).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST complete MQTT integration so telemetry from every active emulator is publishable through MQTT topics.
- **FR-002**: The system MUST support telemetry topic structure `safeair/{emulatorId}/telemetry` for outbound messages.
- **FR-003**: The system MUST subscribe to emulator-specific configuration topic `safeair/{emulatorId}/config`.
- **FR-004**: The system MUST subscribe to a global configuration topic `safeair/config` for fleet-wide behavior updates.
- **FR-005**: The system MUST keep the messaging channel available with at least 99.5% availability during a 30-minute run and MUST recover broker connectivity within 10 seconds after transient disconnect events.
- **FR-006**: The system MUST provide an adapter layer that transforms telemetry payloads to the transport contract and transforms inbound configuration payloads to domain commands.
- **FR-007**: The system MUST ensure transport conversion logic is isolated from emulator domain behavior so either side can evolve with minimal coupling.
- **FR-008**: The system MUST provide a dispatcher component that receives converted configuration commands, enqueues them, and processes them asynchronously.
- **FR-009**: The system MUST process configuration commands from the dispatcher to emulator management through queue-based asynchronous flow.
- **FR-010**: The system MUST support high-concurrency execution using lightweight virtualized concurrency units rather than one heavyweight operating-system thread per task.
- **FR-011**: The system MUST preserve current business simulation behavior while transitioning concurrency execution model.
- **FR-012**: The system MUST tolerate transient I/O failures in outbound and inbound MQTT operations without requiring full process restart.
- **FR-013**: The system MUST externalize broker host, broker port, authentication credentials, and console-log visibility through configuration.
- **FR-014**: The system MUST document UML alignment for all modified or added architectural elements in this feature scope.
- **FR-015**: The system MUST enforce all constitution-defined domain validations in executable behavior.
- **FR-016**: The system MUST preserve mandatory package boundaries and factory-only instantiation paths.
- **FR-017**: The system MUST resolve command conflicts using scope priority (emulator-specific over global), and for same-scope conflicts MUST apply the most recently received command.
- **FR-018**: The system MUST use MQTT QoS 0 for telemetry publication and MQTT QoS 1 for inbound and outbound configuration message flows.
- **FR-019**: The system MUST enforce TLS-secured MQTT connections in all environments, including local development and validation.
- **FR-020**: The system MUST use a bounded dispatcher queue with fixed capacity of 1024 commands and, when full, MUST discard the oldest queued command before enqueueing the newest command.
- **FR-021**: The system MUST use Protobuf as the canonical payload format for MQTT telemetry and configuration topics, and MUST perform domain conversion through the adapter layer.

### Constitution Alignment *(mandatory)*

- **CA-001**: A UML conformance artifact MUST identify updates to MQTT client behavior, adapter layer, dispatcher flow, and emulator manager interaction boundaries.
- **CA-002**: The feature MUST preserve project runtime constraints, build conventions, packaging standards, and declared service interfaces.
- **CA-003**: No new domain formulas or sensor validity ranges are introduced in this feature; existing validations remain unchanged and enforced.
- **CA-004**: Required tests MUST include telemetry publication flow, inbound configuration handling, asynchronous queue behavior, and concurrency-model migration regression checks.
- **CA-005**: No constitutional violations are permitted for merge readiness.

### Key Entities *(include if feature involves data)*

- **TelemetryMessage**: Outbound emulator state message containing emulator identity, measurement values, and event timestamp for publication.
- **ConfigCommand**: Inbound configuration instruction representing either targeted or global behavior updates.
- **MqttEnvelope**: Transport-level payload and topic metadata used to route conversion and dispatch operations.
- **DispatchQueueItem**: Queue entry representing a validated configuration command waiting for asynchronous processing.
- **BrokerConnectionProfile**: Runtime connection settings including host, port, credentials, and operational logging preference.

## Assumptions

- Existing emulator, simulation, and telemetry generation modules remain functionally valid and only integration boundaries are changed.
- The canonical global topic is `safeair/config`; references with spelling variants are treated as documentation typos unless explicitly approved otherwise.
- Configuration messages that fail domain validation are rejected and do not halt processing of subsequent valid commands.
- Queue-based command processing prioritizes platform stability over immediate execution during temporary bursts.

## Dependencies

- Access to an MQTT broker environment suitable for integration and acceptance validation.
- Availability of transport contract definitions for telemetry and configuration payload formats.
- Availability of test tooling to validate concurrent emulator execution and asynchronous command processing behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a 30-minute run with at least 20 concurrent emulators, 100% of active emulators publish telemetry to their expected topic namespace.
- **SC-002**: At least 99% of valid inbound configuration commands are applied to intended target scope (single emulator or global) within 5 seconds of receipt under normal load.
- **SC-003**: During a sustained burst test of 1,000 inbound configuration messages over 5 minutes, emulator execution continuity remains above 99.5% with no system restart.
- **SC-004**: Under equivalent workload, memory consumption growth attributable to concurrency handling is reduced by at least 30% versus the previous execution model baseline.
- **SC-005**: At least 95% of induced transient MQTT I/O failures recover automatically within 10 seconds without manual intervention.
- **SC-006**: End-to-end acceptance tests for telemetry publication, config subscription, asynchronous dispatching, and concurrency migration pass at 100% before merge.
- **SC-007**: Constitution compliance review and UML alignment checks report zero unresolved violations for this feature.
- **SC-008**: Messaging channel availability is at least 99.5% over a 30-minute validation run, with reconnect recovery at or below 10 seconds for at least 95% of induced transient disconnect events.
