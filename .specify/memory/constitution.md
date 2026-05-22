# SafeAir Emulator Integration Constitution
**Constitución de Integración SafeAir Emulator**

**Contexto del Proyecto / Project Context**: SafeAir es un sistema de monitoreo ambiental en tiempo real multi-dispositivo con arquitectura distribuida / SafeAir is a multi-device real-time environmental monitoring system with distributed architecture:
- **Backend**: API Node.js/Express con persistencia PostgreSQL y streaming de eventos MQTT / Node.js/Express API with PostgreSQL persistence and MQTT event streaming
- **Frontend**: Angular 19 SPA con componentes standalone y patrón port/adapter / Angular 19 SPA with standalone components and port/adapter pattern
- **Base de Datos / Database**: PostgreSQL con Docker Compose para desarrollo local / PostgreSQL with Docker Compose for local development
- **Despliegue / Deployment**: 3 laptops locales ejecutándose simultáneamente (API, Frontend, Base de Datos) con 2-3 conexiones de cliente concurrentes / 3 local laptops running simultaneously (API, Frontend, Database) with 2-3 concurrent client connections

---

## I. Arquitectura & Modelo de Conexión (NON-NEGOTIABLE)
## I. Architecture & Connection Model (NON-NEGOTIABLE)

### Cómo Funciona SafeAir: Flujo End-to-End / How SafeAir Works: End-to-End Flow
**Objetivo / Objective**: Establecer una comprensión cristalina del flujo de datos en 3 dispositivos locales / Establish crystal-clear understanding of data flow across 3 local devices.

1. **Emulador → Backend (MQTT o HTTP) / Emulator → Backend (MQTT or HTTP)**
   - Los emuladores publican telemetría: `safeair/{emulatorId}/telemetry` (tópico MQTT) / Emulators publish telemetry: `safeair/{emulatorId}/telemetry` (MQTT topic)
   - Carga útil / Payload: temperatura, humedad, co2, pm25 + timestamp
   - Backend valida vía middleware de clave API de telemetría o JWT para HTTP / Backend validates via telemetry API key middleware or JWT for HTTP
   - Los mensajes se persisten en PostgreSQL (tabla cycle_measurements) / Messages persisted to PostgreSQL (cycle_measurements table)

2. **Máquina de Estados del Backend / Backend State Machine**
   - Recibe medición del emulador (MQTT o HTTP) / Receives measurement from emulator (MQTT or HTTP)
   - Resuelve `emulatorId` a Room/Instance (estrategia: rechazar o aprovisionamiento automático) / Resolves `emulatorId` to Room/Instance (strategy: reject or auto-provision)
   - Aplica lógica de negocio (umbrales, alarmas) / Applies business logic (thresholds, alarms)
   - Publica en tópicos MQTT de salida configurados (para otros sistemas) / Publishes to configured MQTT output topics (for other systems)
   - Retorna 200 OK o error 422/401 con explicación / Returns 200 OK or 422/401 error with explanation

3. **Frontend → Backend (HTTP/REST)**
   - El usuario inicia sesión: `POST /api/v1/auth/login` → recibe token JWT / User logs in: `POST /api/v1/auth/login` → receives JWT token
   - Token almacenado en localStorage (AuthSessionStorageService) / Token stored in localStorage (AuthSessionStorageService)
   - Solicitudes autenticadas: encabezado `Authorization: Bearer {token}` / Authenticated requests: `Authorization: Bearer {token}` header
   - Obtiene métricas de sala: `GET /api/v1/rooms/{id}/metrics/current` / Fetches room metrics: `GET /api/v1/rooms/{id}/metrics/current`
   - Muestra datos en tiempo real desde API (no mock, una vez integrado) / Displays real-time data from API (not mock, once integrated)

4. **Consistencia de Base de Datos / Database Consistency**
   - PostgreSQL es la fuente única de verdad para todas las mediciones/eventos / PostgreSQL single source of truth for all measurements/events
   - Sequelize ORM asegura alineación de esquema (modelos → sincronización al iniciar) / Sequelize ORM ensures schema alignment (models → sync on startup)
   - Trazabilidad: `measuredAt` (timestamp del emulador), `receivedAt` (tiempo de ingesta de API) / Trazabilidad: `measuredAt` (emulator timestamp), `receivedAt` (API ingestion time)

