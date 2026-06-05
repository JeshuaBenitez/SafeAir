# Tasks: Auth UI Foundation

**Input**: Design documents from `/specs/001-auth-ui-foundation/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Se incluyen tareas minimas de pruebas y validacion visual por requerimiento explicito de la feature.

**Testing Stack Decision (fixed)**: Vitest + Angular Testing Library para unit/component, Playwright para smoke e2e.

**Organization**: Tareas agrupadas por fase y por historia de usuario para permitir implementacion y validacion incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencia directa)
- **[Story]**: Historia de usuario objetivo (`[US1]`, `[US2]`, `[US3]`)
- Todas las tareas incluyen ruta de archivo especifica

## Phase 1: Setup (Infraestructura compartida)

**Purpose**: Inicializar base Angular y herramientas del frontend

- [ ] T001 Inicializar workspace Angular standalone en package.json
- [ ] T002 Configurar scripts de desarrollo/build/test/lint en package.json
- [ ] T003 [P] Configurar TypeScript estricto para app y tests en tsconfig.json
- [ ] T004 [P] Configurar bootstrap standalone y providers base en src/main.ts
- [ ] T005 [P] Configurar redireccion global inicial a /auth/login (solo bootstrap raiz) en src/app/app.routes.ts
- [ ] T006 [P] Configurar app config base (router, providers, interceptores placeholder) en src/app/app.config.ts
- [ ] T007 [P] Definir reglas ESLint/Prettier para TS/HTML/SCSS en .eslintrc.json
- [ ] T008 Fijar stack oficial de pruebas Vitest + Playwright en package.json
- [ ] T009 [P] Configurar Vitest para unit/component tests en vitest.config.ts
- [ ] T010 [P] Configurar Playwright para smoke e2e en playwright.config.ts
- [ ] T011 Crear estructura de pruebas base para unit/component/e2e/contract en tests/README.md

---

## Phase 2: Foundational (Bloqueantes para todas las historias)

**Purpose**: Base arquitectonica core/shared/features antes de UI por historia

**CRITICAL**: Ninguna historia inicia sin completar esta fase

### Infraestructura y organizacion

- [ ] T012 Crear estructura core/shared/features segun plan en src/app/core/.gitkeep
- [ ] T013 [P] Crear estructura de feature auth (pages/components/domain/data/application) en src/app/features/auth/.gitkeep
- [ ] T014 [P] Crear entry route de auth feature con placeholders login/register en src/app/features/auth/auth.routes.ts
- [ ] T015 [P] Registrar montaje de rutas de feature auth en app.routes.ts (sin definir componentes finales) en src/app/app.routes.ts

### Estilos globales y tokens visuales

- [ ] T016 Crear tokens de color/spacing/radius/shadow/typography en src/styles/tokens/_index.scss
- [ ] T017 [P] Definir tema oscuro SafeAir con variables semanticas en src/styles/themes/_safeair-dark.scss
- [ ] T018 [P] Definir reset/base tipografico y utilidades globales en src/styles/base/_base.scss
- [ ] T019 Conectar capas SCSS globales en src/styles.scss

### Contratos y puertos de integracion (sin acoplar UI)

- [ ] T020 Definir contrato de cliente API abstracto en src/app/core/contracts/api-client.port.ts
- [ ] T021 [P] Definir contrato de broker abstracto en src/app/core/contracts/broker-client.port.ts
- [ ] T022 [P] Definir envelope tipado de mensajeria en src/app/core/contracts/message-envelope.model.ts
- [ ] T023 Configurar estrategia de entorno mock/api para auth en src/app/core/config/auth-data-source.token.ts

### Base compartida de formularios y validacion

- [ ] T024 Crear utilidades de validacion reutilizables de auth en src/app/shared/validators/auth-form.validators.ts
- [ ] T025 [P] Crear directivas/utilidades de foco accesible compartidas en src/app/shared/utils/a11y-focus.utils.ts

### Componentes shared reutilizables (standalone, base para US1 y US2)

- [ ] T026 [P] Crear componente auth shell como standalone en src/app/shared/ui/page-shell/auth-shell.component.ts
- [ ] T027 [P] Crear componente auth card como standalone en src/app/shared/ui/auth-card/auth-card.component.ts
- [ ] T028 [P] Crear componente form input como standalone en src/app/shared/ui/form-input/form-input.component.ts
- [ ] T029 [P] Crear componente password input como standalone en src/app/shared/ui/form-input/password-input.component.ts
- [ ] T030 [P] Crear componente primary button como standalone en src/app/shared/ui/form-button/primary-button.component.ts
- [ ] T031 [P] Crear componente auth link como standalone en src/app/shared/ui/form-button/auth-link.component.ts

**Checkpoint**: Fundacion lista para implementar historias en secuencia o en paralelo

---

## Phase 3: User Story 1 - Login visual funcional con mock (Priority: P1) MVP

**Goal**: Entregar pantalla de login fiel a Figma, validada y conectada a mock tipado

**Independent Test**: Acceder a `/auth/login`, validar estados del formulario y autenticar en escenario mock exitoso/error

### Models y contratos (US1)

- [ ] T032 [P] [US1] Crear modelo AuthCredentials en src/app/features/auth/domain/models/auth-credentials.model.ts
- [ ] T033 [P] [US1] Crear modelo AuthSession en src/app/features/auth/domain/models/auth-session.model.ts
- [ ] T034 [P] [US1] Crear modelo AuthError en src/app/features/auth/domain/models/auth-error.model.ts
- [ ] T035 [US1] Definir puerto AuthRepositoryPort (login/register) en src/app/features/auth/domain/ports/auth-repository.port.ts
- [ ] T036 [P] [US1] Crear DTO LoginRequestDto en src/app/features/auth/data/dto/login-request.dto.ts
- [ ] T037 [P] [US1] Crear DTO LoginResponseDto en src/app/features/auth/data/dto/login-response.dto.ts
- [ ] T038 [US1] Implementar mapper login DTO <-> dominio en src/app/features/auth/data/mappers/auth-login.mapper.ts

### Mocks y logica de aplicacion (US1)

- [ ] T039 [US1] Implementar AuthMockRepositoryAdapter con escenarios exito/error en src/app/features/auth/data/adapters/auth-mock-repository.adapter.ts
- [ ] T040 [US1] Implementar AuthUseCase para login en src/app/features/auth/domain/use-cases/login.use-case.ts
- [ ] T041 [US1] Implementar AuthFacade y estado de vista de login en src/app/features/auth/application/facades/auth.facade.ts

### UI reutilizable y layout (US1)

- [ ] T042 [US1] Crear auth header de identidad SafeAir como standalone en src/app/features/auth/components/auth-header/auth-header.component.ts
- [ ] T043 [US1] Crear login form component como standalone (reactive form + validaciones) en src/app/features/auth/components/login-form/login-form.component.ts
- [ ] T044 [US1] Crear login page como standalone y composicion visual final en src/app/features/auth/pages/login-page/login-page.component.ts
- [ ] T045 [US1] Definir estilos SCSS de login (tema oscuro, jerarquia, espaciado Figma) en src/app/features/auth/pages/login-page/login-page.component.scss

### Navegacion y pruebas minimas (US1)

- [ ] T046 [US1] Conectar componente real de login al placeholder de ruta en src/app/features/auth/auth.routes.ts
- [ ] T047 [US1] Crear prueba unitaria de validadores de login con Vitest en tests/unit/auth/login.validators.spec.ts
- [ ] T048 [US1] Crear prueba de componente login con Vitest/ATL en tests/component/auth/login-form.component.spec.ts
- [ ] T049 [US1] Crear smoke test e2e de login con Playwright en tests/e2e/auth/login-smoke.spec.ts
- [ ] T050 [US1] Ejecutar checklist minimo de accesibilidad de login (teclado/foco/labels) en tests/accessibility/auth-login-a11y.md
- [ ] T051 [US1] Ejecutar verificacion responsive minima de login (mobile/tablet/desktop) en tests/visual/auth-login-responsive.md

**Checkpoint**: US1 funcional y validable de forma independiente (MVP)

---

## Phase 4: User Story 2 - Register visual/future-ready (Priority: P2)

**Goal**: Entregar pantalla register consistente, navegable y preparada para futura integracion real

**Independent Test**: Navegar login -> register -> login, validar formulario y mensaje future-ready cuando no exista endpoint real

### Models y contratos (US2)

- [ ] T052 [P] [US2] Crear modelo RegisterDraft en src/app/features/auth/domain/models/register-draft.model.ts
- [ ] T053 [P] [US2] Crear DTO RegisterRequestDto en src/app/features/auth/data/dto/register-request.dto.ts
- [ ] T054 [P] [US2] Crear DTO RegisterResponseDto en src/app/features/auth/data/dto/register-response.dto.ts
- [ ] T055 [US2] Implementar mapper register DTO <-> dominio en src/app/features/auth/data/mappers/auth-register.mapper.ts

### Mocks y logica de register (US2)

- [ ] T056 [US2] Extender AuthMockRepositoryAdapter para flujo register future-ready en src/app/features/auth/data/adapters/auth-mock-repository.adapter.ts
- [ ] T057 [US2] Implementar AuthUseCase para register con fallback visual en src/app/features/auth/domain/use-cases/register.use-case.ts
- [ ] T058 [US2] Extender AuthFacade con estado y mensajes de register en src/app/features/auth/application/facades/auth.facade.ts

### UI register y navegacion (US2)

- [ ] T059 [US2] Crear register form component como standalone (reactive form + validaciones) en src/app/features/auth/components/register-form/register-form.component.ts
- [ ] T060 [US2] Crear register page como standalone y composicion visual final en src/app/features/auth/pages/register-page/register-page.component.ts
- [ ] T061 [US2] Definir estilos SCSS de register con coherencia Figma en src/app/features/auth/pages/register-page/register-page.component.scss
- [ ] T062 [US2] Conectar componente real de register al placeholder de ruta en src/app/features/auth/auth.routes.ts
- [ ] T063 [US2] Implementar navegacion bidireccional login/register accesible como standalone en src/app/features/auth/components/auth-navigation/auth-navigation.component.ts

### Pruebas minimas (US2)

- [ ] T064 [US2] Crear prueba unitaria de validaciones de register con Vitest en tests/unit/auth/register.validators.spec.ts
- [ ] T065 [US2] Crear prueba de componente register con Vitest/ATL en tests/component/auth/register-form.component.spec.ts
- [ ] T066 [US2] Crear smoke test e2e de navegacion login/register con Playwright en tests/e2e/auth/register-navigation.spec.ts
- [ ] T067 [US2] Ejecutar checklist minimo de accesibilidad de register (teclado/foco/labels) en tests/accessibility/auth-register-a11y.md
- [ ] T068 [US2] Ejecutar verificacion responsive minima de register (mobile/tablet/desktop) en tests/visual/auth-register-responsive.md

**Checkpoint**: US2 funcional visualmente y validable sin depender de backend real

---

## Phase 5: User Story 3 - Reutilizacion para futuras pantallas (Priority: P3)

**Goal**: Consolidar base reusable de auth para acelerar nuevas pantallas del dashboard

**Independent Test**: Crear una vista demo adicional reutilizando componentes auth sin duplicar estructura ni estilos clave

### Reutilizacion y extensibilidad (US3)

- [ ] T069 [US3] Crear vista demo de reutilizacion de auth shell/card en src/app/features/auth/pages/auth-pattern-demo/auth-pattern-demo.component.ts
- [ ] T070 [US3] Extraer variantes reutilizables de estado para inputs/botones en src/app/shared/ui/form-input/form-input.variants.ts
- [ ] T071 [US3] Definir contratos de presentacion AuthViewState para pantallas futuras en src/app/features/auth/application/view-models/auth-view-state.model.ts
- [ ] T072 [US3] Documentar guia de composicion reusable de auth en src/app/features/auth/README.md

### Preparacion para API y broker (US3)

- [ ] T073 [US3] Crear AuthApiRepositoryAdapter placeholder (sin consumo real) en src/app/features/auth/data/adapters/auth-api-repository.adapter.ts
- [ ] T074 [US3] Crear AuthBrokerAdapter placeholder para pub/sub desacoplado en src/app/features/auth/data/adapters/auth-broker.adapter.ts
- [ ] T075 [US3] Definir factory de seleccion mock/api por entorno en src/app/features/auth/data/adapters/auth-repository.factory.ts
- [ ] T076 [US3] Definir eventos auth.login.attempted y auth.session.invalidated tipados en src/app/features/auth/domain/models/auth-events.model.ts

### Contract testing de fronteras (US3)

- [ ] T077 [US3] Crear contract test de frontera API auth (login/register simulado) alineado a specs/001-auth-ui-foundation/contracts/auth-api-contract.md en tests/contract/auth/auth-api.contract.spec.ts
- [ ] T078 [US3] Crear contract test de frontera broker auth (envelope + eventos) alineado a specs/001-auth-ui-foundation/contracts/auth-broker-contract.md en tests/contract/auth/auth-broker.contract.spec.ts

### Pruebas minimas (US3)

- [ ] T079 [US3] Crear prueba unitaria de factory mock/api con Vitest en tests/unit/auth/auth-repository.factory.spec.ts
- [ ] T080 [US3] Crear prueba unitaria de mapeo de eventos de broker con Vitest en tests/unit/auth/auth-events.spec.ts

**Checkpoint**: US3 demuestra reutilizacion real y preparacion para integracion futura sin acoplar UI

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Cierre transversal de estilos, responsive, accesibilidad y validacion visual

- [ ] T081 Ajustar estados visuales globales de inputs (focus/error/disabled) en src/styles/utilities/_form-states.scss
- [ ] T082 [P] Ajustar estados visuales globales de botones (hover/loading/disabled) en src/styles/utilities/_button-states.scss
- [ ] T083 [P] Afinar breakpoints y layout responsive auth en src/styles/utilities/_responsive-auth.scss
- [ ] T084 Ejecutar checklist consolidado de accesibilidad auth y registrar hallazgos en tests/accessibility/auth-a11y-checklist.md
- [ ] T085 Ejecutar validacion visual contra mockups y registrar diff en tests/visual/auth-figma-parity.md
- [ ] T086 Ejecutar validacion quickstart end-to-end y registrar resultado en specs/001-auth-ui-foundation/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: inicia inmediatamente
- **Phase 2 (Foundational)**: depende de Phase 1 y bloquea historias
- **Phase 3 (US1)**: depende de Phase 2
- **Phase 4 (US2)**: depende de Phase 2 (componentes shared movidos a foundational)
- **Phase 5 (US3)**: depende de Phase 2 y del dominio/base de auth entregado en US1-US2
- **Phase 6 (Polish)**: depende de historias objetivo completadas

### User Story Dependencies

- **US1 (P1)**: base MVP, independiente tras fundacion
- **US2 (P2)**: independiente tras fundacion porque reutiliza componentes shared ya construidos en Phase 2
- **US3 (P3)**: depende de modelos/servicios previos para consolidar reutilizacion y frontera de integracion

### Within Each User Story

- Modelos/DTOs antes de facade/use-cases
- Facade/use-cases antes de composicion de pagina
- UI base antes de estilos finos por pantalla
- Pruebas minimas al cerrar cada historia

### Parallel Opportunities

- En **Phase 1**: T003-T004, T009-T010 en paralelo
- En **Phase 2**: T013-T015, T017-T018, T021-T022, T026-T031 en paralelo
- En **US1**: T032-T034 y T036-T037 en paralelo
- En **US2**: T052-T054 en paralelo
- En **Polish**: T082-T083 en paralelo

---

## Parallel Example: User Story 1

```bash
# Modelos y DTOs en paralelo
Task: "Create AuthCredentials model in src/app/features/auth/domain/models/auth-credentials.model.ts"
Task: "Create AuthSession model in src/app/features/auth/domain/models/auth-session.model.ts"
Task: "Create LoginRequestDto in src/app/features/auth/data/dto/login-request.dto.ts"
Task: "Create LoginResponseDto in src/app/features/auth/data/dto/login-response.dto.ts"

