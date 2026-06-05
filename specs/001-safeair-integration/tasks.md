# Tasks / Tareas: SafeAir Frontend-Backend Integration

**Input**: Design documents from `/specs/001-safeair-integration/` / Documentos de diseño de `/specs/001-safeair-integration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ / plan.md (requerido), spec.md (requerido para historias de usuario), research.md, data-model.md, contracts/

**Tests**: Tests are optional. This plan focuses on implementation and validation tasks that directly support the approved user stories and integration requirements. / Las pruebas son opcionales. Este plan se enfoca en tareas de implementación y validación que apoyan directamente las historias de usuario y requisitos de integración aprobados.

**Organization**: Tasks are grouped by user story to keep each slice independently implementable and independently verifiable. / Las tareas están agrupadas por historia de usuario para que cada parte sea implementable y verificable de forma independiente.

## Format / Formato: `[ID] [P?] [Story] Description / Descripción`

- **[P]**: Can run in parallel with other tasks in the same phase / Puede ejecutarse en paralelo con otras tareas de la misma fase
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3) / A qué historia de usuario pertenece esta tarea (por ejemplo, US1, US2, US3)
- Include exact file paths in descriptions / Incluir rutas exactas de archivos en las descripciones

---

## Phase 1: Setup (Shared Infrastructure) / Fase 1: Configuración (Infraestructura compartida)

**Purpose**: Prepare shared config and environment files needed by both apps. / Preparar archivos compartidos de configuración y entorno necesarios para ambas aplicaciones.

- [ ] T001 [P] Create frontend environment configuration files in Frontend_SafeAir/src/environments/environment.ts and Frontend_SafeAir/src/environments/environment.prod.ts for API_BASE_URL, MQTT broker URL, and auth mode defaults. / Crear archivos de configuración de entorno del frontend en Frontend_SafeAir/src/environments/environment.ts y Frontend_SafeAir/src/environments/environment.prod.ts para API_BASE_URL, URL del broker MQTT y valores por defecto del modo de autenticación.
- [ ] T002 [P] Add backend environment example in Api_Emuladores/.env.example for DB_HOST, DB_PORT=6543, JWT_SECRET, TELEMETRY_API_KEY, and MQTT_BROKER_URL. / Agregar un ejemplo de entorno del backend en Api_Emuladores/.env.example para DB_HOST, DB_PORT=6543, JWT_SECRET, TELEMETRY_API_KEY y MQTT_BROKER_URL.

---

## Phase 2: Foundational (Blocking Prerequisites) / Fase 2: Fundacional (Prerrequisitos bloqueantes)

**Purpose**: Core integration pieces that must exist before any user story can be completed cleanly. / Piezas centrales de integración que deben existir antes de completar correctamente cualquier historia de usuario.

**⚠️ CRITICAL**: No user story work should be considered complete until this phase is in place. / Ningún trabajo de historia de usuario debe considerarse completo hasta que esta fase esté lista.

- [ ] T003 [P] Normalize backend login payload handling to accept either `email` or legacy `identifier` in Api_Emuladores/src/api/dtos/auth.dto.ts and Api_Emuladores/src/api/controllers/auth.controller.ts before calling AuthService. / Normalizar el manejo del payload de login del backend para aceptar `email` o el legado `identifier` en Api_Emuladores/src/api/dtos/auth.dto.ts y Api_Emuladores/src/api/controllers/auth.controller.ts antes de llamar a AuthService.
- [ ] T004 [P] Add a reusable HTTP abstraction in Frontend_SafeAir/src/app/core/http/api-client.port.ts and Frontend_SafeAir/src/app/core/http/http-client.adapter.ts, then register it in Frontend_SafeAir/src/app/app.config.ts. / Agregar una abstracción HTTP reutilizable en Frontend_SafeAir/src/app/core/http/api-client.port.ts y Frontend_SafeAir/src/app/core/http/http-client.adapter.ts, y registrarla en Frontend_SafeAir/src/app/app.config.ts.
- [ ] T005 Wire the auth repository factory to use the real HTTP adapter in Frontend_SafeAir/src/app/features/auth/data/adapters/auth-repository.factory.ts and Frontend_SafeAir/src/app/features/auth/data/adapters/auth-api-repository.adapter.ts. / Conectar la fábrica del repositorio de auth para usar el adaptador HTTP real en Frontend_SafeAir/src/app/features/auth/data/adapters/auth-repository.factory.ts y Frontend_SafeAir/src/app/features/auth/data/adapters/auth-api-repository.adapter.ts.
- [ ] T006 [P] Configure PostgreSQL pool settings and graceful shutdown for database and MQTT cleanup in Api_Emuladores/src/infrastructure/database/sequelize.ts and Api_Emuladores/src/server.ts. / Configurar el pool de PostgreSQL y un apagado elegante para limpiar la base de datos y MQTT en Api_Emuladores/src/infrastructure/database/sequelize.ts y Api_Emuladores/src/server.ts.
- [ ] T007 [P] Align shared request logging and audit hooks for later load validation in Api_Emuladores/src/api/middlewares/request-logger.middleware.ts and Api_Emuladores/src/api/middlewares/request-audit.middleware.ts. / Alinear el registro compartido de solicitudes y los hooks de auditoría para la validación de carga posterior en Api_Emuladores/src/api/middlewares/request-logger.middleware.ts y Api_Emuladores/src/api/middlewares/request-audit.middleware.ts.

**Checkpoint**: Foundation ready - user story implementation can now begin. / Base lista - ya puede comenzar la implementación de historias de usuario.

---

## Phase 3: User Story 1 - End-to-End User Authentication (Priority: P1) 🎯 MVP / Fase 3: Historia de Usuario 1 - Autenticación de usuario de extremo a extremo (Prioridad: P1) 🎯 MVP

**Goal**: A user can log in with email/password, receive a live JWT session, and remain authenticated across refreshes while protected routes stay guarded. / Un usuario puede iniciar sesión con email/contraseña, recibir una sesión JWT activa y seguir autenticado entre recargas mientras las rutas protegidas siguen resguardadas.

**Independent Test**: Log in from Frontend_SafeAir with valid credentials, refresh the browser, and remain signed in; invalid credentials should show a clear error; protected routes should redirect unauthenticated users to login. / Iniciar sesión desde Frontend_SafeAir con credenciales válidas, refrescar el navegador y seguir autenticado; credenciales inválidas deben mostrar un error claro; las rutas protegidas deben redirigir a login.

### Implementation for User Story 1 / Implementación para la Historia de Usuario 1

- [ ] T008 [P] [US1] Update Frontend_SafeAir/src/app/features/auth/components/login-form/login-form.component.ts and Frontend_SafeAir/src/app/features/auth/data/dto/login-request.dto.ts to send `email` instead of `identifier`. / Actualizar Frontend_SafeAir/src/app/features/auth/components/login-form/login-form.component.ts y Frontend_SafeAir/src/app/features/auth/data/dto/login-request.dto.ts para enviar `email` en lugar de `identifier`.
- [ ] T009 [P] [US1] Implement the live login request and backend error mapping in Frontend_SafeAir/src/app/features/auth/data/adapters/auth-api-repository.adapter.ts. / Implementar la solicitud de login en vivo y el mapeo de errores del backend en Frontend_SafeAir/src/app/features/auth/data/adapters/auth-api-repository.adapter.ts.
- [ ] T010 [US1] Persist, restore, and clear active sessions in Frontend_SafeAir/src/app/features/auth/application/services/auth-session-storage.service.ts and Frontend_SafeAir/src/app/features/auth/application/facades/auth.facade.ts. / Persistir, restaurar y limpiar sesiones activas en Frontend_SafeAir/src/app/features/auth/application/services/auth-session-storage.service.ts y Frontend_SafeAir/src/app/features/auth/application/facades/auth.facade.ts.
- [ ] T011 [US1] Enforce authenticated routing and post-login redirect behavior in Frontend_SafeAir/src/app/core/guards/auth-session.guard.ts and Frontend_SafeAir/src/app/features/auth/pages/login-page/login-page.component.ts. / Forzar el enrutado autenticado y el comportamiento de redirección después del login en Frontend_SafeAir/src/app/core/guards/auth-session.guard.ts y Frontend_SafeAir/src/app/features/auth/pages/login-page/login-page.component.ts.
- [ ] T012 [P] [US1] Expand the backend login response contract to the full session payload in Api_Emuladores/src/application/services/auth.service.ts, Api_Emuladores/src/api/controllers/auth.controller.ts, and Api_Emuladores/src/domain/types/auth.types.ts while keeping option A compatibility. / Expandir el contrato de respuesta de login del backend al payload completo de sesión en Api_Emuladores/src/application/services/auth.service.ts, Api_Emuladores/src/api/controllers/auth.controller.ts y Api_Emuladores/src/domain/types/auth.types.ts manteniendo la compatibilidad de la opción A.

**Checkpoint**: User Story 1 should be fully functional and independently demoable. / La Historia de Usuario 1 debe quedar completamente funcional y demostrable de forma independiente.

---

## Phase 4: User Story 2 - View Room Metrics in Real-Time (Priority: P2) / Fase 4: Historia de Usuario 2 - Ver métricas de sala en tiempo real (Prioridad: P2)

**Goal**: After authentication, the dashboard shows live rooms and current metrics from the backend, refreshing every 2-3 seconds while preserving the existing mock fallback during transition. / Después de la autenticación, el panel muestra salas activas y métricas actuales del backend, refrescando cada 2-3 segundos y conservando el fallback mock durante la transición.

**Independent Test**: After logging in, the dashboard loads backend rooms and updates temperature, humidity, CO2, and PM2.5 values when the emulator publishes new telemetry. / Después de iniciar sesión, el dashboard carga las salas del backend y actualiza temperatura, humedad, CO2 y PM2.5 cuando el emulador publica nueva telemetría.

### Implementation for User Story 2 / Implementación para la Historia de Usuario 2

- [ ] T013 [P] [US2] Define a live dashboard repository contract and DTOs in Frontend_SafeAir/src/app/features/dashboard/domain/ports/dashboard-repository.port.ts and Frontend_SafeAir/src/app/features/dashboard/domain/models/dashboard-metric-snapshot.model.ts. / Definir un contrato de repositorio de dashboard en vivo y DTOs en Frontend_SafeAir/src/app/features/dashboard/domain/ports/dashboard-repository.port.ts y Frontend_SafeAir/src/app/features/dashboard/domain/models/dashboard-metric-snapshot.model.ts.
- [ ] T014 [P] [US2] Implement the dashboard API adapter for GET /api/v1/rooms and GET /api/v1/rooms/{id}/metrics/current in Frontend_SafeAir/src/app/features/dashboard/data/adapters/dashboard-api-repository.adapter.ts. / Implementar el adaptador API del dashboard para GET /api/v1/rooms y GET /api/v1/rooms/{id}/metrics/current en Frontend_SafeAir/src/app/features/dashboard/data/adapters/dashboard-api-repository.adapter.ts.
- [ ] T015 [US2] Refactor Frontend_SafeAir/src/app/features/dashboard/application/facades/dashboard.facade.ts and Frontend_SafeAir/src/app/features/dashboard/application/services/dashboard-mock-state.service.ts to source live rooms and metrics while keeping the mock fallback path. / Refactorizar Frontend_SafeAir/src/app/features/dashboard/application/facades/dashboard.facade.ts y Frontend_SafeAir/src/app/features/dashboard/application/services/dashboard-mock-state.service.ts para tomar salas y métricas en vivo manteniendo la ruta fallback mock.
- [ ] T016 [US2] Rework Frontend_SafeAir/src/app/features/dashboard/pages/dashboard-view-page/dashboard-view-page.component.ts and Frontend_SafeAir/src/app/features/dashboard/pages/room-control-page/room-control-page.component.ts to subscribe to live dashboard data instead of the mock-only environment state. / Rehacer Frontend_SafeAir/src/app/features/dashboard/pages/dashboard-view-page/dashboard-view-page.component.ts y Frontend_SafeAir/src/app/features/dashboard/pages/room-control-page/room-control-page.component.ts para suscribirse a datos en vivo del dashboard en lugar del estado mock-only.
- [ ] T017 [US2] Normalize the backend metrics response contract in Api_Emuladores/src/api/controllers/metrics.controller.ts, Api_Emuladores/src/application/services/metrics-query.service.ts, and Api_Emuladores/src/infrastructure/repositories/cycle.repository.ts so current metrics return the expected shape. / Normalizar el contrato de respuesta de métricas del backend en Api_Emuladores/src/api/controllers/metrics.controller.ts, Api_Emuladores/src/application/services/metrics-query.service.ts y Api_Emuladores/src/infrastructure/repositories/cycle.repository.ts para que las métricas actuales devuelvan la forma esperada.

**Checkpoint**: User Story 2 should be independently usable after authentication. / La Historia de Usuario 2 debe poder usarse de forma independiente después de autenticación.

---

## Phase 5: User Story 3 - Concurrent Load Testing (2-3 Users) (Priority: P2) / Fase 5: Historia de Usuario 3 - Prueba de carga concurrente (2-3 usuarios) (Prioridad: P2)

**Goal**: The system handles 2-3 simultaneous authenticated frontend clients without pool exhaustion, lost messages, or connection instability. / El sistema maneja 2-3 clientes frontend autenticados simultáneamente sin agotamiento del pool, sin mensajes perdidos y sin inestabilidad de conexión.

**Independent Test**: Run a Playwright scenario with 2-3 simultaneous browser contexts against the local frontend and backend for 2 minutes, and confirm stable logins, repeated metric refreshes, and no backend/database failures. / Ejecutar un escenario de Playwright con 2-3 contextos de navegador simultáneos contra el frontend y backend local durante 2 minutos, y confirmar logins estables, refrescos repetidos de métricas y ausencia de fallos del backend/base de datos.

### Implementation for User Story 3 / Implementación para la Historia de Usuario 3

- [ ] T018 [P] [US3] Add a concurrent-client Playwright validation scenario in Frontend_SafeAir/tests/performance/concurrent-clients.spec.ts. / Agregar un escenario de validación con clientes concurrentes en Playwright en Frontend_SafeAir/tests/performance/concurrent-clients.spec.ts.
- [ ] T019 [P] [US3] Add backend request and connection observability improvements for the load scenario in Api_Emuladores/src/api/middlewares/request-logger.middleware.ts and Api_Emuladores/src/server.ts. / Agregar mejoras de observabilidad de solicitudes y conexiones del backend para el escenario de carga en Api_Emuladores/src/api/middlewares/request-logger.middleware.ts y Api_Emuladores/src/server.ts.
- [ ] T020 [US3] Document the concurrency validation workflow and expected operating limits in Frontend_SafeAir/tests/README.md and specs/001-safeair-integration/quickstart.md. / Documentar el flujo de validación de concurrencia y los límites operativos esperados en Frontend_SafeAir/tests/README.md y specs/001-safeair-integration/quickstart.md.

**Checkpoint**: User Story 3 should validate the local concurrency target without breaking earlier stories. / La Historia de Usuario 3 debe validar el objetivo de concurrencia local sin romper las historias anteriores.

---

## Phase 6: Polish & Cross-Cutting Concerns / Fase 6: Pulido y aspectos transversales

**Purpose**: Finish bilingual documentation, remove friction, and align remaining naming/details across the integrated flow. / Finalizar la documentación bilingüe, quitar fricción y alinear nombres/detalles restantes en el flujo integrado.

- [ ] T021 [P] Update the root bilingual README with the three-laptop installation, startup, and troubleshooting flow in README.md. / Actualizar el README bilingüe raíz con el flujo de instalación, arranque y solución de problemas para las tres laptops en README.md.
- [ ] T022 [P] Align feature documentation with the final implementation details in specs/001-safeair-integration/plan.md, specs/001-safeair-integration/research.md, and specs/001-safeair-integration/quickstart.md. / Alinear la documentación de la característica con los detalles finales de implementación en specs/001-safeair-integration/plan.md, specs/001-safeair-integration/research.md y specs/001-safeair-integration/quickstart.md.
- [ ] T023 [P] Remove leftover mock-specific naming and hardcoded storage key friction in Frontend_SafeAir/src/app/features/auth/application/services/auth-session-storage.service.ts and Frontend_SafeAir/src/app/features/dashboard/application/services/dashboard-mock-state.service.ts. / Eliminar la nomenclatura sobrante específica de mock y la fricción por la clave de almacenamiento codificada en Frontend_SafeAir/src/app/features/auth/application/services/auth-session-storage.service.ts y Frontend_SafeAir/src/app/features/dashboard/application/services/dashboard-mock-state.service.ts.

---

## Dependencies & Execution Order / Dependencias y orden de ejecución

### Phase Dependencies / Dependencias por fase

- **Setup (Phase 1)**: No dependencies - can start immediately. / Sin dependencias - puede comenzar de inmediato.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories. / Depende de completar Setup - bloquea todas las historias de usuario.
- **User Stories (Phase 3+)**: Depend on Foundational completion. / Dependen de completar la fase Fundacional.
- **Polish (Phase 6)**: Depends on completion of the desired user stories. / Depende de completar las historias de usuario deseadas.

### User Story Dependencies / Dependencias de historias de usuario

- **User Story 1 (P1)**: Can start after the Foundational phase - no dependency on other user stories. / Puede comenzar después de la fase Fundacional - no depende de otras historias de usuario.
- **User Story 2 (P2)**: Can start after the Foundational phase - should remain independently testable after auth exists. / Puede comenzar después de la fase Fundacional - debe seguir siendo testeable de forma independiente después de existir auth.
- **User Story 3 (P2)**: Can start after the Foundational phase - validates the already integrated flow under load. / Puede comenzar después de la fase Fundacional - valida el flujo ya integrado bajo carga.

### Within Each User Story / Dentro de cada historia de usuario

- Story-specific implementation should stay inside the files listed for that story. / La implementación específica de cada historia debe quedarse dentro de los archivos listados para esa historia.
- Reuse shared abstractions only after the foundational phase is complete. / Reutilizar abstracciones compartidas solo después de completar la fase fundacional.
- Keep the mock path available until the live dashboard adapter is stable. / Mantener disponible la ruta mock hasta que el adaptador live del dashboard esté estable.
- Preserve the auth transition window from option A while the frontend is standardized to `email`. / Preservar la ventana de transición de auth de la opción A mientras el frontend se estandariza en `email`.

### Parallel Opportunities / Oportunidades en paralelo

- Phase 1 tasks T001 and T002 can run in parallel. / Las tareas T001 y T002 de la Fase 1 pueden ejecutarse en paralelo.
- Phase 2 tasks T003, T004, T006, and T007 can run in parallel; T005 follows the HTTP adapter registration path. / Las tareas T003, T004, T006 y T007 de la Fase 2 pueden ejecutarse en paralelo; T005 sigue la ruta de registro del adaptador HTTP.
- In User Story 1, T008, T009, and T012 can proceed in parallel across frontend/backend files; T010 and T011 follow the live login path. / En la Historia de Usuario 1, T008, T009 y T012 pueden avanzar en paralelo entre archivos frontend/backend; T010 y T011 siguen la ruta de login en vivo.
- In User Story 2, T013 and T014 can proceed in parallel; T015 and T016 follow the repository contract; T017 can be worked on in parallel on the backend once the contract is clear. / En la Historia de Usuario 2, T013 y T014 pueden avanzar en paralelo; T015 y T016 siguen el contrato del repositorio; T017 puede trabajarse en paralelo en el backend una vez que el contrato esté claro.
- In User Story 3, T018 and T019 can proceed in parallel; T020 follows once the validation scenario exists. / En la Historia de Usuario 3, T018 y T019 pueden avanzar en paralelo; T020 sigue una vez que exista el escenario de validación.
- In the polish phase, T021 and T022 can run in parallel; T023 is independent but should be reviewed against the final session-storage and mock-state behavior. / En la fase de pulido, T021 y T022 pueden correr en paralelo; T023 es independiente pero debe revisarse contra el comportamiento final de session-storage y mock-state.

---

## Parallel Example: User Story 1 / Ejemplo en paralelo: Historia de Usuario 1

```bash
Task: "Update Frontend_SafeAir/src/app/features/auth/components/login-form/login-form.component.ts and Frontend_SafeAir/src/app/features/auth/data/dto/login-request.dto.ts to send email instead of identifier"
Task: "Implement the live login request and backend error mapping in Frontend_SafeAir/src/app/features/auth/data/adapters/auth-api-repository.adapter.ts"
Task: "Expand the backend login response contract to the full session payload in Api_Emuladores/src/application/services/auth.service.ts, Api_Emuladores/src/api/controllers/auth.controller.ts, and Api_Emuladores/src/domain/types/auth.types.ts"
```

## Parallel Example: User Story 2 / Ejemplo en paralelo: Historia de Usuario 2

```bash
Task: "Define a live dashboard repository contract and DTOs in Frontend_SafeAir/src/app/features/dashboard/domain/ports/dashboard-repository.port.ts and Frontend_SafeAir/src/app/features/dashboard/domain/models/dashboard-metric-snapshot.model.ts"
Task: "Implement the dashboard API adapter for GET /api/v1/rooms and GET /api/v1/rooms/{id}/metrics/current in Frontend_SafeAir/src/app/features/dashboard/data/adapters/dashboard-api-repository.adapter.ts"
Task: "Normalize the backend metrics response contract in Api_Emuladores/src/api/controllers/metrics.controller.ts, Api_Emuladores/src/application/services/metrics-query.service.ts, and Api_Emuladores/src/infrastructure/repositories/cycle.repository.ts"
```

## Parallel Example: User Story 3 / Ejemplo en paralelo: Historia de Usuario 3

```bash
Task: "Add a concurrent-client Playwright validation scenario in Frontend_SafeAir/tests/performance/concurrent-clients.spec.ts"
Task: "Add backend request and connection observability improvements for the load scenario in Api_Emuladores/src/api/middlewares/request-logger.middleware.ts and Api_Emuladores/src/server.ts"
```

---

## Implementation Strategy / Estrategia de implementación

### MVP First / Primero el MVP

1. Complete Phase 1: Setup. / Completar la Fase 1: Setup.
2. Complete Phase 2: Foundational. / Completar la Fase 2: Fundacional.
3. Complete Phase 3: User Story 1. / Completar la Fase 3: Historia de Usuario 1.
4. Stop and validate the auth flow before expanding to live dashboard data. / Detenerse y validar el flujo de auth antes de expandirse a datos en vivo del dashboard.

### Incremental Delivery / Entrega incremental

1. Deliver auth first as the MVP. / Entregar auth primero como MVP.
2. Add live dashboard rooms and metrics without deleting the mock fallback. / Agregar salas y métricas en vivo del dashboard sin eliminar el fallback mock.
3. Validate the 2-3 client concurrency target last. / Validar al final el objetivo de concurrencia de 2-3 clientes.
4. Finish by cleaning up bilingual docs and naming friction. / Terminar limpiando la documentación bilingüe y la fricción de nombres.

### Parallel Team Strategy / Estrategia de equipo en paralelo

1. One developer can own backend auth and metrics response shaping. / Un desarrollador puede encargarse de auth backend y de la forma de respuesta de métricas.
2. One developer can own the frontend auth adapter and session persistence. / Un desarrollador puede encargarse del adaptador de auth frontend y la persistencia de sesión.
3. Another developer can own the live dashboard repository and polling flow. / Otro desarrollador puede encargarse del repositorio live del dashboard y del flujo de polling.
4. A separate developer can own the concurrent-client Playwright validation and observability improvements. / Un desarrollador separado puede encargarse de la validación concurrente en Playwright y de las mejoras de observabilidad.

---

## Notes / Notas

- [P] tasks can run in parallel because they touch different files and do not depend on unfinished tasks in the same phase. / Las tareas [P] pueden correr en paralelo porque tocan archivos distintos y no dependen de tareas incompletas en la misma fase.
- Story labels map each task to a specific user story for traceability. / Las etiquetas de historia mapean cada tarea a una historia de usuario específica para trazabilidad.
- Each user story is intended to remain independently demonstrable after the foundational work is complete. / Cada historia de usuario debe seguir siendo demostrable de forma independiente una vez completado el trabajo fundacional.
- The auth transition uses option A as a temporary compatibility bridge while the frontend standardizes on `email`. / La transición de auth usa la opción A como puente temporal de compatibilidad mientras el frontend se estandariza en `email`.
- Keep the mock dashboard path available until the live adapter is validated. / Mantener la ruta mock del dashboard disponible hasta que el adaptador live sea validado.