### Topología de Red (3 Laptops, Todas Locales) / Network Topology (3 Laptops, All Local)
```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Laptop 1      │         │    Laptop 2      │         │    Laptop 3      │
│  (Frontend)     │────────→│  (Servidor API)  │────────→│  (PostgreSQL)    │
│  Angular 19     │ HTTP    │  Node.js 3000    │ TCP:5432│  Puerto 6543     │
│  Puerto 4200    │ REST    │  Express         │         │  (o interno      │
└─────────────────┘         │  + Cliente MQTT  │         │   5432 si local) │
        ↓                    └──────────────────┘         └──────────────────┘
   Login Usuario                      ↑
   + Dashboard              Conecta a
   (vía CORS a API)         PostgreSQL


┌─────────────────────────────────────────────┐
│  Dispositivos Emuladores (cualquier IP)     │
│  Publica: safeair/{id}/telemetry            │
│  Destino: broker MQTT o HTTP API            │
│  (Actualmente: MQTT en localhost:1883       │
│   o mismo host del backend)                 │
└─────────────────────────────────────────────┘
```

### Requerimientos Críticos de Conexión / Critical Connection Requirements
- **Acceso a Base de Datos / Database Access**: Backend debe alcanzar host de BD (127.0.0.1:6543 o env DB_HOST/DB_PORT)
- **Accesibilidad de API / API Accessibility**: Frontend debe alcanzar backend (http://localhost:3000 o API_BASE_URL configurable)
- **Firewall**: Puertos 3000, 4200, 6543 deben estar abiertos localmente O configurar en la misma máquina / Firewall: Ports 3000, 4200, 6543 must be open locally OR configure on same machine
- **CORS**: Backend permite todos los orígenes en desarrollo (app.ts: `cors()`) → restringir en producción / Backend allows all origins in development (app.ts: `cors()`) → restrict in production
- **Conexiones Concurrentes / Concurrent Connections**: Backend diseñado para manejar 2-3 clientes frontend simultáneos
  - Express por defecto: 10 sockets concurrentes por hostname / Express default: 10 concurrent sockets per hostname
  - Pool de conexiones PostgreSQL: 10 por defecto (suficiente para 2-3 clientes × 5-10 consultas cada uno) / PostgreSQL connection pool: default 10 (sufficient for 2-3 clients × 5-10 queries each)
  - Sin problemas conocidos de agrupamiento de conexiones a esta escala / No known connection pooling issues at current scale

---

## II. Fortalezas Arquitectónicas (Fundación) / Architectural Strengths (Foundation)

### Backend (Api_Emuladores)
1. **Arquitectura de Capas Limpia / Clean Layered Architecture**: Controllers → Services → Repositories → Models
   - Separación clara de responsabilidades (lógica de negocio, acceso a datos, vinculación HTTP) / Clear separation of concerns (business logic, data access, HTTP binding)
   - Ejemplo / Example: `TelemetryIngestionService` maneja validación/persistencia separado de `MetricsController`
2. **Preparado para Eventos / Event-Driven Ready**: Infraestructura de bus de eventos en su lugar (`container.ts`)
   - Gateway MQTT se integra limpiamente sin acoplamiento a capa HTTP / MQTT gateway integrates cleanly without coupling to HTTP layer
3. **Seguridad de Tipos / Type Safety**: TypeScript completo con esquemas Zod para validación de entrada
   - El esquema de login aplica estructura `email` + `password` / Login schema enforces `email` + `password` structure
4. **Stack de Seguridad Middleware / Security Middleware Stack**: Auth JWT, clave API de telemetría, CORS, Helmet
   - Distinción clara / Clear distinction: endpoints públicos (`/auth/login`, `/health`) vs protegidos (`/rooms/*`, `/metrics`)
5. **Abstracción de Base de Datos / Database Abstraction**: ORM Sequelize con modelos + asociaciones
   - Evolución de esquema vía migraciones (siembra lista) / Schema evolution via migrations (seeding ready)
   - Campos de trazabilidad (`measuredAt`, `receivedAt`) incorporados en el modelo / Trazabilidad fields (`measuredAt`, `receivedAt`) baked into model

### Frontend (Frontend_SafeAir)
1. **Arquitectura Port/Adapter**: Lógica de auth desacoplada de la UI
   - `AuthRepositoryPort` (interfaz) → `AuthMockRepositoryAdapter` (mock) o `AuthApiRepositoryAdapter` (real)
   - Cambiar entre mock/real vía `authDataSourceFactory` sin tocar la UI / Switch between mock/real via `authDataSourceFactory` without touching UI
2. **Componentes Standalone / Standalone Components**: Angular 19 standalone reduce boilerplate
   - Inyección de dependencias explícita (sin NgModule necesario para feature) / Explicit dependency injection (no NgModule needed for feature)
3. **Reactive Forms + RxJS**: Estado de formulario y operaciones asincrónicas correctamente tipadas
   - Forma de grupo de formulario definida como tipo `LoginFormShape` / Form group shape defined as `LoginFormShape` type
4. **Fundación de Accesibilidad / Accessibility Foundation**: `a11y-focus.utils`, navegación por teclado considerada
   - HTML semántico ya está en auth shell / Semantic HTML already in auth shell
5. **SCSS Modular**: Tokens/temas/utilidades separados para reutilización / SCSS Modular: Tokens/themes/utilities separated for reuse
   - Capa de consistencia de diseño lista para expansión UI multi-característica / Design consistency layer ready for multi-feature UI expansion

---

## III. Brechas Críticas & Mitigaciones de Riesgos / Critical Gaps & Risk Mitigations

### Brecha 1: Desajuste de Contrato de Auth (CRÍTICA - Debe Arreglarse Primero) / Gap 1: Auth Contract Mismatch (CRITICAL - Must Fix First)
**Problema / Issue**: Frontend envía `identifier`, backend espera `email`. / Frontend sends `identifier`, backend expects `email`.
- DTO Frontend / Frontend DTO: `LoginRequestDto { identifier, password }`
- Esquema Backend / Backend schema: `loginSchema { email, password }`

**Riesgo / Risk**: La integración fallará inmediatamente en el intento de inicio de sesión. / Integration will fail immediately on login attempt.
**Mitigación / Mitigation**:
- Opción A (Recomendado) / Option A (Recommended): Backend acepta ambos campos `identifier` y `email` (compatibilidad hacia atrás) / Backend accepts both `identifier` and `email` fields (backward compat)
- Opción B / Option B: Estandarizar frontend para enviar `email` (cambio de ruptura, más simple) / Standardize frontend to send `email` (breaking change, simpler)
- Acción / Action: Actualizar `AuthApiRepositoryAdapter` para alinear DTO con contrato backend antes de conectar / Update `AuthApiRepositoryAdapter` to align DTO with backend contract before connecting

### Brecha 2: AuthApiRepositoryAdapter está Stub (CRÍTICA) / Gap 2: AuthApiRepositoryAdapter is Stubbed (CRITICAL)
**Problema / Issue**: `auth-api-repository.adapter.ts` retorna `temporaryUnavailableError()` — sin llamada HTTP. / `auth-api-repository.adapter.ts` returns `temporaryUnavailableError()` — no HTTP call.
```typescript
async login(_credentials: AuthCredentials): Promise<LoginResult> {
  return { ok: false, error: temporaryUnavailableError() };
}
```

**Riesgo / Risk**: Frontend no puede conectarse a backend incluso si la API se está ejecutando. / Frontend cannot connect to backend even if API is running.
**Mitigación / Mitigation**:
- Implementar llamada HTTP real a `POST /api/v1/auth/login` / Implement real HTTP call to `POST /api/v1/auth/login`
- Agregar inyección HttpClient y configuración de URL base / Add HttpClient injection and base URL configuration
- Implementar mapeo de errores (backend 401 → frontend AuthError) / Implement error mapping (backend 401 → frontend AuthError)

### Brecha 3: Sin Servicio HTTP Client (CRÍTICA) / Gap 3: No HTTP Client Service (CRITICAL)
**Problema / Issue**: Frontend carece de abstracción HTTP centralizada. / Frontend lacks centralized HTTP abstraction.
- Interfaz `ApiClientPort` existe pero sin implementación / `ApiClientPort` interface exists but no implementation
- Sin configuración de URL base para endpoint de API / No base URL configuration for API endpoint
- Sin interceptores globales de error/solicitud / No global error/request interceptors

**Riesgo / Risk**: Múltiples clientes HTTP esparcidos en la base de código, manejo de errores inconsistente. / Multiple HTTP clients scattered across codebase, inconsistent error handling.
**Mitigación / Mitigation**:
- Crear `HttpClientAdapter` implementando `ApiClientPort` / Create `HttpClientAdapter` implementing `ApiClientPort`
- Centralizar URL base en token de entorno/configuración / Centralize base URL in environment/config token
- Agregar interceptores de solicitud/respuesta para JWT, registro, manejo de errores / Add request/response interceptors for JWT, logging, error handling
- Inyectar vía token DI de Angular (ya está en lugar para patrón AUTH_DATA_SOURCE) / Inject via Angular DI token (already in place for AUTH_DATA_SOURCE pattern)

### Brecha 4: Dashboard Aún Mockeado (MODERADA) / Gap 4: Dashboard Still Mocked (MODERATE)
**Problema / Issue**: Endpoints de Room/métricas existen en backend, pero frontend usa `DashboardEnvironmentMockService`. / Room/metrics endpoints exist in backend, but frontend uses `DashboardEnvironmentMockService`.
- Mock genera datos sintéticos de temp/humedad/co2/pm25 / Mock generates synthetic temp/humidity/co2/pm25 data
- Sin llamadas API a `/rooms/{id}/metrics/current` / No API calls to `/rooms/{id}/metrics/current`

**Riesgo / Risk**: Dashboard no mostrará datos reales del emulador incluso si el backend está en vivo. / Dashboard won't show real emulator data even if backend is live.
**Mitigación / Mitigation**:
- Fase 1: Mantener mock para iteración rápida (OK para pruebas tempranas) / Phase 1: Keep mock for fast iteration (OK for early testing)
- Fase 2: Implementar `DashboardRepositoryPort` + adaptador para llamar a API / Phase 2: Implement `DashboardRepositoryPort` + adapter to call API
- Fase 3: Fusionar fallback de mock para escenarios sin conexión / Phase 3: Merge mock fallback for offline scenarios

### Brecha 5: Falta Configuración de Entorno (MODERADA) / Gap 5: Missing Environment Configuration (MODERATE)
**Problema / Issue**: Sin `src/environments/environment.ts` en frontend para configurar URL base de API. / No `src/environments/environment.ts` in frontend to configure API base URL.
- Actualmente codificada o deducida desde localhost / Currently hardcoded or inferred from localhost

**Riesgo / Risk**: No puedo cambiar fácilmente la URL de la API (dev/staging/prod). / Cannot easily switch API URL (dev/staging/prod).
**Mitigación / Mitigation**:
- Crear `src/environments/environment.ts` + `environment.prod.ts` / Create `src/environments/environment.ts` + `environment.prod.ts`
- Exportar configuración `API_BASE_URL` / Export `API_BASE_URL` config
- Inyectar vía token Angular (como patrón AUTH_DATA_SOURCE) / Inject via Angular token (like AUTH_DATA_SOURCE pattern)
- Documentar cómo establecer vía banderas de compilación o archivos `.env` / Document how to set via build flags or `.env` files

### Brecha 6: Sin Prueba de Carga de Cliente Concurrente (BAJA) / Gap 6: No Concurrent Client Load Testing (LOW)
**Problema / Issue**: Sin validación de que la API pueda manejar 2-3 clientes frontend simultáneos + mensajes MQTT. / No validation that API can handle 2-3 simultaneous frontend clients + MQTT messages.

**Riesgo / Risk**: Agotamiento del pool de conexiones, consultas lentas, mensajes perdidos. / Connection pool exhaustion, slow queries, missed messages.
**Mitigación / Mitigation**:
- Planificar prueba de integración con Playwright: cargar 2 pestañas de navegador concurrentes / Plan integration test with Playwright: load 2 concurrent browser tabs
- Monitorear pool de conexiones de BD + suscripciones MQTT durante la prueba / Monitor DB connection pool + MQTT subscriptions during test
- Agregar middleware de registro para rastrear solicitudes activas / Add logging middleware to track active requests
- Documentar límites esperados en README / Document expected limits in README

### Brecha 7: Límite de Registro de Emulador Poco Claro (BAJA) / Gap 7: Emulator Registration Boundary Unclear (LOW)
**Problema / Issue**: Backend tiene `EMULATOR_MISSING_STRATEGY=auto-provision` — creará sala/dispositivos automáticamente. / Backend has `EMULATOR_MISSING_STRATEGY=auto-provision` — will create room/devices automatically.
- Frontend no tiene UI para registrar/configurar emuladores / Frontend has no UI to register/configure emulators
- Los usuarios no saben qué ID de emuladores están activos / Users don't know which emulator IDs are active

**Riesgo / Risk**: Los datos autoprovisionados contaminan el panel de control, confundiendo a los usuarios. / Auto-provisioned data pollutes dashboard, confusing users.
**Mitigación / Mitigation**:
- Agregar página de configuración al frontend: listar emuladores activos, alternar aprovisionamiento automático / Add settings page to frontend: list active emulators, toggle auto-provision
- UI clara para registrar ID de emulador antes de la primera telemetría / Clear UI to register emulator ID before first telemetry
- Documentar formato de ID de emulador en README (ej., `emu-room-a`) / Document emulator ID format in README (e.g., `emu-room-a`)

---

## IV. Calidad de Código & Mejoras Arquitectónicas (SOLID + Patrones) / Code Quality & Architectural Improvements (SOLID + Patterns)

### Principio: Responsabilidad Única / Principle: Single Responsibility
**Estado Actual / Current State**: Generalmente bueno, pero algo de olor en servicio de mock del panel de control. / Generally good, but some smell in dashboard mock service.
- `DashboardEnvironmentMockService`: 200+ LOC mezclando generación de estado + estado de UI + matemática / `DashboardEnvironmentMockService`: 200+ LOC mixing state generation + UI state + math
- **Acción / Action**: Extraer `EnvironmentSimulatorEngine` (solo matemática) + `DashboardEnvironmentAdapter` (vinculación de estado de UI) / Extract `EnvironmentSimulatorEngine` (math only) + `DashboardEnvironmentAdapter` (state UI binding)

### Principio: Abierto/Cerrado / Principle: Open/Closed
**Estado Actual / Current State**: El patrón de adaptador de auth es excelente (abierto para nuevos adaptadores, cerrado para modificación). / Auth adapter pattern is excellent (open for new adapters, closed for modification).
**Brechas / Gaps**:
- El controlador de métricas no usa patrón de repositorio (llama servicio directamente) / Metrics controller doesn't use repository pattern (calls service directly)
- **Acción / Action**: Agregar puerto `MetricsRepository` para desacoplar controlador de servicio / Add `MetricsRepository` port to decouple controller from service

### Principio: Sustitución de Liskov / Principle: Liskov Substitution
**Estado Actual / Current State**: El patrón de adaptador es conforme a LSP (AuthMock/AuthApi ambos satisfacen `AuthRepositoryPort`). / Adapter pattern is LSP-compliant (AuthMock/AuthApi both satisfy `AuthRepositoryPort`).
**Brechas / Gaps**:
- El manejo de errores no siempre está alineado (mock retorna errores específicos, API podría retornar códigos diferentes) / Error handling not always aligned (mock returns specific errors, API might return different codes)
- **Acción / Action**: Definir contrato de mapeo de errores; asegurar que ambos adaptadores mapeen a enum de error igual / Define error mapping contract; ensure both adapters map to same error enum

### Principio: Segregación de Interfaz / Principle: Interface Segregation
**Estado Actual / Current State**: Bueno — puertos pequeños y enfocados. / Good — small, focused ports.
- `AuthRepositoryPort` solo tiene `login()` (sin inflación) / `AuthRepositoryPort` only has `login()` (no bloat)
- `ApiClientPort` suficientemente genérico / `ApiClientPort` generic enough
**Mejora / Improvement**:
- Considerar `BrokerClientPort` para eventos futuros de WebSocket/MQTT (ya existe pero está en stub) / Consider `BrokerClientPort` for future WebSocket/MQTT events (already exists but stubbed)

### Principio: Inversión de Dependencia / Principle: Dependency Inversion
**Estado Actual / Current State**: Excelente uso de tokens DI de Angular. / Excellent use of Angular DI tokens.
- Componentes dependen de abstracciones (fachada, puerto) / Components depend on abstractions (facade, port)
- Implementaciones inyectadas a nivel raíz / Implementations injected at root level
**Faltante / Missing**: Backend también necesita patrón de fábrica para repositorios / Backend also needs factory pattern for repositories

### Patrones de Diseño a Reforzar / Design Patterns to Reinforce
1. **Patrón Repositorio / Repository Pattern** (Backend): Agregar base `IRepository<T>` para User/Room/Measurement
   - Actualmente / Currently: uso directo de ORM en servicios / direct ORM usage in services
   - Destino / Target: `TelemetryRepository extends Repository<CycleMeasurement>`

2. **Localizador de Servicio / Service Locator** (Frontend): Ya se usa para AUTH_DATA_SOURCE
   - Extender a tokens `API_BASE_URL`, `MQTT_BROKER_URL` / Extend to API_BASE_URL, MQTT_BROKER_URL tokens
   - Permite que las pruebas unitarias inyecten mocks / Allows unit tests to inject mocks

3. **Patrón Estrategia / Strategy Pattern** (Backend): Ya se usa parcialmente para estrategia de emulador
   - Extender a estrategia de recopilación de métricas (MQTT vs HTTP vs híbrido) / Extend to metrics collection strategy (MQTT vs HTTP vs hybrid)

4. **Cadena de Middleware / Middleware Chain** (Backend): Ya está en Express
   - Asegurar que el orden de interceptor sea: CORS → Auth → Validate → Controller → Error / Ensure interceptor order is: CORS → Auth → Validate → Controller → Error

### Banderas Rojas de Limpieza de Código a Arreglar / Code Cleanliness Red Flags to Fix
1. **Credenciales Codificadas / Hardcoded Credentials**: El adaptador mock tiene `admin@safeair.local` codificado
   - **Acción / Action**: Mover a fixtures de prueba, no código fuente / Move to test fixtures, not source code
2. **Servicios Grandes / Large Services**: Algunos servicios podrían beneficiarse de composición
   - **Acción / Action**: Revisar si servicio > 200 LOC = dividir / Review if service > 200 LOC = split
3. **Manejo de Errores Incompleto / Incomplete Error Handling**: Algunos endpoints no capturan errores asincrónico
   - **Acción / Action**: Asegurar que todos los manejadores de ruta envuelvan `.catch(next)` para middleware de errores Express / Ensure all route handlers wrap `.catch(next)` for Express error middleware
4. **Números Mágicos / Magic Numbers**: El mock del panel de control tiene intervalo de actualización `2200` ms
   - **Acción / Action**: Mover a archivo de constantes/configuración (UPDATE_INTERVAL_MS) / Move to constants/config file (UPDATE_INTERVAL_MS)

---

## V. Seguridad & Estabilidad de Conexión / Security & Connection Stability

### Seguridad por Diseño (Desarrollo Local) / Security by Design (Local Development)
1. **Secretos JWT / JWT Secrets**: Debe usar secreto fuerte (variable env, no en código)
   - Actual / Current: plantilla `.env` tiene placeholder / `.env` template has placeholder
   - **Acción / Action**: Documentar mín 32 caracteres, regenerar por entorno / Document min 32 chars, regenerate per environment
2. **Clave API para Telemetría / API Key for Telemetry**: Separada de JWT (buena práctica)
   - Actual / Current: `TELEMETRY_API_KEY` en env / `TELEMETRY_API_KEY` in env
   - **Acción / Action**: Rotar trimestralmente, registrar uso / Rotate quarterly, log usage
3. **CORS**: Abierto a todos en dev, debe restringirse en staging
   - Actual / Current: `cors()` sin opciones / `cors()` with no options
   - **Acción / Action**: Documentar restricción de producción a URLs de frontend conocidas / Document production restriction to known frontend URLs
4. **Helmet**: Habilitado (bueno) / Enabled (good)
5. **HTTPS**: No requerido para localhost, pero documentar para producción / Not required for localhost, but document for production

### Estabilidad de Conexión (Red Local) / Connection Stability (Local Network)
1. **Agrupamiento de Conexiones / Connection Pooling**:
   - PostgreSQL Sequelize: tamaño de pool 5-10 (suficiente) / PostgreSQL Sequelize: pool size 5-10 (sufficient)
   - MQTT: conexión persistente única + reconexión automática / MQTT: single persistent connection + auto-reconnect
   - HTTP: Express maneja solicitudes concurrentes (sin agrupamiento necesario) / HTTP: Express handles concurrent requests (no pooling needed)
2. **Manejo de Tiempo de Espera / Timeout Handling**:
   - Llamadas HTTP de frontend: agregar tiempo de espera (5s por defecto), reintentar en 503 / Frontend HTTP calls: add timeout (5s default), retry on 503
   - MQTT: estrategia de reconexión (retroceso exponencial) / MQTT: reconnect strategy (exponential backoff)
   - **Acción / Action**: Implementar interceptor de solicitud con tiempo de espera + lógica de reintento / Implement request interceptor with timeout + retry logic
3. **Apagado Elegante / Graceful Shutdown**:
   - Backend debe cerrar BD + MQTT al salir / Backend should close DB + MQTT on exit
   - **Acción / Action**: Agregar manejador `SIGTERM` en server.ts / Add `SIGTERM` handler in server.ts
4. **Monitoreo / Monitoring**:
   - Registrar eventos de conexión (conectar BD, suscribir MQTT, solicitudes HTTP) / Log connection events (DB connect, MQTT subscribe, HTTP requests)
   - **Acción / Action**: Implementar registro estructurado con niveles de registro / Implement structured logging with log levels

---

## VI. Instalación & Gestión de Dependencias / Installation & Dependency Management

### Requisitos Previos (Antes de Comenzar) / Prerequisites (Before Starting)
- Node.js 18.x o 20.x (verificar con `node -v`) / Node.js 18.x or 20.x (check with `node -v`)
- Docker + Docker Compose (para PostgreSQL) / Docker + Docker Compose (for PostgreSQL)
- npm 9.x o yarn (gestor de paquetes) / npm 9.x or yarn (package manager)

### Fases de Instalación (El Orden Importa) / Installation Phases (Order Matters)
1. **Capa de Base de Datos / Database Layer** (Laptop 3): PostgreSQL en Docker
   - `docker compose -f Api_Emuladores/database/docker-compose.yml up -d`
   - Esperar verificación de salud (registros postgres deben mostrar "listo para aceptar conexiones") / Wait for health check (postgres logs should show "ready to accept connections")
   - Verificar / Verify: `psql -h 127.0.0.1 -U postgres -d safeair` (contraseña / password: postgres)

2. **Capa Backend / Backend Layer** (Laptop 2): Servidor API
   - `npm install` en Api_Emuladores/ / in Api_Emuladores/
   - `npm run build` para compilar TypeScript / to compile TypeScript
   - `npm run dev` para iniciar servidor dev (observa cambios) / to start dev server (watches for changes)
   - Verificar / Verify: `curl http://localhost:3000/health` → `{"status":"ok"}`

3. **Capa Frontend / Frontend Layer** (Laptop 1): Aplicación Angular
   - `npm install` en Frontend_SafeAir/ / in Frontend_SafeAir/
   - Configurar URL base de API (variable env o environment.ts) / Configure API base URL (env var or environment.ts)
   - `npm start` para ejecutar servidor dev (ng serve en 4200) / to run dev server (ng serve on 4200)
   - Verificar / Verify: Abiir http://localhost:4200 en navegador / Open http://localhost:4200 in browser

### Alineación de Dependencias / Dependency Alignment
- **Backend**: Ya tiene todas las dependencias en package.json
  - Versiones fijadas (bueno para reproducibilidad) / Versions pinned (good for reproducibility)
  - Sin conflictos conocidos / No known conflicts
- **Frontend**: Ya tiene todas las dependencias
  - Angular 19 (estable más reciente a partir de 2026-05) / Angular 19 (latest stable as of 2026-05)
  - Vitest + Playwright para pruebas / for testing
- **Acción / Action**: Generar archivos de bloqueo (`package-lock.json`) para asegurar versiones exactas / Generate lock files (`package-lock.json`) to ensure exact versions

---

## VII. Gobierno & Flujo de Trabajo de Desarrollo / Governance & Development Workflow

### Decisiones de Arquitectura (NON-NEGOTIABLE)
1. **Backend permanece sin estado / Backend remains stateless**: Los datos de sesión viven en JWT, no en memoria del servidor
   - Habilita escalado horizontal (si se necesita más adelante) / Enables horizontal scaling (if needed later)
2. **Adaptadores de frontend siempre mockeados inicialmente / Frontend adapters always mocked initially**: Las nuevas características se prueban con mock antes de API real
   - Reduce dependencias de integración, acelera desarrollo / Reduces integration dependencies, speeds development
3. **Base de datos es fuente única de verdad / Database is single source of truth**: Sin caché del lado del cliente sin versionado
   - API responsable de señales de invalidación (futuro: vía WebSocket) / API responsible for invalidation signals (future: via WebSocket)
4. **Modo TypeScript estricto / TypeScript strict mode**: Tanto backend como frontend deben compilar sin `any`
   - Cumplimiento vía CI/CD (cuando esté listo) / Enforcement via CI/CD (when ready)
5. **Todos los endpoints deben tener contratos de error / All endpoints must have error contracts**: Cada ruta define respuestas de éxito + error
   - Documentar en comentarios de código o especificación OpenAPI (futuro) / Document in code comments or OpenAPI spec (future)

### Lista de Verificación de Revisión de Código / Code Review Checklist
- [ ] Alineación de contrato: Los DTO coinciden entre frontend/backend / Contract alignment: DTOs match between frontend/backend
- [ ] Manejo de errores: Todas las operaciones asincrónicas capturan errores / Error handling: All async operations catch errors
- [ ] Sin credenciales o URLs codificadas / No hardcoded credentials or URLs
- [ ] Principios SOLID aplicados (sin objetos dios > 200 LOC) / SOLID principles applied (no god objects > 200 LOC)
- [ ] Seguridad de tipos: Sin tipos `any` en TypeScript / Type safety: No `any` types in TypeScript
- [ ] Cobertura de pruebas: Los nuevos adaptadores tienen pruebas unitarias / Test coverage: New adapters have unit tests

### Orden de Prioridad para Implementación / Priority Order for Implementation
1. **Arreglar Contrato de Auth / Fix Auth Contract** (1-2 horas)
2. **Implementar Cliente HTTP / Implement HTTP Client** (2-3 horas)
3. **Conectar Frontend Auth a API Real / Connect Frontend Auth to Real API** (2 horas)
4. **Probar 2-3 Inicios de Sesión Concurrentes / Test 2-3 Concurrent Logins** (1 hora)
5. **Conectar Dashboard a Métricas Reales / Connect Dashboard to Real Metrics** (4-5 horas)
6. **Prueba End-to-End con Emulador / End-to-End Test with Emulator** (2 horas)
7. **Pruebas de Carga + Estabilidad / Load Testing + Stability** (2-3 horas)

---

## Gobierno / Governance

Esta Constitución prevalece sobre todas las decisiones de implementación. Los desvíos deben documentarse con ratificación explícita. / This Constitution supersedes all implementation decisions. Deviations must be documented with explicit rationale.

- **Decisiones de arquitectura / Architecture decisions** están bloqueadas pendiente de revisión (esp. modelo de conexión, enfoque de seguridad) / are locked pending review (esp. connection model, security approach)
- **Compuertas de calidad de código / Code quality gates** aplicadas durante PR: sin tipos `any`, contratos de error validados, patrones verificados / enforced during PR: no `any` types, error contracts validated, patterns verified
- **Pruebas de integración / Integration testing** obligatorias antes de declarar característica completa (transición mock → API real) / mandatory before declaring feature complete (mock → real API transition)
- **Lista de verificación de despliegue / Deployment checklist** en README asegura que los 3 laptops estén configurados consistentemente / in README ensures all 3 laptops configured consistently

Para orientación de desarrollo en tiempo de ejecución, consulte `README.md` (a generar) / For runtime development guidance, see `README.md` (to be generated).

**Versión / Version**: 1.0.0 | **Ratificado / Ratified**: 2026-05-12 | **Última Enmienda / Last Amended**: 2026-05-12
