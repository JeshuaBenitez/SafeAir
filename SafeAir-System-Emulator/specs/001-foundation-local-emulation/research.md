# Phase 0 Research - 001-foundation-local-emulation

## Deterministic Seeding Across Concurrent Emulators

- Decision: Derive a deterministic seed per emulator using `seed = hash64(emulatorId)` and initialize one PRNG per `EmulatorInstance`.
- Rationale: Guarantees replay stability for the same emulator while avoiding identical noise streams across concurrent emulators, satisfying FR-006 and FR-021.
- Alternatives considered: Global shared PRNG was rejected because thread interleaving breaks deterministic replay; fixed constant seed per process was rejected because all emulators would produce identical noise sequences.

## Tick Scheduling and Isolation Model

- Decision: Run one dedicated tick worker per emulator and keep lifecycle management + telemetry dispatch in separate dedicated workers.
- Rationale: Meets FR-004 and FR-005 while keeping timing behavior independently measurable per emulator.
- Alternatives considered: Shared worker pool was rejected because scheduling contention can violate timing predictability and complicate emulator-level control.

## Telemetry Queue Overflow Policy

- Decision: Use a bounded queue of fixed capacity 1024 with drop-oldest semantics (`evict head, enqueue new`) and increment `droppedTelemetryCount`.
- Rationale: Directly enforces FR-018 through FR-020 and preserves non-blocking producer behavior required by FR-019.
- Alternatives considered: Blocking producer was rejected because it risks cadence drift; drop-newest was rejected because it loses most recent state, reducing observability value.

## Simulation Order and Validation Approach

- Decision: Centralize per-tick sequence in a single orchestration method with explicit ordered steps: dispersion -> exchange -> actuator effects -> controlled noise -> clamps -> snapshot -> enqueue.
- Rationale: Enforces FR-007 and creates an auditable test seam for ordering and deterministic behavior.
- Alternatives considered: Distributed updates across helper methods without an explicit coordinator were rejected because order regressions become hard to detect.

## Domain Formula and Bounds Enforcement

- Decision: Implement explicit runtime validators for constitutional and feature constraints: MiniSplit [19,30], HumidifierPurifier [1,5], AirExtractor {0,1}, closed-environment CO2 increment +3 ppm when `windowCount == 0`, and physical clamps for all environment values.
- Rationale: Ensures CA-004, FR-009, FR-010, and FR-016 are enforceable and testable.
- Alternatives considered: Implicit clamping in DTO or UI layer was rejected because business rules must remain in domain/runtime logic.

## Timing Compliance Measurement

- Decision: Capture each tick start/end using monotonic clock and evaluate compliance against configured interval with tolerance window `interval * 0.90` to `interval * 1.10`.
- Rationale: Provides deterministic, implementation-neutral verification for FR-017 and SC-004.
- Alternatives considered: Wall-clock timestamp deltas were rejected due to system clock drift; average-only metrics were rejected because they can hide per-tick violations.

## Integration and Quality Gate Strategy

- Decision: Use JUnit 5 with Mockito for unit coverage and integration tests for API Storage Client and MQTT Publisher against mocked broker (or Testcontainers when explicitly needed), enforcing >=80% coverage in constitution-critical classes.
- Rationale: Matches constitutional verification requirements and CA-004/SC-005/SC-006.
- Alternatives considered: Unit-only strategy was rejected because external channel adapters require contract-level confidence.
