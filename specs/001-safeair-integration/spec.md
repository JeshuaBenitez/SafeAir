# Especificación de Característica: Integración de Frontend-Backend SafeAir / Feature Specification: SafeAir Frontend-Backend Integration

**Rama de Característica / Feature Branch**: `001-safeair-integration`  
**Creado / Created**: 12 de mayo de 2026 / May 12, 2026  
**Estado / Status**: Draft  
**Entrada / Input**: Integrar componentes existentes Angular 19 + Node.js/Express, corregir contratos, conectar datos reales / Integrate existing Angular 19 + Node.js/Express components, fix contracts, connect real data

---

## Escenarios de Usuario & Pruebas / User Scenarios & Testing *(obligatorio / mandatory)*

### Historia de Usuario 1 - Autenticación End-to-End del Usuario / User Story 1 - End-to-End User Authentication (Prioridad / Priority: P1)

**Descripción / Description**: Un usuario puede iniciar sesión en SafeAir usando su correo electrónico y contraseña, recibir un token JWT válido y mantener sesión autenticada mientras navega por el panel de control. El flujo incluye: (1) envío de formulario de login desde Angular, (2) validación de contrato en backend, (3) persistencia de sesión en frontend, (4) acceso a endpoints protegidos.

A user can log in to SafeAir using email and password, receive a valid JWT token, and maintain an authenticated session while navigating the dashboard. The flow includes: (1) submit login form from Angular, (2) contract validation in backend, (3) session persistence in frontend, (4) access to protected endpoints.

**Por qué esta prioridad / Why this priority**: P1 porque sin autenticación funcional, ningún otro flujo de usuario es viable. Es el bloqueador de integración más crítico. / P1 because without working authentication, no other user flow is viable. It is the most critical integration blocker.

**Prueba Independiente / Independent Test**: Se puede probar completamente ejecutando: (1) cargar http://localhost:4200, (2) introducir `admin@safeair.local` / `12345678`, (3) verificar que el usuario aparece en navbar, (4) navegar a `/dashboard` sin ser rechazado. Valor: Usuario autenticado con sesión persistida en localStorage.

Can be tested completely by running: (1) load http://localhost:4200, (2) enter `admin@safeair.local` / `12345678`, (3) verify user appears in navbar, (4) navigate to `/dashboard` without being rejected. Value: Authenticated user with session persisted to localStorage.

**Escenarios de Aceptación / Acceptance Scenarios**:

1. **Dado / Given** que el usuario está en la página de login y el backend API está corriendo en puerto 3000, **Cuando / When** envía credenciales válidas (email: `admin@safeair.local`, password: `12345678`), **Entonces / Then** recibe token JWT con expiración válida + sesión se persiste en localStorage

2. **Dado / Given** que el usuario está autenticado con token almacenado en localStorage, **Cuando / When** recarga la página, **Entonces / Then** mantiene sesión sin necesidad de volver a login (token aún válido)

3. **Dado / Given** que el usuario intenta login con credenciales inválidas, **Cuando / When** envía formulario, **Entonces / Then** ve mensaje de error claro (ej., "Email o contraseña incorrectos") y permanece en página de login

4. **Dado / Given** que el usuario está autenticado, **Cuando / When** intenta acceder a endpoint protegido (`GET /api/v1/rooms`), **Entonces / Then** backend valida JWT en encabezado y retorna datos (no 401)

---

### Historia de Usuario 2 - Ver Métricas de Sala en Tiempo Real / User Story 2 - View Room Metrics in Real-Time (Prioridad / Priority: P2)

**Descripción / Description**: Después de autenticarse, el usuario ve un panel de control que muestra métricas ambientales en tiempo real (temperatura, humedad, CO2, PM2.5) de las salas activas. Los datos se obtienen del backend API en lugar de datos mock. La actualización es cada 2-3 segundos, reflejando cambios del emulador.

After authentication, user sees a dashboard displaying real-time environmental metrics (temperature, humidity, CO2, PM2.5) from active rooms. Data fetches from backend API instead of mock data. Updates every 2-3 seconds reflecting emulator changes.

