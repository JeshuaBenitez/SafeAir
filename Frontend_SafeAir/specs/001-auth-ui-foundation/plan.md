# Implementation Plan: Auth UI Foundation

**Branch**: `001-auth-ui-foundation` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-auth-ui-foundation/spec.md`

## Summary

Implementar la base visual y estructural del modulo de autenticacion de SafeAir con Angular standalone components, TypeScript estricto y SCSS, asegurando alta fidelidad con los mockups de referencia (login y register en estilo oscuro con identidad visual SafeAir).

El alcance cubre pantalla de login funcional sobre servicio mock, pantalla de register como propuesta visual preparada para futura activacion, layout compartido de autenticacion, componentes reutilizables de formulario y navegacion entre pantallas.

La implementacion separa UI, logica de presentacion y acceso a datos para permitir reemplazar mocks por integracion real con API y/o broker sin reescritura de componentes visuales.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), HTML5, SCSS  
**Primary Dependencies**: Angular 19.x (standalone APIs, router, reactive forms), RxJS, Angular CDK (a11y utilities)  
**Storage**: N/A para esta fase (sin persistencia productiva; solo datos simulados en memoria)  
**Testing**: Vitest para unit y component tests (Angular Testing Library), Playwright para smoke e2e visual de rutas auth  
**Target Platform**: Web moderna (Chrome/Edge/Firefox/Safari), responsive mobile/tablet/desktop
**Project Type**: Frontend web app (Angular SPA)  
**Performance Goals**: Primera carga de pantallas auth < 2.5s en red estandar; interacciones de formulario < 100ms percibidos  
**Constraints**: No acoplar UI a emuladores; integrar solo via puertos para API/broker; alta fidelidad visual con mockups Figma; accesibilidad base WCAG AA  
**Scale/Scope**: 2 pantallas auth iniciales + base reusable para futuras pantallas de dashboard

## Visual Implementation Notes (Figma Fidelity)

- Tema oscuro como baseline visual con contraste alto entre fondo, superficie y acentos.
- Tarjeta central de autenticacion con radio amplio, elevacion suave y separacion clara del fondo.
- Jerarquia tipografica: titulo prominente, subtitulo de apoyo, labels legibles y acciones secundarias discretas.
- Campos con iconografia contextual (correo, candado, visibilidad), estados hover/focus/error y tamano tactil adecuado.
- CTA principal en color acento turquesa con alto contraste, peso visual fuerte y estado disabled/loading consistente.
- Layout responsive centrado: desktop con card contenida, mobile con margenes seguros y stack vertical natural.
- Header y footer discretos para reforzar identidad SafeAir sin competir con el formulario.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Gate 1 - Clean Architecture**: PASS
  - Se define separacion UI -> presentacion -> infraestructura por puertos.
- **Gate 2 - Feature-First + Standalone**: PASS
  - `auth` se implementa como feature con componentes standalone y shared UI.
- **Gate 3 - Strict Typing / Contracts**: PASS
  - Modelos y contratos de auth tipados (sin `any`).
- **Gate 4 - Integration Boundary (API/Broker only)**: PASS
  - Mock adapters respetan contratos de API/broker y no exponen detalles de emuladores.
- **Gate 5 - Visual Fidelity + A11y + Responsive**: PASS
  - Plan incorpora tokens, estados visuales, accesibilidad de formularios y criterios responsive.

Re-check post diseno (Phase 1): PASS sin excepciones.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-ui-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api-contract.md
│   └── auth-broker-contract.md
└── tasks.md
```

### Source Code (repository root)
```text
src/
├── app/
│   ├── core/
│   │   ├── config/
│   │   ├── contracts/
│   │   ├── messaging/
│   │   ├── api/
│   │   └── state/
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── form-input/
│   │   │   ├── form-button/
│   │   │   ├── auth-card/
│   │   │   └── page-shell/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── types/
│   ├── features/
│   │   └── auth/
│   │       ├── pages/
│   │       │   ├── login-page/
│   │       │   └── register-page/
│   │       ├── components/
│   │       │   ├── login-form/
│   │       │   ├── register-form/
│   │       │   └── auth-header/
│   │       ├── domain/
│   │       │   ├── models/
│   │       │   ├── ports/
│   │       │   └── use-cases/
│   │       ├── data/
│   │       │   ├── adapters/
│   │       │   ├── dto/
│   │       │   └── mappers/
│   │       ├── application/
│   │       │   ├── facades/
│   │       │   └── view-models/
│   │       └── auth.routes.ts
│   ├── app.routes.ts
│   └── app.config.ts
├── assets/
│   ├── icons/
│   └── images/
└── styles/
    ├── tokens/
    ├── themes/
    ├── base/
    └── utilities/

tests/
├── unit/
├── component/
└── e2e/
```

**Structure Decision**: Se adopta una SPA Angular con arquitectura por features y separacion `core/shared/features`; `auth` concentra su dominio y adapters para facilitar reemplazo de mocks por integracion real sin tocar UI.

## Modules, Features and Suggested Sections

