<!--
Sync Impact Report
- Version change: 2.0.0 -> 3.0.0
- Modified principles:
	- II. Fixed Technical Stack and Runtime Contract -> II. Fixed Technical Stack and Runtime Contract (emulator identity migrated from legacy format to prefixed String ID format EMU-0001)
- Added sections:
	- None
- Removed sections:
	- None
- Templates requiring updates:
	- ✅ no changes required: .specify/templates/plan-template.md
	- ✅ no changes required: .specify/templates/spec-template.md
	- ✅ no changes required: .specify/templates/tasks-template.md
	- ⚠ pending: .specify/templates/commands/*.md (directory not present in repository)
- Follow-up TODOs:
	- None
-->

# SAFE AIR SYSTEM EMULATOR Constitution

## Core Principles

### I. UML-First Architecture Compliance
The PlantUML architecture is the binding source of truth for structural design. All
packages, classes, interfaces, abstract classes, relationships, and responsibilities MUST
match the UML definition unless the UML itself is formally amended first. Abstract classes
MUST remain abstract, interfaces MUST not be replaced by concrete classes, and Emulator
MUST remain the central orchestrator while EmulatorManager manages multiple Emulator
instances.

Rationale: This prevents architectural drift and preserves consistency between design,
implementation, and review.

### II. Fixed Technical Stack and Runtime Contract
Implementations MUST use Java 21.0.5, Spring Boot 4.0.3, Maven 3.8.7, and jar packaging.
Default server port MUST be 8080. Dockerization is mandatory. Emulator IDs MUST use String format EMU-0001 (prefix EMU- and zero-padded numeric sequence). Reactive stack adoption is prohibited unless explicitly approved through a
constitution amendment.

Rationale: Fixed platform constraints reduce environment variance and simplify deployment
and support.

### III. Structural Boundaries and Factory Enforcement
The package structure under com.safeair.emulator MUST be preserved: abstracts, api
(client, dto, mqtt), emulation (impl, simulation, core), manager, config, and tests.
Sensor and Electrodomestic implementations MUST be instantiated only through
SensorFactory and ElectrodomesticFactory. Direct instantiation outside factories is
forbidden. Controllers MUST contain no business logic. Bidirectional circular dependencies
are forbidden.

Rationale: Clear boundaries ensure maintainability, testability, and replaceability of
components.

### IV. Domain Rule Enforcement and Simulation Integrity
All domain constraints MUST be enforced in code:
- MiniSplit temperature MUST be in [19, 30].
- HumidifierPurifier level MUST be in [1, 5].
- AirExtractor state MUST be in {0, 1}.
- Room dispersionRate MUST be generated randomly in [0.15, 0.20].
- areaFactor MUST be sqrt(roomSquareMeters).
- windowFactor MUST be 1 + (windowCount * 0.08).

Validation failures MUST be explicit and testable. Business rules MUST NOT be embedded in
DTOs.

Rationale: Emulator behavior must remain physically and logically consistent with design
intent.

### V. Verification-First Quality Gates
JUnit 5 is mandatory. Minimum 80% test coverage is mandatory for Emulator,
RoomEnvironmentHelper, and both factories. Integration tests are mandatory for API Storage
Client and MQTT Publisher (with mocked broker unless Testcontainers-based real integration
is explicitly required). Before merge to develop, all tests MUST pass, Sonar must report no
critical issues, TODO comments are forbidden, unused imports are forbidden, and
commented-out code is forbidden.

Rationale: Enforced verification prevents regressions in core orchestration and simulation
logic.

## Additional Technical Standards

Docker images MUST use a multi-stage build with Eclipse Temurin 21, expose port 8080, and
start the packaged jar via ENTRYPOINT. Field injection in Spring is forbidden; constructor
injection is required. Wildcard imports are forbidden. Static state in Emulator is
forbidden.

Reference Docker baseline:

```Dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
```

## Delivery Workflow and Branch Governance

Branching model is mandatory:
- master is production-ready and stable.
- develop is the integration branch.
- release/x.x.x is for release preparation.
- feature/* is for new features.

Workflow is mandatory:
1. Create master.
2. Create develop from master.
3. Create feature branches from develop.
4. Merge feature branches into develop.
5. Create release branch when develop is stable.
6. Merge validated release into master and tag version.

Direct commits to master are forbidden.

## Governance

This constitution overrides conflicting local conventions and templates. Compliance MUST be
checked during planning, specification, task generation, implementation, and review.

Amendment process:
1. Propose amendment with explicit rationale and impacted sections.
2. Assess compatibility impact and classify version bump:
	 - MAJOR for incompatible governance changes or principle removals/redefinitions.
	 - MINOR for new principles/sections or materially expanded mandatory guidance.
	 - PATCH for clarifications and non-semantic wording updates.
3. Update dependent templates and guidance documents in the same change set.
4. Record the Sync Impact Report at the top of this file.

Compliance review expectations:
- Every pull request MUST include a constitution compliance check.
- Any justified deviation MUST be documented as a temporary exception and tracked to
	closure.
- Missing compliance evidence blocks merge.

**Version**: 3.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-22
