# Tasks: Foundation, Local Emulation Mode and Deterministic Environmental Model

**Input**: Design documents from `/specs/001-foundation-local-emulation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are required by this feature specification and constitution (JUnit 5, deterministic simulation checks, integration tests for API client and MQTT publisher).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for story-specific phases only
- Every task includes at least one explicit file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Spring Boot 4 + Java 21 baseline, repository structure, and runtime packaging constraints.

- [ ] T001 Initialize Maven Spring Boot project metadata and dependencies in pom.xml
- [ ] T002 Create application bootstrap and default runtime port config in src/main/java/com/safeair/emulator/SafeAirEmulatorApplication.java and src/main/resources/application.yml
- [ ] T003 [P] Create package skeleton with package markers in src/main/java/com/safeair/emulator/abstracts/package-info.java, src/main/java/com/safeair/emulator/api/client/package-info.java, src/main/java/com/safeair/emulator/api/dto/package-info.java, src/main/java/com/safeair/emulator/api/mqtt/package-info.java, src/main/java/com/safeair/emulator/emulation/core/package-info.java, src/main/java/com/safeair/emulator/emulation/impl/package-info.java, src/main/java/com/safeair/emulator/emulation/simulation/package-info.java, src/main/java/com/safeair/emulator/manager/package-info.java, and src/main/java/com/safeair/emulator/config/package-info.java
- [ ] T004 [P] Add Java 21 multi-stage container build in Dockerfile
- [ ] T005 [P] Add quality and coverage tooling configuration in .editorconfig, .gitignore, and pom.xml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared architecture, contracts, factories, and guardrails that all stories depend on.

**⚠️ CRITICAL**: No user story implementation begins before this phase is complete.

- [ ] T006 Implement abstract base contracts from UML in src/main/java/com/safeair/emulator/abstracts/Sensor.java, src/main/java/com/safeair/emulator/abstracts/SendInfo.java, src/main/java/com/safeair/emulator/abstracts/SizedDevice.java, and src/main/java/com/safeair/emulator/abstracts/Electrodomestic.java
- [ ] T007 Implement API interfaces and setup DTO in src/main/java/com/safeair/emulator/api/client/Request.java, src/main/java/com/safeair/emulator/api/mqtt/Subject.java, and src/main/java/com/safeair/emulator/api/dto/DtoSetup.java
- [ ] T008 [P] Add domain constants, bounds, and validation helpers in src/main/java/com/safeair/emulator/emulation/core/DomainConstants.java and src/main/java/com/safeair/emulator/emulation/core/DomainValidators.java
- [ ] T009 [P] Implement device classes with constitutional state constraints in src/main/java/com/safeair/emulator/emulation/impl/MiniSplit.java, src/main/java/com/safeair/emulator/emulation/impl/HumidifierPurifier.java, and src/main/java/com/safeair/emulator/emulation/impl/AirExtractor.java
- [ ] T010 [P] Implement sensor classes in src/main/java/com/safeair/emulator/emulation/impl/HumiditySensor.java, src/main/java/com/safeair/emulator/emulation/impl/TemperatureSensor.java, src/main/java/com/safeair/emulator/emulation/impl/CO2Sensor.java, and src/main/java/com/safeair/emulator/emulation/impl/PM25Sensor.java
- [ ] T011 Implement factory-only instantiation layer in src/main/java/com/safeair/emulator/emulation/impl/SensorFactory.java and src/main/java/com/safeair/emulator/emulation/impl/ElectrodomesticFactory.java
- [ ] T012 [P] Implement room base model and seeded random provider abstractions in src/main/java/com/safeair/emulator/emulation/simulation/Room.java, src/main/java/com/safeair/emulator/emulation/simulation/RandomSource.java, and src/main/java/com/safeair/emulator/emulation/simulation/SeededRandomSource.java
- [ ] T013 [P] Implement API/MQTT adapter placeholders to satisfy architecture contracts in src/main/java/com/safeair/emulator/api/client/ApiStorageClient.java and src/main/java/com/safeair/emulator/api/mqtt/MQTTPublisher.java
- [ ] T014 Create shared test base and fixture builders in src/test/java/com/safeair/emulator/unit/TestFixtures.java and src/test/java/com/safeair/emulator/unit/DeterministicRandomStub.java
- [ ] T015 Add foundational factory and validation unit tests in src/test/java/com/safeair/emulator/unit/factories/SensorFactoryTest.java, src/test/java/com/safeair/emulator/unit/factories/ElectrodomesticFactoryTest.java, and src/test/java/com/safeair/emulator/unit/emulation/core/DomainValidatorsTest.java

**Checkpoint**: Foundation complete, architecture contracts enforced, and user story work can begin.

---

## Phase 3: User Story 1 - Run Multiple Emulators Locally (Priority: P1) 🎯 MVP

**Goal**: Run and control multiple emulator instances concurrently with isolated tick workers and graceful lifecycle management.

**Independent Test**: Configure at least 2 emulators, call start, observe independent activity, then stop and verify graceful shutdown with idempotent lifecycle operations.

### Tests for User Story 1

- [ ] T016 [P] [US1] Add lifecycle state transition unit tests in src/test/java/com/safeair/emulator/unit/manager/EmulatorLifecycleStateTest.java
- [ ] T017 [P] [US1] Add emulator-manager concurrency and idempotency tests in src/test/java/com/safeair/emulator/unit/manager/EmulatorManagerConcurrencyTest.java
- [ ] T018 [US1] Add integration test for startAll/stopAll across multiple emulators in src/test/java/com/safeair/emulator/integration/manager/LocalLifecycleIntegrationTest.java

### Implementation for User Story 1

- [ ] T019 [P] [US1] Implement lifecycle enums, commands, and snapshots in src/main/java/com/safeair/emulator/manager/EmulatorLifecycleState.java and src/main/java/com/safeair/emulator/manager/LifecycleMetrics.java
- [ ] T020 [US1] Implement Emulator orchestration shell and lifecycle hooks in src/main/java/com/safeair/emulator/emulation/core/Emulator.java
- [ ] T021 [US1] Implement EmulatorManager lifecycle orchestration in src/main/java/com/safeair/emulator/manager/EmulatorManager.java
- [ ] T022 [US1] Implement scheduler/executor configuration with named threads in src/main/java/com/safeair/emulator/config/ExecutorConfig.java
- [ ] T023 [US1] Wire local mode startup configuration and manager bootstrap in src/main/java/com/safeair/emulator/config/LocalModeConfig.java

**Checkpoint**: US1 delivers local concurrent emulator lifecycle control and graceful shutdown.

---

## Phase 4: User Story 2 - Observe Deterministic Environmental Evolution (Priority: P2)

**Goal**: Implement deterministic, bounded simulation with strict tick order, normative environmental exchange formulas, and measurable convergence behavior.

**Independent Test**: Run deterministic 300-tick simulations using injected random source and verify exact replay for same emulatorId, strict FR-008 exchange formula behavior, and FR-015 convergence/stability thresholds.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add FR-008 exchange formula tests (areaFactor `1/sqrt(A)`, windowFactor `1 + W*0.08`, `k_env` floor `0.01`, and `deltaX_env` equation) in src/test/java/com/safeair/emulator/unit/simulation/DispersionComputationTest.java
- [ ] T025 [P] [US2] Add temperature convergence tests for epsilon `0.3 C`, bounded actuation, and monotonic error reduction tolerance in src/test/java/com/safeair/emulator/unit/simulation/TemperatureModelTest.java
- [ ] T026 [P] [US2] Add humidity convergence/stabilization tests for epsilon `1.0%` in src/test/java/com/safeair/emulator/unit/simulation/HumidityModelTest.java
- [ ] T027 [P] [US2] Add CO2 closed-environment (+3 ppm when `windowCount==0`), extractor behavior, and epsilon `10 ppm` convergence tests in src/test/java/com/safeair/emulator/unit/simulation/CO2ModelTest.java
- [ ] T028 [P] [US2] Add PM2.5 filtering and epsilon `2 ug/m3` convergence tests in src/test/java/com/safeair/emulator/unit/simulation/PM25ModelTest.java
- [ ] T029 [P] [US2] Add clamping, bounded noise, and post-50-tick oscillation amplitude tests (`<= 2 * epsilon`) in src/test/java/com/safeair/emulator/unit/simulation/BoundaryAndNoiseTest.java
- [ ] T030 [US2] Add deterministic replay, cross-emulator divergence, and `N_consecutive=5` convergence-hold tests in src/test/java/com/safeair/emulator/unit/simulation/DeterministicReplayTest.java

### Implementation for User Story 2

- [ ] T031 [US2] Implement FR-008 normative environmental exchange model (including 0.08 window multiplier and 0.01 floor) with strict update ordering in src/main/java/com/safeair/emulator/emulation/simulation/RoomEnvironmentHelper.java
- [ ] T032 [US2] Implement simulation state transition, clamp pipeline, and convergence evaluation thresholds in src/main/java/com/safeair/emulator/emulation/simulation/SimulationEngine.java and src/main/java/com/safeair/emulator/emulation/simulation/ConvergenceEvaluator.java
- [ ] T033 [US2] Implement deterministic seed derivation from emulatorId in src/main/java/com/safeair/emulator/emulation/simulation/EmulatorSeedStrategy.java
- [ ] T034 [US2] Integrate simulation engine calls into emulator tick flow in src/main/java/com/safeair/emulator/emulation/core/Emulator.java

**Checkpoint**: US2 delivers deterministic and physically bounded environmental evolution.

---

## Phase 5: User Story 3 - Consume Structured Telemetry in Local Mode (Priority: P3)

**Goal**: Emit immutable telemetry snapshots through a dispatcher-only logging pipeline with bounded non-blocking queue behavior.

**Independent Test**: Saturate queue and verify drop-oldest policy, dropped counter increment, and non-blocking tick cadence while telemetry logs contain complete structured payload.

### Tests for User Story 3

- [ ] T035 [P] [US3] Add telemetry payload immutability and serialization tests in src/test/java/com/safeair/emulator/unit/emulation/core/TelemetryPayloadTest.java
- [ ] T036 [P] [US3] Add queue overflow drop-oldest tests at fixed capacity 1024 in src/test/java/com/safeair/emulator/unit/emulation/core/TelemetryQueuePolicyTest.java
- [ ] T037 [P] [US3] Add dispatcher logging-content contract tests in src/test/java/com/safeair/emulator/contract/DispatcherPayloadContractTest.java
- [ ] T038 [US3] Add integration test for telemetry backpressure and tick tolerance in src/test/java/com/safeair/emulator/integration/emulation/TelemetryBackpressureIntegrationTest.java

### Implementation for User Story 3

- [ ] T039 [P] [US3] Implement immutable telemetry payload/value objects in src/main/java/com/safeair/emulator/emulation/core/TelemetryPayload.java, src/main/java/com/safeair/emulator/emulation/core/RoomStateSnapshot.java, and src/main/java/com/safeair/emulator/emulation/core/DeviceState.java
- [ ] T040 [US3] Implement bounded telemetry queue abstraction and drop-oldest policy in src/main/java/com/safeair/emulator/emulation/core/TelemetryQueue.java
- [ ] T041 [US3] Implement console telemetry dispatcher channel in src/main/java/com/safeair/emulator/api/mqtt/ConsolePublisher.java
- [ ] T042 [US3] Implement dispatcher worker and queue consumption pipeline in src/main/java/com/safeair/emulator/manager/TelemetryDispatcher.java
- [ ] T043 [US3] Integrate payload build/enqueue and dispatcher-only logging enforcement in src/main/java/com/safeair/emulator/emulation/core/Emulator.java

**Checkpoint**: US3 delivers centralized structured telemetry dispatch with non-blocking overflow behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize quality gates, integration obligations, and release readiness across stories.

- [x] T044 [P] Add integration test for API storage setup retrieval contract in src/test/java/com/safeair/emulator/integration/api/ApiStorageClientIntegrationTest.java
- [x] T045 [P] Add integration test for MQTT publisher adapter with mocked broker in src/test/java/com/safeair/emulator/integration/mqtt/MQTTPublisherIntegrationTest.java
- [x] T046 Add architecture conformance checks and UML traceability document in specs/001-foundation-local-emulation/uml-conformance.md
- [x] T047 Add coverage/quality gate enforcement in pom.xml and .github/workflows/ci.yml
- [x] T048 Run quickstart validation scenarios (including SC-011 and SC-012 convergence checks) and record evidence in specs/001-foundation-local-emulation/quickstart-validation.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies, starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 and reuses US1 emulator shell.
- **Phase 5 (US3)**: Depends on Phase 2 and integrates with US1/US2 runtime flow.
- **Phase 6 (Polish)**: Depends on completion of selected user stories.

### User Story Dependencies

- **US1 (P1)**: First deliverable, no dependency on other stories after foundation.
- **US2 (P2)**: Depends on base emulator lifecycle from US1 but is independently testable with deterministic simulation tests.
- **US3 (P3)**: Depends on emulator tick flow and simulation outputs from US1/US2; independently testable via queue and dispatcher contracts.

### Within Each User Story

- Write tests first and confirm initial failure.
- Implement models/contracts before orchestration wiring.
- Integrate into `Emulator` only after story-specific components compile and tests are in place.
- Finish story-level independent test before moving to the next story.

### Parallel Opportunities

- Phase 1 tasks T003-T005 run in parallel.
- Phase 2 tasks T008-T010 and T012-T013 run in parallel once T006-T007 are complete.
- US1 tests T016-T017 run in parallel.
- US2 model tests T024-T029 run in parallel.
- US3 tests T035-T037 run in parallel.
- Polish tasks T044-T045 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Parallelize US1 test authoring:
Task: "T016 [US1] lifecycle state transition tests"
Task: "T017 [US1] manager concurrency/idempotency tests"

# After tests are in place, parallelize independent implementation:
Task: "T019 [US1] lifecycle enums/metrics"
Task: "T022 [US1] executor configuration"
```

