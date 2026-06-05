# Tasks: MQTT Integration with Adapter and Asynchronous Dispatch

**Input**: Design documents from `/specs/002-mqtt-async-adapter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included because the specification explicitly requires acceptance validation and constitution-aligned integration coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare build and configuration baseline for MQTT + Protobuf feature work.

- [X] T001 Update MQTT and Protobuf dependencies/plugins in pom.xml
- [X] T002 Create telemetry Protobuf contract in src/main/proto/telemetry.proto
- [X] T003 Create config Protobuf contract in src/main/proto/config.proto
- [X] T004 Add MQTT runtime configuration keys in src/main/resources/application.yml
- [X] T005 Add profile-specific MQTT defaults in src/main/resources/application-profile1.yml
- [X] T006 Add test MQTT/TLS profile defaults in src/test/resources/application-test.yml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement cross-story infrastructure that all user stories depend on.

**CRITICAL**: No user story work starts until this phase is complete.

- [X] T007 Implement typed MQTT configuration binding in src/main/java/com/safeair/emulator/config/MqttProperties.java
- [X] T008 [P] Implement shared MQTT topic/QoS constants in src/main/java/com/safeair/emulator/api/mqtt/MqttTopics.java
- [X] T009 Implement broker connection lifecycle (TLS/auth/reconnect) in src/main/java/com/safeair/emulator/api/mqtt/MQTTConnector.java
- [X] T010 [P] Create config command scope/domain model in src/main/java/com/safeair/emulator/api/dto/ConfigCommand.java
- [X] T011 Implement bounded config queue and async processor skeleton in src/main/java/com/safeair/emulator/manager/ConfigDispatcher.java
- [X] T012 Extend manager command application entrypoints in src/main/java/com/safeair/emulator/manager/EmulatorManager.java
- [X] T013 Migrate manager/dispatcher executors to virtual threads in src/main/java/com/safeair/emulator/config/ExecutorConfig.java
- [X] T014 Migrate emulator loop execution to virtual-thread-compatible scheduling in src/main/java/com/safeair/emulator/emulation/core/Emulator.java
- [X] T015 Add shared MQTT integration test fixture in src/test/java/com/safeair/emulator/integration/mqtt/MqttTestSupport.java

**Checkpoint**: Foundation complete; user story implementation can proceed.

---

## Phase 3: User Story 1 - Publish Telemetry to MQTT Reliably (Priority: P1) 🎯 MVP

**Goal**: Publish per-emulator telemetry continuously to MQTT using canonical Protobuf payloads.

**Independent Test**: Run multiple emulators and verify telemetry is published on `safeair/{emulatorId}/telemetry` with QoS 0 and recovery after transient broker interruption.

### Tests for User Story 1

- [X] T016 [P] [US1] Add telemetry adapter serialization unit tests in src/test/java/com/safeair/emulator/unit/api/adapter/TelemetryAdapterTest.java
- [X] T017 [P] [US1] Add telemetry topic and QoS integration test in src/test/java/com/safeair/emulator/integration/mqtt/MQTTPublisherIntegrationTest.java
- [X] T018 [P] [US1] Add transient reconnect publish integration test in src/test/java/com/safeair/emulator/integration/mqtt/MQTTPublisherReconnectIntegrationTest.java
- [X] T046 [P] [US1] Add API Storage Client integration regression test coverage in src/test/java/com/safeair/emulator/integration/api/ApiStorageClientIntegrationTest.java

### Implementation for User Story 1

- [X] T019 [P] [US1] Implement domain-to-Protobuf telemetry conversion in src/main/java/com/safeair/emulator/api/adapter/TelemetryAdapter.java
- [X] T020 [US1] Implement async telemetry publish path in src/main/java/com/safeair/emulator/api/mqtt/MQTTPublisher.java
- [X] T021 [US1] Wire MQTT telemetry publisher channel into runtime config in src/main/java/com/safeair/emulator/config/LocalModeConfig.java
- [X] T022 [US1] Route telemetry dispatch to MQTT channel in src/main/java/com/safeair/emulator/manager/TelemetryDispatcher.java
- [X] T023 [US1] Add telemetry publish validation scenario to src/main/resources/application.yml
- [X] T047 [US1] Add channel availability and reconnect timing assertions (>=99.5% availability, <=10s reconnect window) in src/test/java/com/safeair/emulator/integration/mqtt/MQTTChannelAvailabilityIntegrationTest.java

**Checkpoint**: User Story 1 independently functional and testable.

---

## Phase 4: User Story 2 - Apply Incoming Configuration Commands (Priority: P2)

**Goal**: Receive global and emulator-specific config commands via MQTT and apply them correctly.

**Independent Test**: Publish commands to `safeair/{emulatorId}/config` and `safeair/config`; verify target-scoped application with precedence policy.

### Tests for User Story 2

- [X] T024 [P] [US2] Add Protobuf-to-domain config conversion unit tests in src/test/java/com/safeair/emulator/unit/api/adapter/ConfigAdapterTest.java
- [X] T025 [P] [US2] Add config subscription routing integration test in src/test/java/com/safeair/emulator/integration/mqtt/MQTTConfigSubscribeIntegrationTest.java
- [X] T026 [P] [US2] Add scope precedence and newest-wins integration test in src/test/java/com/safeair/emulator/integration/mqtt/MQTTConfigConflictResolutionIntegrationTest.java

### Implementation for User Story 2

- [X] T027 [P] [US2] Implement Protobuf-to-domain config conversion in src/main/java/com/safeair/emulator/api/adapter/ConfigAdapter.java
- [X] T028 [US2] Implement MQTT inbound callback and topic subscriptions in src/main/java/com/safeair/emulator/api/mqtt/MQTTSubscriber.java
- [X] T029 [US2] Implement command enqueue/processing flow in src/main/java/com/safeair/emulator/manager/ConfigDispatcher.java
- [X] T030 [US2] Apply scoped config command handling in src/main/java/com/safeair/emulator/manager/EmulatorManager.java
- [X] T031 [US2] Add command application entrypoint in src/main/java/com/safeair/emulator/emulation/core/Emulator.java
- [X] T032 [US2] Wire subscriber and dispatcher lifecycle in src/main/java/com/safeair/emulator/config/LocalModeConfig.java

**Checkpoint**: User Stories 1 and 2 functional with independent validation paths.

---

## Phase 5: User Story 3 - Process Messages Through a Decoupled Asynchronous Flow (Priority: P3)

**Goal**: Enforce decoupled callback pipeline and resilient async behavior under burst and failure conditions.

**Independent Test**: Send burst command load and malformed payloads; verify non-blocking callback path, bounded queue (capacity 1024) drop-oldest behavior, and continued emulator execution.

### Tests for User Story 3

- [X] T033 [P] [US3] Add dispatcher queue overflow policy unit tests in src/test/java/com/safeair/emulator/unit/manager/ConfigDispatcherTest.java
- [X] T034 [P] [US3] Add malformed payload handling unit tests in src/test/java/com/safeair/emulator/unit/api/mqtt/MQTTSubscriberTest.java
- [X] T035 [P] [US3] Add burst-load async continuity integration test (1000 commands in 5 minutes, continuity >=99.5%) in src/test/java/com/safeair/emulator/integration/mqtt/ConfigDispatcherLoadIntegrationTest.java
- [X] T036 [P] [US3] Add virtual-thread execution regression test in src/test/java/com/safeair/emulator/unit/config/ExecutorConfigVirtualThreadTest.java

### Implementation for User Story 3

- [X] T037 [US3] Enforce strict callback pipeline MQTT -> Adapter -> Dispatcher -> Manager in src/main/java/com/safeair/emulator/api/mqtt/MQTTSubscriber.java
- [X] T038 [US3] Enforce mandatory TLS validation and fail-fast rules in src/main/java/com/safeair/emulator/api/mqtt/MQTTConnector.java
- [X] T039 [US3] Add bounded queue capacity and overflow metrics in src/main/java/com/safeair/emulator/manager/ConfigDispatcher.java
- [X] T040 [US3] Add malformed-command rejection and observability hooks in src/main/java/com/safeair/emulator/api/adapter/ConfigAdapter.java
- [X] T041 [US3] Add async processing and failure-handling quickstart checks in specs/002-mqtt-async-adapter/quickstart.md

**Checkpoint**: All user stories independently testable with decoupled and resilient async flow.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize architecture conformance, documentation, and quality gates.

- [X] T042 Update UML architecture with MQTT adapter/dispatcher/threading changes in umlDiagram.wsd
- [X] T043 [P] Add constitution alignment evidence notes in specs/002-mqtt-async-adapter/plan.md
- [X] T044 [P] Document validation evidence and run outcomes in specs/002-mqtt-async-adapter/quickstart-validation.md
- [X] T045 Run full quality gate command sequence and resolve findings in affected source/config files (for example src/main/java/com/safeair/emulator/**, src/test/java/com/safeair/emulator/**, src/main/resources/**, pom.xml)
- [X] T048 Add domain-rule regression tests for constitution constraints in src/test/java/com/safeair/emulator/unit/emulation/core/DomainValidatorsTest.java
- [X] T049 Add package-boundary and factory-only instantiation verification tests in src/test/java/com/safeair/emulator/unit/architecture/StructuralBoundaryTest.java
- [X] T050 Add fixed-capacity (1024) dispatcher saturation integration test in src/test/java/com/safeair/emulator/integration/mqtt/ConfigDispatcherCapacityIntegrationTest.java
- [X] T051 Add 30-minute soak/load validation task with quantitative pass criteria (20 emulators active, availability >=99.5%, reconnect <=10s for >=95% induced disconnects) in specs/002-mqtt-async-adapter/quickstart-validation.md
- [X] T052 Add memory benchmark validation (>=30% reduction vs baseline) in src/test/java/com/safeair/emulator/integration/emulation/VirtualThreadMemoryBenchmarkTest.java
- [X] T053 Align delivery governance evidence for constitutional feature/* merge flow in specs/002-mqtt-async-adapter/plan.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): starts immediately.
- Foundational (Phase 2): depends on Phase 1 and blocks all user stories.
- User Story phases (3-5): depend on Phase 2 completion.
- Polish (Phase 6): depends on completion of selected user stories.

### User Story Dependencies

- **US1 (P1)**: no dependency on other user stories after Phase 2.
- **US2 (P2)**: no dependency on US1 logic, but can reuse shared MQTT connector from foundational tasks.
- **US3 (P3)**: depends on US2 dispatcher/subscriber path being implemented.

### Within Each User Story

- Tests are authored first and expected to fail before implementation.
- Adapter/model work before service/dispatcher wiring.
- Wiring before load/resilience verification.

## Parallel Opportunities

- Setup: T005 and T006 can run in parallel after T004.
- Foundational: T008 and T010 are parallelizable after T007 starts.
- US1: T016-T018 parallel; T019 can run parallel to tests.
- US2: T024-T026 parallel; T027 can run parallel to tests.
- US3: T033-T036 parallel; T038 and T040 can run in parallel.
- Polish: T043 and T044 can run in parallel once T042 is complete; T048-T050 can run in parallel as independent validation tracks.

## Parallel Example: User Story 1

```bash
# Parallel tests
T016 [US1] src/test/java/com/safeair/emulator/unit/api/adapter/TelemetryAdapterTest.java
T017 [US1] src/test/java/com/safeair/emulator/integration/mqtt/MQTTPublisherIntegrationTest.java
T018 [US1] src/test/java/com/safeair/emulator/integration/mqtt/MQTTPublisherReconnectIntegrationTest.java

