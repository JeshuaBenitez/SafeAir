# Research Notes / Notas de Investigación

## 1. Auth contract transition
- Decision: Use option A during the migration window; backend accepts both `identifier` and `email` in login payloads while the frontend is standardized to `email`.
- Rationale: This avoids a hard break in the current frontend flow, reduces integration risk, and preserves backward compatibility for any existing clients or fixtures.
- Alternatives considered: Immediate frontend-only switch to `email`; backend-only rejection of `identifier`; dual endpoint versioning. The dual-field transition is the least disruptive.

## 2. API base URL configuration
- Decision: Introduce a single frontend configuration source for `API_BASE_URL`, with `http://localhost:3000` as the local default.
- Rationale: The frontend currently needs a stable, environment-aware way to reach the backend across laptops and future environments.
- Alternatives considered: Hardcoded localhost URLs in each adapter; implicit relative paths; environment-specific manual edits. Central configuration is more maintainable and less error-prone.

## 3. Real HTTP adapter vs mock
- Decision: Keep the mock auth adapter for controlled development, but implement a real HTTP adapter and route selection in the existing data-source factory.
- Rationale: The mock remains useful for isolated UI testing, while the HTTP adapter is required for real integration validation.
- Alternatives considered: Delete mock support; keep mock only; duplicate logic in components. Preserving both adapters gives the cleanest migration path.

## 4. PostgreSQL connectivity
- Decision: Treat PostgreSQL 16 in Docker Compose as the local source of truth, using the mapped host port 6543.
- Rationale: This matches the existing local database topology and avoids ambiguity between internal container ports and host access.
- Alternatives considered: Switching to a different port mapping; connecting directly to container-internal 5432 from the host; replacing Docker Compose. None are needed for the current scope.

## 5. MQTT connectivity
- Decision: Preserve MQTT as the telemetry ingress path and keep the backend able to consume telemetry from the local broker at localhost:1883.
- Rationale: MQTT is already part of the integration story and is necessary for emulator-driven live updates.
- Alternatives considered: Replacing MQTT with HTTP-only telemetry; making MQTT optional for all flows. That would reduce fidelity with the current architecture and is not justified.

## 6. Local 3-laptop execution
- Decision: Keep the current three-node local workflow: frontend on laptop 1, backend on laptop 2, database on laptop 3, with localhost defaults for development convenience.
- Rationale: The spec and constitution both require compatibility with the local multi-device setup and validation of cross-device access.
- Alternatives considered: Collapsing everything into one machine only; cloud deployment; remote-only development. Those would not satisfy the stated operating model.

## 7. Concurrent client validation
- Decision: Define acceptance around 2-3 simultaneous frontend clients using Playwright and local API/database connectivity checks.
- Rationale: The architecture is explicitly scoped for low-concurrency local use and should be verified at that load level.
- Alternatives considered: Skipping concurrency validation; raising the target to stress-test scale; relying on manual observation. A targeted, repeatable Playwright-based check is the best fit.

## 8. Dashboard migration strategy
- Decision: Keep dashboard mock behavior in place until the live room-metrics adapter is ready, then switch through the existing abstraction boundary.
- Rationale: This avoids blocking the rest of the integration while preserving a testable UI during transition.
- Alternatives considered: Big-bang replacement of the dashboard data path; leaving dashboard mock-only permanently. The phased path is the safest and most practical.