**Por qué esta prioridad / Why this priority**: P2 porque la autenticación debe estar completa primero. Pero es crítico para el valor de usuario: mostrar datos en vivo es el propósito principal de SafeAir. / P2 because authentication must be complete first. But it is critical for user value: displaying live data is SafeAir's main purpose.

**Prueba Independiente / Independent Test**: Se puede probar: (1) autenticarse, (2) emulador publica telemetría MQTT, (3) verificar que dashboard muestra métricas actualizadas dentro de 5 segundos. Valor: Usuario ve datos reales, no sintéticos.

Can be tested by: (1) authenticate, (2) emulator publishes MQTT telemetry, (3) verify dashboard shows updated metrics within 5 seconds. Value: User sees real data, not synthetic.

**Escenarios de Aceptación / Acceptance Scenarios**:

1. **Dado / Given** que el usuario está autenticado y en la página del dashboard, **Cuando / When** carga la página, **Entonces / Then** llama a `GET /api/v1/rooms` y muestra lista de salas disponibles

2. **Dado / Given** que el dashboard está cargado para una sala específica, **Cuando / When** el emulador publica medición (MQTT o HTTP), **Entonces / Then** dashboard llama a `GET /api/v1/rooms/{id}/metrics/current` y muestra nuevo valor dentro de 5 segundos

3. **Dado / Given** que la API no es accesible o retorna 503, **Cuando / When** el usuario está en dashboard, **Entonces / Then** ve fallback de mensaje amigable (ej., "Sin conexión a datos en vivo, cargando datos locales") y muestra último valor conocido

4. **Dado / Given** que hay múltiples salas registradas, **Cuando / When** el usuario visualiza el dashboard, **Entonces / Then** ve todas las salas en un panel tipo grid o lista, cada una con sus métricas actuales

---

### Historia de Usuario 3 - Prueba de Carga Concurrente (2-3 Usuarios) / User Story 3 - Concurrent Load Testing (2-3 Users) (Prioridad / Priority: P2)

**Descripción / Description**: El sistema debe manejar 2-3 clientes frontend conectándose simultáneamente, cada uno autenticándose, visualizando dashboard y haciendo polling de métricas. El backend mantiene todas las conexiones activas sin agotamiento de pool, sin mensajes perdidos, sin errores de timeout.

System must handle 2-3 frontend clients connecting simultaneously, each authenticating, viewing dashboard and polling metrics. Backend maintains all connections active without pool exhaustion, without lost messages, without timeout errors.

**Por qué esta prioridad / Why this priority**: P2 porque valida que la arquitectura cumple con el requisito de diseño de 2-3 clientes concurrentes. Bloqueador para decir "integración completa". / P2 because it validates that architecture meets the design requirement of 2-3 concurrent clients. Blocker for saying "integration complete".

**Prueba Independiente / Independent Test**: Ejecutar Playwright con 2 tabs simultáneas cada una haciendo login + polling dashboard durante 2 minutos. Verificar cero errores de conexión, pool de BD no agotado, mensajes MQTT entregados. Valor: Confianza de que sistema escala a múltiples usuarios.

Run Playwright with 2 simultaneous tabs each doing login + polling dashboard for 2 minutes. Verify zero connection errors, DB pool not exhausted, MQTT messages delivered. Value: Confidence system scales to multiple users.

**Escenarios de Aceptación / Acceptance Scenarios**:

1. **Dado / Given** que hay 3 navegadores abiertos simultáneamente en http://localhost:4200, **Cuando / When** cada uno inicia login con credenciales diferentes, **Entonces / Then** todos 3 autentican exitosamente sin errores 429 (rate limit) o 503 (server overload)

2. **Dado / Given** que 2 usuarios están autenticados y viendo dashboard en paralelo, **Cuando / When** cada uno hace polling de métricas cada 2 segundos durante 1 minuto, **Entonces / Then** ninguno pierde conexión y ambos ven datos actualizados

3. **Dado / Given** que el sistema maneja 2-3 clientes concurrentes, **Cuando / When** se monitorea pool de conexiones PostgreSQL, **Entonces / Then** pool no excede max size configurado (10) y conexiones se liberan correctamente