# Parallel implementation
T019 [US1] src/main/java/com/safeair/emulator/api/adapter/TelemetryAdapter.java
```

## Parallel Example: User Story 2

```bash
# Parallel tests
T024 [US2] src/test/java/com/safeair/emulator/unit/api/adapter/ConfigAdapterTest.java
T025 [US2] src/test/java/com/safeair/emulator/integration/mqtt/MQTTConfigSubscribeIntegrationTest.java
T026 [US2] src/test/java/com/safeair/emulator/integration/mqtt/MQTTConfigConflictResolutionIntegrationTest.java
```

## Parallel Example: User Story 3

```bash
# Parallel tests
T033 [US3] src/test/java/com/safeair/emulator/unit/manager/ConfigDispatcherTest.java
T034 [US3] src/test/java/com/safeair/emulator/unit/api/mqtt/MQTTSubscriberTest.java
T035 [US3] src/test/java/com/safeair/emulator/integration/mqtt/ConfigDispatcherLoadIntegrationTest.java
T036 [US3] src/test/java/com/safeair/emulator/unit/config/ExecutorConfigVirtualThreadTest.java
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1).
3. Validate telemetry publish scenarios before expanding scope.

### Incremental Delivery

1. Deliver US1 (publish telemetry).
2. Deliver US2 (inbound config handling).
3. Deliver US3 (decoupled resilience and load behavior).
4. Complete polish and quality gates.

### Parallel Team Strategy

1. Team completes setup/foundational phases together.
2. Then split by story stream:
- Engineer A: US1 publish path.
- Engineer B: US2 subscribe/apply path.
- Engineer C: US3 hardening/load and virtual-thread regression.

## Notes

- `[P]` means tasks touch different files and can proceed concurrently.
- User story labels provide requirement traceability.
- Each story includes independent tests aligned to acceptance criteria.
- Keep commits scoped per task or tightly related task set.