- **Core**: configuracion global, contratos de integracion, cliente API abstracto, cliente broker abstracto, manejo central de errores.
- **Shared UI**: componentes visuales atomicos/reutilizables y utilidades comunes de formularios.
- **Feature Auth**: pages, forms, facade de presentacion, dominio tipado, adapters de datos (mock + futuro real).
- **Styles System**: tokens de diseno (color, spacing, radius, elevation, typography), temas y utilidades responsive.

## Base Components Needed

- `sa-auth-shell` (layout compartido: logo, card container, pie de pagina).
- `sa-auth-card` (superficie central con titulo/subtitulo/slot de formulario).
- `sa-form-input` (input con label, icono izquierdo, estado error, ayuda, slot derecho).
- `sa-password-input` (input password con toggle mostrar/ocultar).
- `sa-primary-button` (CTA principal con estados idle/loading/disabled).
- `sa-text-link` (acciones secundarias: recuperar contrasena, crear cuenta, volver).
- `sa-auth-header` (identidad visual SafeAir para auth pages).

## Services Needed

- `AuthFacade` (coordina eventos de UI y estado de vista).
- `AuthUseCase` (reglas de autenticacion a nivel dominio, sin dependencias de UI).
- `AuthRepositoryPort` (contrato para login/register).
- `AuthMockRepositoryAdapter` (implementacion actual con datos simulados).
- `AuthApiRepositoryAdapter` (placeholder para integracion futura por API).
- `AuthBrokerPort` + `AuthBrokerAdapter` (placeholder para eventos pub/sub cuando aplique).
- `AuthValidationService` (reglas de validacion reutilizables para formularios auth).

## Recommended TypeScript Models and Interfaces

- `AuthCredentials`
- `AuthSession`
- `AuthError`
- `RegisterDraft`
- `AuthViewState`
- `LoginRequestDto`, `LoginResponseDto`
- `RegisterRequestDto`, `RegisterResponseDto` (futuro)
- `AuthRepositoryPort` (metodos `login`, `register`)
- `MessageEnvelope<T>` para eventos de broker con metadata tipada

## Mock Strategy

- Mantener un `AuthMockRepositoryAdapter` con escenarios controlados: exito, credenciales invalidas, error temporal.
- Inyectar adapter por configuracion de entorno (`mock` vs `api`) para evitar cambios en componentes/presentacion.
- Asegurar que mocks respeten exactamente los contratos DTO y errores del puerto de autenticacion.
- Registrar en quickstart como alternar estrategia sin tocar pantallas.

## Routing Strategy

- Rutas de feature:
  - `/auth/login`
  - `/auth/register`
- Redireccion inicial a `/auth/login` en esta fase.
- Rutas de auth definidas en `auth.routes.ts` y cargadas en `app.routes.ts`.
- Navegacion entre login/register mediante enlaces semanticos y foco accesible al cambiar vista.

## Styling and Reuse Decisions

- SCSS modular por feature + sistema global de tokens.
- Variables de diseno para mantener consistencia con mockups: fondo oscuro, superficies, acento turquesa, tipografia, espaciados.
- Estados visuales estandarizados: default/hover/focus/error/disabled/loading.
- Reglas de responsive con breakpoints claros para card, paddings y tipografia.
- Composicion por componentes reutilizables para preparar expansion a dashboard sin duplicacion.

## Dependencies and Tools

- Angular CLI + Angular standalone APIs.
- Reactive Forms para validacion y manejo de estado de formularios.
- Angular CDK A11y para soporte de foco y navegacion.
- ESLint + Prettier con reglas strict de TypeScript.
- Stylelint opcional para disciplina SCSS.
- Storybook (recomendado) para validar componentes de formulario de forma aislada.
- Playwright para smoke tests visuales de rutas auth.

## Technical Risks and Mitigations

- **Riesgo**: Desviacion visual respecto a Figma.
  - **Mitigacion**: Tokens de diseno, checklist visual por pantalla y revisiones comparativas por estados.
- **Riesgo**: Acoplamiento de UI a mocks actuales.
  - **Mitigacion**: uso de puertos e inyeccion de adapters por entorno.
- **Riesgo**: Register no disponible en backend real.
  - **Mitigacion**: tratar register como visual-first/future-ready con mensajes de estado funcional.
- **Riesgo**: Regresiones de accesibilidad en iteraciones visuales.
  - **Mitigacion**: pruebas de teclado, focus ring obligatorio y validacion semantica en PR.
- **Riesgo**: Escalabilidad limitada para futuras pantallas del dashboard.
  - **Mitigacion**: consolidar shared UI y patron facade/view-model desde la primera feature.

## Incremental Implementation Strategy

1. **Fase A - Fundacion visual**
   - Implementar tokens, `sa-auth-shell` y `sa-auth-card`.
2. **Fase B - Login MVP visual funcional con mock**
   - Construir `login-form`, validaciones y `AuthMockRepositoryAdapter`.
3. **Fase C - Register visual future-ready**
   - Implementar `register-form`, navegacion y mensajes de disponibilidad futura.
4. **Fase D - Endurecimiento de arquitectura**
   - Introducir puertos, facade, mapeos DTO/modelo y placeholders API/broker.
5. **Fase E - Calidad transversal**
   - Pruebas unitarias/componentes, smoke e2e de rutas, validacion a11y y responsive.

## Complexity Tracking

Sin violaciones constitucionales en este plan.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