---

### Casos Límite / Edge Cases

- **¿Qué sucede cuando el backend está caído?** / **What happens when backend is down?** → Frontend intenta conexión, recibe timeout (5s), muestra error amigable, ofrece reintentar. No bloquea UI.

- **¿Qué sucede cuando hay token JWT expirado?** / **What happens when JWT token expires?** → API retorna 401, frontend intercepta, redirige a login, limpia localStorage. Usuario debe re-autenticarse.

- **¿Qué sucede cuando un emulador envía medición malformada?** / **What happens when emulator sends malformed telemetry?** → Backend valida con Zod schema, rechaza con 422, registra error. No afecta otros emuladores.

- **¿Qué sucede con conexión MQTT lenta?** / **What happens with slow MQTT connection?** → Mensajes se acumulan en cola, backend procesa en orden, dashboard muestra datos ligeramente atrasados pero consistentes. Sin pérdida de datos.

- **¿Qué sucede cuando 2 navegadores comparten la misma máquina pero piden login simultáneamente?** / **What happens when 2 browsers on same machine request login simultaneously?** → Cada recibe token JWT independiente, sesiones no interfieren, ambas válidas simultáneamente.

---

## Requisitos / Requirements *(obligatorio / mandatory)*

### Requisitos Funcionales / Functional Requirements

**Capa de Autenticación / Authentication Layer**:
- **FR-001**: Frontend DEBE implementar `HttpClientAdapter` que centraliza todas las llamadas HTTP, incluyendo interceptor para agregar encabezado `Authorization: Bearer {token}` / Frontend MUST implement `HttpClientAdapter` that centralizes all HTTP calls, including interceptor to add `Authorization: Bearer {token}` header

- **FR-002**: Frontend DEBE enviar credenciales al endpoint backend `POST /api/v1/auth/login` con campo `email` (NO `identifier`) alineado con DTO backend / Frontend MUST send credentials to backend endpoint `POST /api/v1/auth/login` with field `email` (NOT `identifier`) aligned with backend DTO

- **FR-003**: Backend DEBE validar credenciales con esquema Zod: { email: string válido, password: string min 6 chars }, rechazar con 401 si no coinciden / Backend MUST validate credentials with Zod schema: { email: valid string, password: string min 6 chars }, reject with 401 if no match

- **FR-004**: Frontend DEBE persistir JWT en localStorage con clave `auth:token` tras login exitoso, incluyendo expiración (`expiresAt`) / Frontend MUST persist JWT in localStorage with key `auth:token` after successful login, including expiration (`expiresAt`)

- **FR-005**: Frontend DEBE limpiar localStorage e ir a página de login cuando recibe 401 Unauthorized de cualquier endpoint protegido / Frontend MUST clear localStorage and redirect to login page when receiving 401 Unauthorized from any protected endpoint

- **FR-006**: Frontend DEBE cargar credenciales de localStorage al iniciar app, restaurar sesión si token aún es válido (expiración no pasada) / Frontend MUST load credentials from localStorage on app startup, restore session if token still valid (expiration not passed)

**Capa de Integración de Datos / Data Integration Layer**:
- **FR-007**: Frontend DEBE reemplazar `DashboardEnvironmentMockService` con llamadas reales a `GET /api/v1/rooms` y `GET /api/v1/rooms/{id}/metrics/current` / Frontend MUST replace `DashboardEnvironmentMockService` with real calls to `GET /api/v1/rooms` and `GET /api/v1/rooms/{id}/metrics/current`

- **FR-008**: Frontend DEBE hacer polling de métricas cada 2-3 segundos usando HttpClientAdapter, mantener actualización de datos en tiempo real en dashboard / Frontend MUST poll metrics every 2-3 seconds using HttpClientAdapter, maintain real-time data refresh in dashboard

- **FR-009**: Backend DEBE exponir endpoint `GET /api/v1/rooms/{id}/metrics/current` que retorna medición más reciente: { temperature, humidity, co2, pm25, measuredAt, receivedAt } / Backend MUST expose endpoint `GET /api/v1/rooms/{id}/metrics/current` returning latest measurement: { temperature, humidity, co2, pm25, measuredAt, receivedAt }