# UI base reusable en paralelo
Task: "Create auth shell in src/app/shared/ui/page-shell/auth-shell.component.ts"
Task: "Create auth card in src/app/shared/ui/auth-card/auth-card.component.ts"
Task: "Create form input in src/app/shared/ui/form-input/form-input.component.ts"
Task: "Create primary button in src/app/shared/ui/form-button/primary-button.component.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Completar Phase 1 + Phase 2
2. Implementar totalmente Phase 3 (US1)
3. Validar visual y funcionalmente `/auth/login`
4. Verificar checklist minimo a11y/responsive de US1 antes de avanzar

### Incremental Delivery

1. Base tecnica (Setup + Foundational)
2. Login (US1) como primer incremento deployable
3. Register visual future-ready (US2)
4. Reutilizacion y preparacion API/broker (US3)
5. Cierre transversal (Polish)

### Criterios minimos de salida por historia

- **US1**: login funcional mock, validaciones, estados visuales, prueba componente + smoke
- **US2**: register visual coherente, navegacion bidireccional, mensaje future-ready, prueba componente + smoke
- **US3**: componentes reutilizables consolidados, placeholders API/broker, contract tests de frontera y pruebas unitarias de factory/eventos

---

## Notes

- No se permite acoplar UI a emuladores.
- Integraciones externas deben pasar por puertos/adapters tipados.
- Mantener fidelidad visual con mockups en jerarquia, espaciado y tema oscuro.
- Cada tarea esta disenada para ser ejecutable por Copilot sin mezclar responsabilidades grandes.
