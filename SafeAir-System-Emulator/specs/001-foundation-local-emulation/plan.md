# Implementation Plan: Foundation, Local Emulation Mode and Deterministic Environmental Model

**Branch**: `001-foundation-local-emulation` | **Date**: 2026-03-12 | **Spec**: `/specs/001-foundation-local-emulation/spec.md`
**Input**: Feature specification from `/specs/001-foundation-local-emulation/spec.md`

## Summary

Deliver a constitution-compliant local emulation foundation where multiple `Emulator` instances run concurrently with deterministic, bounded environmental evolution and centralized, non-blocking telemetry dispatch. The implementation will enforce UML architecture roles, factory-only instantiation, fixed stack/runtime constraints, and requirement-traceable validation/testing gates; telemetry transport is abstracted behind immutable payload contracts so local logs can later be replaced by broker-backed channels without emulator-loop changes.

## Technical Context

**Language/Version**: Java 21.0.5  
**Primary Dependencies**: Spring Boot 4.0.3, Maven 3.8.7, JUnit 5, Mockito  
**Storage**: N/A (in-memory bounded telemetry queue, capacity 1024)  
**Testing**: JUnit 5 unit and integration tests; deterministic simulation harness with seeded PRNG injection  
**Target Platform**: Linux container runtime with Docker (Eclipse Temurin 21), default service port 8080
**Project Type**: Backend service / emulator runtime  
**Performance Goals**: 3+ concurrent emulators for 15 minutes; >=99% ticks within $\pm10\%$ interval budget; deterministic replay equality across 300 ticks for same `emulatorId`  
**Constraints**: UML-first architecture conformance; factory-only `Sensor`/`Electrodomestic` instantiation; non-blocking telemetry producer with drop-oldest overflow; no reactive stack; immutable telemetry snapshots only  
**Scale/Scope**: Foundation scope for local mode orchestration, deterministic simulation loop ordering, dispatcher pipeline, and validation/test gates for emulation + simulation packages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] UML conformance: planned components preserve `Emulator` orchestration center, `EmulatorManager` lifecycle role, abstract/interface semantics, and package ownership boundaries.
- [x] Stack lock: plan fixes Java 21.0.5, Spring Boot 4.0.3, Maven 3.8.7, jar packaging, Dockerized runtime, and port 8080.
- [x] Structural boundaries: implementation tree scoped to `com.safeair.emulator` with constitution-mandated package segmentation.
- [x] Factory enforcement: creation of concrete sensors/electrodomestics remains encapsulated in `SensorFactory` and `ElectrodomesticFactory`.
- [x] Domain constraints: required bounds/formulas (device ranges, dispersion/window/area factors, closed-environment CO2 increment) are explicit and test-traceable.
- [x] Testing gates: JUnit 5 unit + integration coverage strategy includes API storage client and MQTT publisher integration tests.
- [x] Quality gates: plan mandates zero TODO/commented-out code/unused imports and Sonar critical issue clean state before merge.
- [x] Delivery governance: workflow aligns to `feature/* -> develop -> release/* -> master`; no direct commits to `master`.

**Gate Result (Pre-Phase 0)**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-local-emulation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/main/java/com/safeair/emulator/
├── abstracts/
├── api/
│   ├── client/
│   ├── dto/
│   └── mqtt/
├── emulation/
│   ├── core/
│   ├── impl/
│   └── simulation/
├── manager/
└── config/

src/test/java/com/safeair/emulator/
├── unit/
│   ├── emulation/
│   ├── simulation/
│   └── factories/
├── integration/
│   ├── api/
│   └── mqtt/
└── contract/
```

**Structure Decision**: Single Spring Boot service using constitution-mandated package layout under `com.safeair.emulator`, with test suites segmented by unit/integration/contract responsibilities to enforce verification-first merge gates.

## Phase 0 Research Outcomes

- Resolved deterministic concurrency approach: one scheduler/worker per emulator with seed derived from `emulatorId` so same emulator replay is stable while cross-emulator streams diverge.
- Resolved local telemetry overflow policy: bounded lock-free queue semantics with drop-oldest + dropped counter update, never blocking emulator tick producers.
- Resolved timing validation method: capture per-tick duration and evaluate compliance against configured interval tolerance window of $\pm10\%$.
- Resolved simulation order and validation strategy: strict execution sequence FR-007 encoded in one orchestration method and verified with deterministic step-order tests.

## Phase 1 Design Outcomes

- Data model specified in `/specs/001-foundation-local-emulation/data-model.md` with immutable payload and domain validation invariants.
- Interface contracts specified in `/specs/001-foundation-local-emulation/contracts/local-telemetry-contract.md` for dispatcher output payload and lifecycle operation contract.
- Developer runbook created at `/specs/001-foundation-local-emulation/quickstart.md` for local execution, deterministic replay checks, and overflow validation scenarios.
- Agent context update script executed for Copilot to sync stack metadata from this plan.

## Constitution Check (Post-Design)

- [x] UML conformance preserved by design entities and orchestration ownership.
- [x] Stack/runtime contract preserved in implementation approach and quickstart commands.
- [x] Structural boundaries and factory-only instantiation rules explicitly enforced in model/contracts.
- [x] Domain formulas/bounds mapped to validations and unit tests.
- [x] Verification-first gates represented with coverage and integration test obligations.

**Gate Result (Post-Phase 1)**: PASS

## Complexity Tracking

Not applicable for current phase.