- **FR-010**: Backend DEBE implementar protección JWT en endpoints `/api/v1/rooms*` — rechazar sin token válido en encabezado `Authorization` / Backend MUST implement JWT protection on endpoints `/api/v1/rooms*` — reject without valid token in `Authorization` header

**Capa de Configuración / Configuration Layer**:
- **FR-011**: Frontend DEBE tener configuración centralizada de `API_BASE_URL` (ambiente-específica: desarrollo = `http://localhost:3000`, producción = configurable) / Frontend MUST have centralized `API_BASE_URL` configuration (environment-specific: dev = `http://localhost:3000`, production = configurable)

- **FR-012**: Backend DEBE tener variables de entorno para DB_HOST, DB_PORT, JWT_SECRET, TELEMETRY_API_KEY, MQTT_BROKER_URL — documentadas en .env.example / Backend MUST have environment variables for DB_HOST, DB_PORT, JWT_SECRET, TELEMETRY_API_KEY, MQTT_BROKER_URL — documented in .env.example

**Capa de Instalación & Documentación / Installation & Documentation Layer**:
- **FR-013**: Proyecto DEBE incluir `README.md` bilingual (español/inglés) documentando: (1) instalación paso-a-paso para 3 laptops, (2) comandos de inicio, (3) verificación de salud, (4) solución de problemas / Project MUST include bilingual `README.md` (Spanish/English) documenting: (1) step-by-step installation for 3 laptops, (2) startup commands, (3) health verification, (4) troubleshooting

- **FR-014**: Cada servicio (Frontend, Backend, Base de Datos) DEBE tener script de verificación de salud: `npm run health` o equivalente que confirma conectividad / Each service (Frontend, Backend, Database) MUST have health check script: `npm run health` or equivalent that confirms connectivity

---

### Entidades Clave / Key Entities *(incluidas porque la característica involucra datos / included because feature involves data)*

- **Usuario / User**: `{ userId, email, firstName, lastName, accessToken, tokenType, expiresAt }` — almacenado en backend PostgreSQL + localStorage en frontend (solo token + expiry)
  
- **Sala / Room**: `{ roomId, name, location, description, devices: Device[] }` — en backend PostgreSQL, listado en frontend después de autenticación
  
- **Medición / Measurement**: `{ measurementId, roomId, temperature, humidity, co2, pm25, measuredAt (timestamp emulador), receivedAt (timestamp ingesta), status }` — capturado por backend desde emulador, expuesto en API, mostrado en dashboard frontend
  
- **Sesión Autenticada / Authenticated Session**: Información de usuario + token JWT en localStorage — permite operaciones autenticadas sin re-login si token válido
  
- **Respuesta de Error / Error Response**: Contrato estándar `{ ok: false, error: { code, message } }` en todas las respuestas API — permite manejo consistente en frontend

---

## Criterios de Éxito / Success Criteria *(obligatorio / mandatory)*

Estos criterios son medibles, agnósticos de tecnología, y verificables sin conocer detalles de implementación.

These criteria are measurable, technology-agnostic, and verifiable without knowing implementation details.

### Integración de Autenticación / Authentication Integration
- **SC-001**: Usuario puede autenticarse completando login en < 2 segundos (red local) y permanece autenticado durante 24 horas o hasta logout / User can authenticate completing login in < 2 seconds (local network) and remains authenticated for 24 hours or until logout
- **SC-002**: Intentos de login fallidos muestran mensaje de error dentro de 2 segundos, usuario puede reintentar sin refrescar página / Failed login attempts show error message within 2 seconds, user can retry without page refresh
- **SC-003**: Sesión se persiste durante recarga de navegador — usuario no necesita volver a login si sesión aún válida / Session persists during browser reload — user doesn't need to login again if session still valid

