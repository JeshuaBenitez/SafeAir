# Implementation Plan: MQTT Integration with Adapter and Asynchronous Dispatch

**Branch**: `002-mqtt-async-adapter` | **Date**: 2026-04-05 | **Spec**: `/specs/002-mqtt-async-adapter/spec.md`
**Input**: Feature specification from `/specs/002-mqtt-async-adapter/spec.md`

## Summary

Implement complete MQTT transport integration for telemetry and configuration flows by introducing adapter-based Protobuf conversion, queue-backed asynchronous configuration dispatch, and virtual-thread execution migration. The approach preserves existing emulator simulation behavior, enforces clarified operational policies (TLS everywhere, QoS split, conflict precedence, bounded queue drop-oldest with fixed capacity 1024, measurable channel availability/recovery), and keeps constitutional constraints on stack, architecture, factories, and testing gates.

## Technical Context

**Language/Version**: Java 21.0.5  
**Primary Dependencies**: Spring Boot 4.0.3, Maven 3.8.7, JUnit 5, Mockito, Eclipse Paho MQTT client, Protobuf Java runtime and codegen plugin  
**Storage**: N/A (in-memory telemetry/config command queues)  
**Testing**: JUnit 5 unit and integration tests, mocked/embedded MQTT broker integration paths, Maven quality gates (JaCoCo, Checkstyle, SpotBugs)  
**Target Platform**: Linux container runtime (Eclipse Temurin 21), default service port 8080
**Project Type**: Backend service / emulator runtime  
**Performance Goals**: 20 concurrent emulators for 30 minutes with 100% topic publication coverage; 99% config application within 5s; 99.5% continuity during 1000-msg/5-min burst  
**Constraints**: UML-first conformance, no reactive stack adoption, mandatory package boundaries, factory-only sensor/device creation, TLS mandatory in all environments, telemetry QoS 0 and config QoS 1, bounded dispatcher queue with fixed capacity 1024 and drop-oldest overflow, channel availability >=99.5% with reconnect <=10s for transient disconnects  
**Scale/Scope**: Extend existing single Spring Boot service with MQTT connector/subscriber, adapter layer, config dispatcher, virtual-thread migration, and contract-backed tests without changing domain simulation formulas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] UML conformance: planned components (`MQTTConnector`, `MQTTSubscriber`, `ConfigDispatcher`, adapters) are additive and keep `Emulator`/`EmulatorManager` responsibilities aligned with architecture source.
- [x] Stack lock: plan keeps Java 21.0.5, Spring Boot 4.0.3, Maven 3.8.7, jar packaging, and port 8080.
- [x] Structural boundaries: implementation remains under mandated `com.safeair.emulator` package tree with responsibilities split across `api`, `manager`, `config`, and `emulation`.
- [x] Factory enforcement: no direct sensor/electrodomestic instantiation outside existing factories is introduced.
- [x] Domain constraints: no new simulation formulas are introduced; existing non-negotiable ranges remain validated and unchanged.
- [x] Testing gates: plan includes JUnit 5 unit and integration tests for MQTT publisher/subscriber and asynchronous dispatch behavior.
- [x] Quality gates: coverage/checkstyle/spotbugs/sonar expectations are represented and required prior to merge.
- [x] Delivery governance: implementation work is tracked in Speckit branch `002-mqtt-async-adapter`, and before merge the change set MUST be aligned to constitutional `feature/*` workflow (`feature/*` -> `develop` -> `release/*` -> `master`) with explicit compliance evidence.

**Gate Result (Pre-Phase 0)**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-mqtt-async-adapter/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mqtt-integration-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/main/java/com/safeair/emulator/
├── abstracts/
├── api/
│   ├── client/
│   ├── dto/
│   └── mqtt/
├── config/
├── emulation/
│   ├── core/
│   ├── impl/
│   └── simulation/
└── manager/

src/main/resources/
└── application.yml

src/main/proto/
├── telemetry.proto
└── config.proto

src/test/java/com/safeair/emulator/
├── unit/
└── integration/
```

**Structure Decision**: Single Spring Boot service with constitution-mandated package layout; feature artifacts remain inside existing backend module and add protocol contracts plus focused manager/api/config extensions.

## Phase 0 Research Outcomes

- Resolved MQTT transport strategy: keep telemetry publish and config subscribe asynchronous with channel resiliency on transient I/O failures.
- Resolved payload contract strategy: use Protobuf as canonical MQTT wire format; adapters isolate transport/domain conversion.
- Resolved command-processing policy: bounded queue with drop-oldest overflow and deterministic conflict resolution (specific > global, same scope newest wins).
- Resolved security/runtime strategy: enforce TLS in all environments while externalizing broker host/port/credentials/log toggles in configuration properties.
- Resolved concurrency migration approach: replace heavyweight per-task threading with virtual-thread executor model while preserving lifecycle/tick semantics.

## Phase 1 Design Outcomes

- Data model defined in `/specs/002-mqtt-async-adapter/data-model.md` for telemetry envelope, command lifecycle, queue item, and broker profile entities.
- External interface contracts defined in `/specs/002-mqtt-async-adapter/contracts/mqtt-integration-contract.md` for topics, QoS, payload schemas, callback flow, and error semantics.
- Validation runbook defined in `/specs/002-mqtt-async-adapter/quickstart.md` with build, runtime, resilience, and policy verification scenarios.
- Agent context update executed for Copilot after plan finalization.

## Constitution Check (Post-Design)

- [x] UML conformance remains preserved by additive components and unchanged orchestrator responsibilities.
- [x] Stack/runtime contract remains locked to constitution-required versions and packaging.
- [x] Structural boundaries and factory-only creation rules remain intact in design artifacts.
- [x] Domain formula/range invariants remain unchanged and explicitly protected in validation strategy.
- [x] Verification-first quality gates remain covered by planned unit/integration suites and CI checks.

**Gate Result (Post-Phase 1)**: PASS

## Constitution Alignment Evidence

- Branch governance evidence: implementation is developed on Speckit branch `002-mqtt-async-adapter` and tracked with explicit task `T053` to align merge path to constitutional `feature/*` workflow before integration.
- Factory boundary evidence: structural verification test path is defined in `src/test/java/com/safeair/emulator/unit/architecture/StructuralBoundaryTest.java`.
- Domain validation evidence: domain-rule regression coverage is tracked in `src/test/java/com/safeair/emulator/unit/emulation/core/DomainValidatorsTest.java`.
- Integration obligations evidence: both MQTT Publisher and API Storage Client integration tests are included in `src/test/java/com/safeair/emulator/integration/mqtt/` and `src/test/java/com/safeair/emulator/integration/api/`.

## Complexity Tracking

Not applicable for current phase.