## Parallel Example: User Story 2

```bash
# Parallelize deterministic simulation test suites:
Task: "T024 [US2] dispersion tests"
Task: "T025 [US2] temperature model tests"
Task: "T026 [US2] humidity model tests"
Task: "T027 [US2] CO2 model tests"
Task: "T028 [US2] PM2.5 model tests"
Task: "T029 [US2] clamp/noise tests"
```

## Parallel Example: User Story 3

```bash
# Parallelize telemetry validation tests:
Task: "T035 [US3] payload immutability tests"
Task: "T036 [US3] queue overflow policy tests"
Task: "T037 [US3] dispatcher payload contract tests"

# Parallelize independent implementation pieces:
Task: "T039 [US3] immutable telemetry value objects"
Task: "T041 [US3] console publisher"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Setup (Phase 1).
2. Complete Foundational prerequisites (Phase 2).
3. Deliver US1 (Phase 3) and validate local concurrent lifecycle behavior.
4. Stop and confirm independent test success before further expansion.

### Incremental Delivery

1. Add US2 deterministic simulation model and validate replay/convergence.
2. Add US3 telemetry dispatch/queue behavior and validate backpressure resilience.
3. Execute Phase 6 cross-cutting quality gates and integration obligations.

### Parallel Team Strategy

1. Team A: Foundational abstractions/factories and validation (T006-T015).
2. Team B: US1 lifecycle orchestration (T016-T023).
3. Team C: US2 simulation model and deterministic tests (T024-T034).
4. Team D: US3 telemetry pipeline and queue contracts (T035-T043).
5. Merge and finish cross-cutting gates (T044-T048).

---

## Notes

- All tasks use explicit file paths and strict checklist format.
- Story labels are present only in user story phases.
- Tests are included because the specification and constitution explicitly require them.
- Queue policy and deterministic seeding clarifications are encoded in US2/US3 tasks.
- No task relies on direct logging from `Emulator`; dispatcher-only output is enforced in US3.