### Integración de Datos de Métricas / Metrics Data Integration
- **SC-004**: Dashboard muestra métricas reales del emulador dentro de 5 segundos de que emulador publica telemetría / Dashboard shows real emulator metrics within 5 seconds of emulator publishing telemetry
- **SC-005**: Dashboard actualiza valores cada 2-3 segundos sin saltos discontinuos — transiciones suaves de valores / Dashboard updates values every 2-3 seconds without discontinuous jumps — smooth value transitions
- **SC-006**: Dashboard soporta visualización de 2-5 salas simultáneamente sin degradación visible de performance / Dashboard supports viewing 2-5 rooms simultaneously without visible performance degradation
- **SC-007**: Si API no es accesible, dashboard muestra mensaje claro y último valor conocido (no bloquea UI) / If API is not accessible, dashboard shows clear message and last known value (doesn't block UI)

### Tolerancia a Carga Concurrente / Concurrent Load Tolerance
- **SC-008**: Sistema mantiene 2-3 clientes frontend autenticados + activos simultáneamente sin errores de timeout, 503, o pérdida de conexión / System maintains 2-3 concurrent authenticated + active frontend clients without timeout, 503, or connection loss errors
- **SC-009**: Base de datos maneja 2-3 clientes × 10 consultas/min = 30 consultas/min con latencia < 200ms por consulta (red local) / Database handles 2-3 clients × 10 queries/min = 30 queries/min with latency < 200ms per query (local network)
- **SC-010**: Pool de conexiones PostgreSQL no se agota durante carga de 2-3 clientes — máximo 5-6 conexiones activas observadas / PostgreSQL connection pool doesn't exhaust during 2-3 client load — max 5-6 active connections observed

### Instalación & Verificación / Installation & Verification
- **SC-011**: README.md guía usuario a través de instalación completa para 3 laptops en < 30 minutos si sigue pasos exactamente / README.md guides user through complete 3-laptop installation in < 30 minutes if steps followed exactly
- **SC-012**: Cada servicio (Frontend 4200, Backend 3000, Database 6543) es verificable con comando de salud único — usuario sabe inmediatamente si está listo o qué falla / Each service (Frontend 4200, Backend 3000, Database 6543) is verifiable with single health command — user knows immediately if ready or what fails

---

## Restricciones y Suposiciones / Constraints & Assumptions

### Restricciones de Arquitectura / Architecture Constraints
- **C-001**: NO crear nueva aplicación — reutilizar componentes Angular 19 y estructuras backend Node.js/Express existentes / DO NOT create new application — reuse existing Angular 19 components and Node.js/Express backend structures
- **C-002**: Mantener flujo de 3 laptops locales — Frontend en laptop 1, Backend en laptop 2, Base de datos en laptop 3 (si lo desea el usuario; también puede estar en misma máquina para dev rápido) / Maintain 3-laptop local flow — Frontend on laptop 1, Backend on laptop 2, Database on laptop 3 (if user desires; can also be same machine for quick dev)
- **C-003**: CORS debe estar abierto en desarrollo para permitir Frontend localhost:4200 → Backend localhost:3000 / CORS must be open in development to allow Frontend localhost:4200 → Backend localhost:3000
- **C-004**: JWT debe almacenarse en localStorage frontend — no cookies (permite multi-tab, facilita debugging) / JWT must be stored in localStorage frontend — not cookies (allows multi-tab, eases debugging)
- **C-005**: Base de datos debe permanecer como PostgreSQL 16 en Docker Compose — no cambiar ORM o tipo de BD / Database must remain PostgreSQL 16 in Docker Compose — don't change ORM or database type

### Restricciones de Dependencias Externas / External Dependency Constraints
- **C-006**: MQTT broker (EMQX) debe estar accesible en localhost:1883 para que backend reciba telemetría de emuladores / MQTT broker (EMQX) must be accessible at localhost:1883 for backend to receive emulator telemetry
- **C-007**: Node.js 18.x mínimo requerido, npm 9.x o yarn para gestión de dependencias / Node.js 18.x minimum required, npm 9.x or yarn for dependency management
- **C-008**: Navegador moderno con soporte para ES2020, localStorage, HttpClient (todos los navegadores comunes: Chrome, Firefox, Safari, Edge) / Modern browser with ES2020, localStorage, HttpClient support (all common browsers: Chrome, Firefox, Safari, Edge)

### Suposiciones de Comportamiento / Behavioral Assumptions
- **A-001**: Emulador publica telemetría cada 2-5 segundos (frecuencia realista para sensor ambiental) / Emulator publishes telemetry every 2-5 seconds (realistic for environmental sensor)
- **A-002**: Latencia de red local es < 50ms entre cualquier 2 laptops (ethernet o WiFi decente) / Local network latency is < 50ms between any 2 laptops (ethernet or decent WiFi)
- **A-003**: Usuario toma 1-2 minutos para completar login después de ven formulario (no requisito de respuesta ultra-rápida < 500ms) / User takes 1-2 minutes to complete login after seeing form (not ultra-fast < 500ms response requirement)
- **A-004**: Usuarios confían en guardar credenciales en navegador (no es requisito de ultra-seguridad para ambiente de desarrollo local) / Users trust saving credentials in browser (not ultra-security requirement for local dev environment)
- **A-005**: No hay requisito de offline-first — aplicación requiere conexión a internet para funcionar / No offline-first requirement — application requires internet connection to work
- **A-006**: Los 3 laptops están en misma red local o pueden resolverse por localhost (no hay requisito de comunicación remota entre países) / The 3 laptops are on same local network or can resolve by localhost (no requirement for cross-country remote communication)

---

## Cambios de Contrato & Alineación / Contract Changes & Alignment

### Alineación Requerida: DTO de Login / Required Alignment: Login DTO

**Frontend Actual / Current Frontend**:
```typescript
LoginRequestDto { identifier, password }
```

**Backend Actual / Current Backend**:
```typescript
loginSchema { email, password }
```

**Decisión / Decision**: Frontend DEBE cambiar a usar `email` en lugar de `identifier` para alinearse con backend. O backend acepta ambos (compatibilidad hacia atrás). Recomendación: **Opción 1** — Frontend cambia a `email` (más simple, una sola fuente de verdad).

Frontend MUST change to use `email` instead of `identifier` to align with backend. Or backend accepts both (backward compat). Recommendation: **Option 1** — Frontend changes to `email` (simpler, single source of truth).

**Impacto / Impact**: Cambio de variable en 2-3 archivos frontend: `login-form.component.ts`, `login-request.dto.ts`, mock adapter. SIN cambios en componentes UI (formulario ya tiene campos correctos).

Variable change in 2-3 frontend files: `login-form.component.ts`, `login-request.dto.ts`, mock adapter. NO UI component changes (form already has correct fields).

---

## Dependencias & Prerrequisitos / Dependencies & Prerequisites

### Antes de Comenzar / Before Starting
- ✅ Backend (Api_Emuladores) está compilado y corriendo en puerto 3000
- ✅ PostgreSQL está corriendo (docker compose up) en puerto 6543
- ✅ MQTT broker está accesible en localhost:1883 (si no, backend offline de ingesta telemetría pero auth seguirá funcionando)
- ✅ Frontend (Frontend_SafeAir) está compilado, `npm install` completado
- ✅ Certificados HTTPS no requeridos para localhost (pero documentar para producción)

All complete before integration can be tested.

---

## Próximos Pasos / Next Steps

1. ✅ **Esta especificación está lista** — aprobada para proceder a planning
2. 🔄 **Ejecutar `/speckit.plan`** — generar diseño detallado y plan de implementación
3. 🔄 **Ejecutar `/speckit.tasks`** — desglosar en tareas de desarrollo ordenadas
4. 💻 **Implementación** — escribir código siguiendo prioridades (Auth > HTTP Client > Dashboard > Load Testing)
5. 🧪 **Testing** — E2E con Playwright, 2-3 clientes concurrentes
6. 📄 **Documentación** — README.md bilingual completado

---

**Versión Especificación / Specification Version**: 1.0  
**Validación / Validation**: Pendiente de check de calidad / Pending quality checklist  
**Próxima Revisión / Next Review**: Después de `/speckit.plan` / After `/speckit.plan`