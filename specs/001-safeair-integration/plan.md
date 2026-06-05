# Implementation Plan: SafeAir Frontend-Backend Integration

**Branch**: `001-safeair-integration` | **Date**: 2026-05-13 | **Spec**: [specs/001-safeair-integration/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-safeair-integration/spec.md`

## Summary

Integrate the existing Angular 19 frontend with the existing Node.js/Express backend without replacing the current architecture. The plan prioritizes auth contract alignment, a real HTTP adapter for the frontend, controlled transition from mock to live dashboard data, and documentation for the 3-laptop local setup. Contract option A is adopted for the transition: the backend accepts both `identifier` and `email` during the migration window so the frontend can stabilize while preserving backward compatibility.

## Technical Context

**Language/Version**: TypeScript; backend on Node.js with Express 5, frontend on Angular 19  
**Primary Dependencies**: Express, Sequelize, PostgreSQL, MQTT, Zod, JWT, Angular DI, RxJS, Vitest, Playwright  
**Storage**: PostgreSQL 16 via Docker Compose, plus localStorage for frontend session persistence  
**Testing**: Backend typecheck/build, frontend unit tests with Vitest, E2E with Playwright, integration checks against local API and PostgreSQL  
**Target Platform**: Local Linux development across 3 laptops, plus standard desktop browsers  
**Project Type**: Web application with separate frontend and backend services  
**Performance Goals**: Login under 2 seconds on local network; dashboard metric refresh every 2-3 seconds; metric visibility within 5 seconds of emulator publication; support 2-3 concurrent frontend clients  
**Constraints**: Reuse the existing codebase, keep CORS open only for development, keep JWT in localStorage, keep PostgreSQL 16, preserve MQTT-based telemetry flow, document setup bilingually  
**Scale/Scope**: Single-site local deployment with 2-3 concurrent users, one backend, one frontend, one database, and one MQTT broker in the current local topology

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Status against [constitution.md](../../.specify/memory/constitution.md):

- PASS: Existing frontend/backend architecture is reused, not replaced.
- PASS: Contract option A is documented as a controlled transition strategy.
- PASS: PostgreSQL, MQTT, and local 3-laptop topology remain intact.
- PASS: Planning covers auth, API base URL, mock-to-live dashboard migration, and concurrent client validation.
- PASS: Documentation requirement includes bilingual README guidance.
- NOTE: Dashboard remains partially mocked until the live adapter is introduced; this is an intentional phased migration, not a violation.

## Project Structure

### Documentation (this feature)

```text
specs/001-safeair-integration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-contract.md
│   └── metrics-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
Api_Emuladores/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── dtos/
│   │   ├── middlewares/
│   │   └── routes/v1/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
└── database/
    └── sql/

Frontend_SafeAir/
├── src/
│   ├── app/
│   │   ├── core/
│   │   └── features/
│   ├── assets/
│   └── styles/
└── tests/
```

**Structure Decision**: This is a two-app web integration feature. The backend remains under `Api_Emuladores/` and the frontend remains under `Frontend_SafeAir/`. Feature documentation lives under `specs/001-safeair-integration/` with API contract docs in `contracts/`.

## Complexity Tracking

No constitution violations require justification at planning time. The only deliberate transition choice is auth compatibility option A, which is a temporary interoperability measure rather than a structural deviation.
