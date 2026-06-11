# SafeAir - Análisis Integral del Sistema

> **Fecha de creación:** 10 de Junio de 2026
> **Versión del documento:** 1.0
> **Estado:** Análisis completo

---

## Tabla de Contenidos

1. [Objetivo del Proyecto](#1-objetivo-del-proyecto)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Componentes del Sistema](#3-componentes-del-sistema)
   - 3.1 [Frontend (Angular)](#31-frontend-angular)
   - 3.2 [API Backend (Node.js + Express + TypeScript)](#32-api-backend-nodejs--express--typescript)
   - 3.3 [Base de Datos (PostgreSQL)](#33-base-de-datos-postgresql)
   - 3.4 [Broker MQTT (EMQX)](#34-broker-mqtt-emqx)
   - 3.5 [Emuladores IoT (Java Spring Boot)](#35-emuladores-iot-java-spring-boot)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Flujo de Comunicación MQTT](#5-flujo-de-comunicación-mqtt)
6. [Motor de Reglas y Lógica de Negocio](#6-motor-de-reglas-y-lógica-de-negocio)
7. [Flujo de Telemetría de Sensores](#7-flujo-de-telemetría-de-sensores)
8. [Flujo de Control de Actuadotes](#8-flujo-de-control-de-actuadores)
9. [Sistema de Alarmas](#9-sistema-de-alarmas)
10. [Autenticación y Seguridad](#10-autenticación-y-seguridad)
11. [Gestión de Emuladores](#11-gestión-de-emuladores)
12. [Endpoints de Debug](#12-endpoints-de-debug)
13. [Configuración y Variables de Entorno](#13-configuración-y-variables-de-entorno)
14. [Modos de Despliegue](#14-modos-de-despliegue)
15. [Diagrama de Arquitectura](#15-diagrama-de-arquitectura)

---

## 1. Objetivo del Proyecto

**SafeAir** es una plataforma IoT diseñada para el **monitoreo y control de calidad del aire en espacios cerrados**. El sistema permite:

- **Monitorear en tiempo real** parámetros ambientales (temperatura, humedad, CO2, PM2.5) mediante dispositivos IoT simulados (emuladores).
- **Controlar actuadores** (minisplits, purificadores, extractores) de forma automática mediante reglas o manual desde el frontend.
- **Generar alertas y alarmas** cuando los parámetros superan umbrales seguros.
- **Consultar históricos** de mediciones y acciones para análisis y reportes.
- **Soportar múltiples usuarios y espacios** mediante un modelo multi-instancia.

### Casos de Uso Principales

1. **Monitoreo continuo:** Un usuario operador crea instancias y habitaciones, asigna emuladores, y recibe telemetría en tiempo real.
2. **Control automático:** El sistema evalúa reglas y envía comandos a actuadores cuando se detectan condiciones fuera de rango.
3. **Control manual:** El operador puede encender/apagar dispositivos desde el dashboard.
4. **Reportes históricos:** Se consultan datos de ciclos de medición en rangos de tiempo definidos.

---

## 2. Arquitectura General del sistema

El sistema SafeAir sigue una arquitectura distribuida basada en microservicios con comunicación por mensajes MQTT:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SAFE AIR - ARQUITECTURA                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     HTTP/REST      ┌───────────────────┐               │
│   │   FRONTEND    │ ────────────────► │   API BACKEND      │               │
│   │   (Angular)   │ ◄─────────────── │  (Node.js/TS)       │               │
│   │   Puerto:8080 │                  │  Puerto:3000        │               │
│   └──────────────┘                  └──────────┬──────────┘               │
│                                                │                           │
│                              ┌─────────────────┼─────────────────┐         │
│                              │                 │                 │         │
│                              ▼                 ▼                 ▼         │
│                    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┤
│                    │   PostgreSQL     │ │   EMQX      │ │   Emuladores    │
│                    │   Puerto:6543    │ │ Puerto:1883 │ │   (Java)         │
│                    │                  │ │ Puerto:8084│ │   Puerto:8081    │
│                    └─────────────────┘ │Puerto:18083 │ │                  │
│                                        └──────┬──────┘ └─────────────────┤
│                                               │                           │
│                                    ┌──────────┴───────────┐              │
│                                    │    MQTT Broker        │              │
│                                    │  (Message Bus)        │              │
│                                    │                       │              │
│                                    │ Topics:               │              │
│                                    │ • safeair/+/telemetry │              │
│                                    │ • safeair/+/actuator- │              │
│                                    │   state               │              │
│                                    │ • safeair/+/config    │              │
│                                    │ • safeair/+/actions   │              │
│                                    │ • safeair/+/alarms    │              │
│                                    └───────────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos Principal

1. **Emuladores → EMQX → API → PostgreSQL:** Telemetría de sensores fluye desde emuladores hacia la API a través del broker MQTT.
2. **API → EMQX → Emuladores:** Comandos de actuadores viajan desde el API hacia los emuladores.
3. **Frontend → API → PostgreSQL:** El frontend consume APIs REST para obtener datos históricos y управлять configuraciones.
4. **API → EMQX → Frontend:** Alarmas y acciones se publican a tópicos que el frontend puede suscribirse.

---

## 3. Componentes del Sistema

### 3.1 Frontend (Angular)

**Ubicación:** `/home/jbenitez/DSR_Jorge/Proyecto/Frontend_SafeAir`

**Tecnología:** Angular 18+ con TypeScript, standalone components.

**Responsabilidades:**
- Interfaz de usuario para login, registro y gestión de habitaciones.
- Dashboard principal con widgets de métricas en tiempo real.
- Páginas de control de habitaciones, actuadores y configuración.
- Conexión MQTT vía WebSocket para recibir telemetría y actualizaciones en vivo.
- Consumo de APIs REST para operaciones CRUD.

**Estructura de rutas principales:**

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/auth/login` | LoginPageComponent | Página de inicio de sesión |
| `/auth/register` | RegisterPageComponent | Registro de nuevos usuarios |
| `/dashboard` | DashboardPageComponent | Dashboard principal |
| `/dashboard-view` | DashboardViewPageComponent | Vista detallada con widgets |
| `/rooms` | RoomsPageComponent | Gestión de habitaciones |
| `/rooms/:id/control` | RoomControlPageComponent | Control de una habitación específica |
| `/actuators` | ActuatorsPageComponent | Panel de actuadores |
| `/settings` | SettingsPageComponent | Configuración del sistema |

**Componentes de widgets del dashboard:**
- `DashboardTemperatureWidgetComponent` - Muestra temperatura actual
- `DashboardHumidityWidgetComponent` - Muestra humedad relativa
- `DashboardCo2WidgetComponent` - Muestra nivel de CO2
- `DashboardPm25WidgetComponent` - Muestra partículas PM2.5
- `DashboardRoomSelectorComponent` - Selector de habitación activa
- `DashboardSidebarComponent` - Barra lateral de navegación
- `DashboardTopbarComponent` - Barra superior con usuario y acciones

**Variables de entorno clave:**
```typescript
// environment.prod.ts
API_BASE_URL: window.__env?.API_BASE_URL || '',
MQTT_BROKER_URL: 'ws://localhost:8084/mqtt',
AUTH_MODE: 'api',
DASHBOARD_MODE: 'api'
```

**Flujo de telemetría en Frontend:**
1. Al seleccionar una habitación, el componente se subscribe al tópico MQTT `safeair/{emulatorId}/telemetry`.
2. Los mensajes MQTT se decodifican y actualizan los BehaviorSubjects del facade.
3. Los widgets con `ChangeDetectionStrategy.OnPush` se actualizan automáticamente.
4. El historial de métricas se consulta vía API REST (`GET /api/v1/rooms/:id/metrics`).

---

### 3.2 API Backend (Node.js + Express + TypeScript)

**Ubicación:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores`

**Puerto:** 3000

**Responsabilidades:**
- Gestión de usuarios, autenticación JWT, y OTP.
- CRUD de instancias, habitaciones, dispositivos y emuladores.
- Ingesta de telemetría desde emuladores (vía MQTT y REST).
- Evaluación de reglas y generación de acciones/alarmas.
- Publicación de comandos a actuadores vía MQTT.
- Endpoints de debug para diagnóstico.

**Estructura del código:**

```
Api_Emuladores/src/
├── api/
│   ├── controllers/          # Controladores de endpoints
│   │   ├── actuator.controller.ts
│   │   ├── metrics.controller.ts
│   │   └── configuration.controller.ts
│   ├── routes/               # Definición de rutas
│   │   └── v1/
│   │       ├── actuator.routes.ts
│   │       ├── metrics.routes.ts
│   │       └── instance.routes.ts
│   ├── middlewares/          # Middlewares Express
│   │   ├── auth.middleware.ts
│   │   ├── telemetry-api-key.middleware.ts
│   │   └── request-audit.middleware.ts
│   └── dtos/                 # Data Transfer Objects
├── application/
│   ├── services/             # Lógica de negocio
│   │   ├── telemetry-ingestion.service.ts
│   │   ├── rule-evaluation.service.ts
│   │   ├── actuator-state-ingestion.service.ts
│   │   ├── device-action.service.ts
│   │   ├── alarm.service.ts
│   │   ├── emulator-resolution.service.ts
│   │   └── cycle.repository.ts
│   ├── container.ts          # Inyección de dependencias
│   └── events/               # Event bus para comunicación interna
├── infrastructure/
│   ├── mqtt/                 # Gateway MQTT
│   │   ├── mqtt.gateway.ts
│   │   ├── topics.ts
│   │   └── payload-codec.ts
│   ├── database/            # Modelos Sequelize
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── instance.model.ts
│   │   │   ├── room.model.ts
│   │   │   ├── emulator.model.ts
│   │   │   ├── cycle.model.ts
│   │   │   ├── cycle-measurement.model.ts
│   │   │   ├── device-action.model.ts
│   │   │   ├── device-state.model.ts
│   │   │   └── alarm.model.ts
│   │   └── sync.ts
│   ├── repositories/         # Repositorios de datos
│   └── mappers/              # Mapeadores de datos
├── domain/
│   └── types/                # Tipos del dominio
│       ├── telemetry.types.ts
│       └── actuator.types.ts
└── shared/
    ├── config/
    │   ├── env.ts            # Configuración de variables de entorno
    │   └── logger.ts
    └── errors/
```

**Endpoints principales:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Registro de usuario |
| POST | `/api/v1/auth/login` | Login con JWT |
| POST | `/api/v1/auth/verify-otp` | Verificación OTP |
| GET | `/api/v1/instances` | Listar instancias del usuario |
| POST | `/api/v1/instances` | Crear nueva instancia |
| GET | `/api/v1/rooms` | Listar habitaciones |
| POST | `/api/v1/rooms` | Crear habitación |
| GET | `/api/v1/rooms/:id/metrics` | Métricas históricas |
| POST | `/api/v1/rooms/:roomId/actuators/:deviceType/command` | Enviar comando a actuador |
| GET | `/api/v1/rooms/:id/actions` | Historial de acciones |
| GET | `/api/v1/rooms/:id/alarms` | Alarmas activas |
| GET | `/health` | Health check |

**Rutas de debug:**
- `GET /debug/logs/html` - Vista HTML de logs de debug
- `GET /debug/emulators/html` - Vista HTML de estado de emuladores
- `GET /debug/status` - Estado general del sistema

---

### 3.3 Base de Datos (PostgreSQL)

**Puerto expuesto:** 6543 (interno 5432)

**Responsabilidades:**
- Persistencia de todos los datos del sistema.
- Modelo relacional para usuarios, instancias, habitaciones, emuladores, ciclos, mediciones, acciones y alarmas.

**Modelo de datos:**

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │     instances   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──1:N──│ id (PK)         │
│ email           │       │ userId (FK)     │
│ password        │       │ name            │
│ createdAt       │       │ status          │
└─────────────────┘       └────────┬────────┘
                                   │
                                   │ 1:N
                                   ▼
                         ┌─────────────────┐       ┌─────────────────┐
                         │     rooms       │       │   emulators     │
                         ├─────────────────┤       ├─────────────────┤
                         │ id (PK)         │──1:1──│ id (PK)         │
                         │ instanceId (FK) │       │ roomId (FK)     │
                         │ name            │       │ externalId      │
                         │ status          │       │ status          │
                         └────────┬────────┘       └─────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │  cycles   │ │  devices  │ │room_setups│
            ├───────────┤ ├───────────┤ ├───────────┤
            │ id (PK)   │ │ id (PK)   │ │ roomId(FK)│
            │ roomId(FK)│ │ roomId(FK)│ │ minisplit │
            │ startedAt │ │ type      │ │ purifier  │
            │ endedAt   │ │ name      │ │ extractor │
            └─────┬─────┘ └───────────┘ └───────────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
   ┌────────────┐  ┌────────────┐
   │ cycle_     │  │device_     │
   │measurements│  │actions     │
   ├────────────┤  ├────────────┤
   │ id (PK)    │  │ id (PK)    │
   │ cycleId(FK)│  │ cycleId(FK)│
   │ roomId(FK) │  │ roomId(FK) │
   │ temperature│  │ deviceType │
   │ humidity   │  │ action     │
   │ co2        │  │ reason     │
   │ pm25       │  │ level      │
   │ measuredAt │  │            │
   └────────────┘  └────────────┘
```

**Tablas principales:**

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema con email y password hasheado |
| `instances` | Instancias de un usuario (contenedor de habitaciones) |
| `rooms` | Habitaciones monitoreadas (idle, monitoring, alarm) |
| `emulators` | Emuladores IoT asignados a habitaciones |
| `room_setups` | Configuración de actuadores por habitación |
| `devices` | Dispositivos lógicos por habitación |
| `cycles` | Ciclos de medición (abiertos o cerrados) |
| `cycle_measurements` | Mediciones individuales de sensores |
| `device_actions` | Acciones ejecutadas sobre actuadores |
| `device_states` | Estado actual de dispositivos |
| `alarms` | Alarmas generadas por el sistema |

---

### 3.4 Broker MQTT (EMQX)

**Puerto TCP:** 1883
**Puerto WebSocket:** 8084
**Dashboard:** 18083

**Responsabilidades:**
- Broker de mensajes MQTT para comunicación entre componentes.
- Permite publicación y suscripción a tópicos con QoS configurable.
- Gestiona la entrega de mensajes entre emuladores y API.

**Configuración de tópicos:**

| Tópico | Dirección | Descripción |
|--------|-----------|-------------|
| `safeair/{emulatorId}/telemetry` | Emulador → API | Telemetría de sensores |
| `safeair/{emulatorId}/actuator-state` | API → Emulador | Comandos a actuadores |
| `safeair/{emulatorId}/config` | API → Emulador | Configuración del emulador |
| `safeair/{roomId}/actions` | API → Suscriptores | Acciones de actuadores |
| `safeair/{roomId}/alarms` | API → Suscriptores | Alarmas generadas |

**Características:**
- Permite conexiones anónimas (`EMQX_ALLOW_ANONYMOUS=true`) para desarrollo.
- QoS configurable (0, 1, o 2) para有不同的 entrega guarantees.
- Persistencia de mensajes mediante volúmenes Docker.

---

### 3.5 Emuladores IoT (Java Spring Boot)

**Ubicación:** `/home/jbenitez/DSR_Jorge/Proyecto/SafeAir-System-Emulator`

**Puerto:** 8081 (debug HTTP)

**Responsabilidades:**
- Simular dispositivos IoT que publican telemetría de sensores.
- Escuchar y responder a comandos de actuadores vía MQTT.
- Mantener estado interno de sensores y dispositivos.

**Estructura del código:**

```
SafeAir-System-Emulator/src/main/java/com/safeair/emulator/
├── api/
│   ├── mqtt/          # Cliente MQTT (publicación y suscripción)
│   ├── adapter/       # Adaptadores de datos
│   ├── dto/           # Objetos de transferencia
│   └── client/        # Cliente HTTP
├── config/            # Configuración Spring Boot
├── emulation/
│   ├── core/          # Emulator.java, TelemetryPayload
│   └── impl/          # MiniSplit, Purifier, Extractor
├── manager/           # EmulatorManager
└── emulation/         # Simulación física
```

**Dispositivos simulados:**

| Dispositivo | Comandos soportados | Descripción |
|-------------|---------------------|-------------|
| MiniSplit (Aire acondicionado) | `minisplit_on`, `minisplit_off`, `minisplit_set_24` | Control de temperatura ambiente |
| Purificador | `purifier_on`, `purifier_off` | Purificación de aire |
| Extractor | `extractor_on`, `extractor_off` | Extracción de aire viciado |

**Perfiles configurables:**
- `production`: Configuración por defecto
- `profile1`: 2 emuladores (EMU-0001, EMU-0002)

**Variables de entorno:**
```bash
MQTT_HOST=mqtt                    # Host del broker EMQX
MQTT_PORT=1883                    # Puerto MQTT
MQTT_TLS_ENABLED=false             # Sin TLS para desarrollo
SAFEAIR_EMULATOR_ID_1=EMU-0001    # ID del primer emulador
SAFEAIR_EMULATOR_ID_2=EMU-0002    # ID del segundo emulador
SPRING_PROFILES_ACTIVE=profile1   # Perfil activo
```

---

## 4. Modelo de Datos

### Relaciones entre entidades

```
User (1) ──────< Instance (N)
Instance (1) ──< Room (N)
Room (1) ──────< Cycle (N)
Room (1) ──────< Emulator (1)
Room (1) ──────< RoomSetup (1)
Room (1) ──────< Device (N)
Cycle (1) ─────< CycleMeasurement (N)
Cycle (1) ─────< DeviceAction (N)
Cycle (1) ─────< Alarm (N)
```

### Estado de las habitaciones

Las habitaciones pueden tener tres estados:

| Estado | Descripción |
|--------|-------------|
| `idle` | Sin actividad, no se monitorea |
| `monitoring` | Activa, recibiendo telemetría |
| `alarm` | En estado de alarma (parámetros críticos) |

### Estado de los emuladores

| Estado | Descripción |
|--------|-------------|
| `online` | Conectado y enviando telemetría |
| `offline` | Desconectado o sin comunicación |

---

## 5. Flujo de Comunicación MQTT

### 5.1 Telemetría (Emulador → API)

```
┌────────────┐     publish      ┌──────────┐    subscribe     ┌─────────┐
│ Emulador    │ ───────────────►│   EMQX   │ ◄─────────────── │   API   │
│ (Java)      │ safeair/+/telemetry│        │                 │         │
└────────────┘                 └──────────┘                  └────┬────┘
                                                                    │
                                                                    ▼
                                                            ┌─────────────┐
                                                            │  Persistir  │
                                                            │Measurement  │
                                                            └─────────────┘
```

**Payload de telemetría:**
```json
{
  "emulatorId": "EMU-0001",
  "timestamp": "2026-06-10T12:00:00Z",
  "roomId": "uuid-de-room",
  "temperature": 23.5,
  "humidity": 65.2,
  "co2": 450,
  "pm25": 12,
  "deviceStates": {
    "minisplit": { "isOn": true, "targetTemperature": 24 },
    "purifier": { "isOn": true },
    "extractor": { "isOn": false }
  }
}
```

### 5.2 Comandos a actuadores (API → Emulador)

```
┌─────────┐     publish      ┌──────────┐    subscribe     ┌────────────┐
│   API   │ ───────────────►│   EMQX   │ ◄─────────────── │  Emulador  │
│         │ safeair/+/actuator-state  │                  │  (Java)    │
└─────────┘                 └──────────┘                  └────────────┘
```

**Payload de comando:**
```json
{
  "roomId": "uuid-de-room",
  "roomName": "Sala de Reuniones",
  "deviceType": "minisplit",
  "deviceIndex": 1,
  "action": "turn_on",
  "value": true,
  "source": "frontend",
  "timestamp": "2026-06-10T12:05:00Z"
}
```

### 5.3 Alarmas y acciones (API → Suscriptores)

```
┌─────────┐     publish      ┌──────────┐    subscribe     ┌──────────────┐
│   API   │ ───────────────►│   EMQX   │ ◄─────────────── │   Frontend   │
│         │ safeair/+/alarms│          │                  │   (WebSocket)│
└─────────┘                 └──────────┘                  └──────────────┘
```

---

## 6. Motor de Reglas y Lógica de Negocio

### RuleEvaluationService

El servicio de evaluación de reglas analiza cada medición de telemetría y determina:

1. **Acciones a ejecutar:** Comandos a actuadores basándose en los valores de sensores.
2. **Alarmas a generar:** Notificaciones cuando los parámetros están fuera de rango.

### Reglas de acciones

| Condición | Acción | Nivel |
|-----------|--------|-------|
| Temperatura > 30°C | Encender minisplit (cooling) | High |
| Temperatura > 26°C | Encender minisplit (cooling) | Medium |
| Temperatura < 18°C | Apagar minisplit | - |
| Humedad > 85% | Encender extractor | Medium |
| Humedad > 70% | Encender purificador | Medium |
| CO2 > 2000 ppm | Encender extractor | High |
| CO2 > 1200 ppm | Encender extractor | Medium |
| PM2.5 > 35 µg/m³ | Encender extractor | Medium |

### Reglas de alarmas

| Tipo | Condición | Severidad |
|------|-----------|-----------|
| `critical_persistence` | 5+ ciclos con valores críticos | High |
| `abrupt_change` | Cambio >20% respecto a medición anterior | Medium |
| `no_improvement` | 3+ acciones sin mejora observable | Medium |
| `abrupt_change` | Temperatura < 18°C | Low |

### Flujo de evaluación

```
TelemetryReceived
      │
      ▼
┌─────────────────┐
│ Validar payload │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Resolver emulador       │
│ (EmulatorResolutionService)│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Abrir/crear ciclo       │
│ (CycleRepository)       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Guardar medición        │
│ (createMeasurement)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Obtener medición        │
│ anterior y contadores   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Evaluar reglas          │
│ (RuleEvaluationService)  │
│                          │
│ • Acciones              │
│ • Alarmas               │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Acciones│ │ Alarmas │
│ ejecutar│ │ generar │
└───┬────┘ └───┬────┘
    │         │
    ▼         ▼
┌──────────────────────┐
│ Publicar vía MQTT    │
│ (DeviceActionService)│
│ (AlarmService)       │
└──────────────────────┘
```

---

## 7. Flujo de Telemetría de Sensores

### Paso a paso

1. **El emulador Java** publica un mensaje MQTT al tópico `safeair/{emulatorId}/telemetry` con los valores de sensores.

2. **El broker EMQX** recibe el mensaje y lo reenvía a todos los suscriptores del tópico.

3. **El MQTT Gateway** de la API recibe el mensaje, lo decodifica y delega al `TelemetryIngestionService`.

4. **TelemetryIngestionService**:
   - Valida el payload con Zod schema.
   - Resuelve el emulador y su habitación asociada.
   - Abre o crea un ciclo de medición.
   - Persiste la medición en `cycle_measurements`.
   - Evalúa las reglas.
   - Genera acciones y alarmas.
   - Persiste acciones y alarmas.

5. **DeviceActionService y AlarmService**:
   - Persisten las acciones/alarmas en la base de datos.
   - Publican eventos a los tópicos correspondientes.

6. **El frontend** recibe las actualizaciones via MQTT WebSocket y actualiza los widgets del dashboard.

### Validación de emuladores

El `EmulatorResolutionService` implementa la lógica de seguridad:

1. Si el emulador existe y tiene una habitación asignada → permite la telemetría.
2. Si el emulador existe pero no tiene habitación → rechaza con error `EMULATOR_UNASSIGNED`.
3. Si el emulador no existe y la estrategia es `reject` → rechaza con `EMULATOR_NOT_FOUND`.
4. Si el emulador no existe y la estrategia es `auto-provision` → lo crea automáticamente.

---

## 8. Flujo de Control de Actuadores

### Control manual (Frontend → API → Emulador)

```
┌──────────┐    click botón    ┌─────────┐     POST /command    ┌─────────┐
│ Frontend │ ────────────────►│   API   │ ──────────────────►│  EMQX   │
│ (Angular)│                   │         │                     │         │
└──────────┘                   └────┬────┘                     └────┬────┘
                                   │                              │
                                   ▼                              │
                            ┌────────────┐                        │
                            │ Validar   │                        │
                            │ parámetros│                        │
                            └────┬─────┘                        │
                                   │                              │
                                   ▼                              │
                            ┌────────────┐                        │
                            │ Resolver   │                        │
                            │ emulador   │                        │
                            └────┬─────┘                        │
                                   │                              │
                                   ▼                              │
                            ┌────────────┐                        │
                            │ Publicar  │                        │
                            │ comando   │                        │
                            └────┬─────┘                        │
                                   │                              ▼
                            ┌────────────┐               ┌────────────┐
                            │ Persistir  │               │  Emulador  │
                            │ acción    │               │  (Java)   │
                            └────────────┘               └────────────┘
```

### Control automático (Rule Engine → API → Emulador)

1. El `RuleEvaluationService` detecta que la temperatura supera 30°C.
2. Genera una acción: `{ deviceType: "minisplit", action: "cooling_on", level: "high" }`.
3. El `DeviceActionService` crea el registro y publica al tópico MQTT.
4. El emulador recibe el comando, actualiza su estado interno y responde con la nueva telemetría.

### Comandos soportados

| DeviceType | Actions | Values |
|------------|---------|--------|
| `minisplit` | `turn_on`, `turn_off`, `set_temperature` | `true`/`false` o número (°C) |
| `purifier` | `turn_on`, `turn_off` | `true`/`false` |
| `extractor` | `turn_on`, `turn_off` | `true`/`false` |

---

## 9. Sistema de Alarmas

### Tipos de alarmas

| Tipo | Descripción | Severidad |
|------|-------------|-----------|
| `critical_persistence` | Valores críticos persistentes por 5+ ciclos | High |
| `abrupt_change` | Cambio abrupto >20% en cualquier parámetro | Medium/Low |
| `no_improvement` | Acciones ejecutadas sin mejora | Medium |
| `invalid_configuration` | Configuración inválida del sistema | - |

### Flujo de alarmas

```
RuleEvaluationService.evaluate()
      │
      ▼
┌─────────────────────┐
│ Genera Alarmas     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ AlarmService        │
│ .createAndPublish() │
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────────┐
│ Persist│ │ Publicar  │
│ Alarm  │ │ a tópico  │
│        │ │ MQTT      │
└────────┘ └────────────┘
```

### Consulta de alarmas

El frontend puede consultar alarmas activas o históricas:
- `GET /api/v1/rooms/:id/alarms` - Lista de alarmas con filtros de fecha.
- `GET /api/v1/rooms/:id/alarms/active` - Solo alarmas activas.

---

## 10. Autenticación y Seguridad

### Flujo de autenticación

```
┌──────────┐    POST /auth/register    ┌─────────┐
│ Frontend │ ────────────────────────►│   API   │
│          │ ◄────────────────────────│         │
│          │    { token, user }        └─────────┘
└──────────┘
     │
     │ POST /auth/login
     ▼
┌──────────┐    JWT Token              ┌─────────┐
│ Frontend │ ────────────────────────►│   API   │
│          │ ◄────────────────────────│         │
│          │    200 OK                └─────────┘
└──────────┘
```

### JWT (JSON Web Tokens)

- **Secret:** Configurado via `JWT_SECRET` en variables de entorno.
- **Expiración:** 24 horas por defecto (`JWT_EXPIRES_IN=24h`).
- **Payload típico:**
```json
{
  "sub": "user-uuid",
  "email": "admin@safeair.local",
  "iat": 1717939200,
  "exp": 1718025600
}
```

### OTP (One-Time Password)

- Por defecto, el sistema requiere verificación OTP para login.
- Para desarrollo local/demo, se puede omitir con `AUTH_SKIP_OTP=true`.
- En producción, se envía código por email usando configuración SMTP.

### Middleware de autenticación

Todos los endpoints protegidos usan el middleware `authMiddleware`:
1. Extrae el token del header `Authorization: Bearer <token>`.
2. Verifica la firma del JWT.
3. Decodifica el payload y agrega `req.auth` con los datos del usuario.
4. Si el token es inválido o expirado, responde con 401.

---

## 11. Gestión de Emuladores

### Modelo operativo

El sistema usa un **modelo multiusuario personalizado con pool de emuladores libres**:

1. **Usuario crea instancia** → Contenedor de habitaciones.
2. **Usuario crea habitaciones** → 1 a 3 por instancia.
3. **Sistema asigna emulador libre** → Si existe uno operativo disponible.
4. **Si no hay emulador libre** → La habitación queda marcada sin emulador.
5. **Usuario configura variables** → Copia los `emulatorExternalId` al archivo `.env.docker`.
6. **Se levanta el emulador** → Con los IDs correspondientes.

### Resolución de emuladores

```
EmulatorResolutionService.resolveOrProvision(externalId)
      │
      ▼
┌─────────────────────────┐
│ Buscar emulador por     │
│ externalId en BD       │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │ Existe? │
    └────┬────┘
   Sí     No
    │      │
    ▼      ▼
┌─────────┐ ┌─────────────────────┐
│ ¿Tiene  │ │ Estrategia = reject?│
│ roomId? │ └─────────┬───────────┘
└───┬─────┘           │
Sí   No                │
 │   │                 │
 │   ▼                 │
 │ ┌─────────────────┐ │
 │ │ EMULATOR_UNASSIGNED│ │
 │ │ (Error 409)      │ │
 │ └─────────────────┘ │
 │                    Sí  No
 │                     │   │
 ▼                     ▼   ▼
┌──────────────────┐    ┌──────────┐
│ Retornar roomId  │    │ Auto-   │
│ y externalId     │    │ provision│
└──────────────────┘    └─────┬────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Crear en BD  │
                       │ (roomId=null)│
                       └──────────────┘
```

### Configuración de emuladores en Docker Compose

```yaml
emulator-java:
  environment:
    SAFEAIR_EMULATOR_ID_1: ${SAFEAIR_EMULATOR_ID_1:-EMU-U001-R001}
    SAFEAIR_EMULATOR_ID_2: ${SAFEAIR_EMULATOR_ID_2:-EMU-U001-R002}
    SAFEAIR_EMULATOR_ID_3: ${SAFEAIR_EMULATOR_ID_3:-EMU-U001-R003}
```

Los IDs se obtienen de la base de datos después de crear las habitaciones:
```bash
docker compose exec -T db psql -U postgres -d safeair -c '
SELECT u.email, r.name AS room_name, e."emulatorExternalId"
FROM users u
JOIN instances i ON i."userId" = u.id
JOIN rooms r ON r."instanceId" = i.id
LEFT JOIN emulators e ON e."roomId" = r.id
ORDER BY u.email, r.name;
'
```

---

## 12. Endpoints de Debug

El API expone endpoints de debug para diagnóstico durante desarrollo y validación:

| Endpoint | Descripción |
|----------|-------------|
| `GET /debug/logs/html` | Vista HTML con logs de eventos del sistema |
| `GET /debug/emulators/html` | Vista HTML con estado actual de emuladores |
| `GET /debug/status` | JSON con métricas del sistema (conexiones MQTT, etc.) |

### DebugLogsService

El servicio de logs de debug mantiene un buffer circular en memoria con los últimos eventos del sistema. Cada evento incluye:

```typescript
interface DebugLog {
  timestamp: string;    // ISO 8601
  level: 'info' | 'warn' | 'error';
  source: 'mqtt' | 'postgres' | 'api' | 'frontend' | 'mqtt-published';
  event: string;
  message: string;
  details?: Record<string, unknown>;
  roomId?: string;
  emulatorId?: string;
}
```

Los logs se categorizan por fuente:
- `mqtt`: Mensajes MQTT recibidos
- `postgres`: Operaciones de base de datos
- `api`: Solicitudes API
- `frontend`: Comandos desde el frontend
- `mqtt-published`: Mensajes publicados a MQTT

---

## 13. Configuración y Variables de Entorno

### Variables de la API

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Entorno de ejecución |
| `PORT` | `3000` | Puerto del servidor |
| `DB_HOST` | - | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | - | Nombre de la base de datos |
| `DB_USER` | - | Usuario de PostgreSQL |
| `DB_PASSWORD` | - | Contraseña de PostgreSQL |
| `MQTT_URL` | - | URL del broker MQTT |
| `MQTT_CLIENT_ID` | `safeair-api` | ID del cliente MQTT |
| `MQTT_TELEMETRY_TOPIC` | `safeair/+/telemetry` | Tópico de telemetría |
| `MQTT_ACTUATOR_STATE_TOPIC` | `safeair/+/actuator-state` | Tópico de comandos |
| `MQTT_QOS` | `1` | Nivel de QoS MQTT |
| `CORS_ORIGINS` | - | Orígenes permitidos para CORS |
| `AUTH_SKIP_OTP` | `false` | Omitir verificación OTP |
| `JWT_SECRET` | - | Secreto para firmar JWT |
| `JWT_EXPIRES_IN` | `24h` | Tiempo de expiración del JWT |
| `EMULATOR_MISSING_STRATEGY` | `reject` | Estrategia para emuladores desconocidos |

### Variables del Frontend

| Variable | Descripción |
|----------|-------------|
| `API_BASE_URL` | URL base del API (configurable al build) |
| `MQTT_BROKER_URL` | URL del broker MQTT para WebSocket |

### Variables del Emulador

| Variable | Default | Descripción |
|----------|---------|-------------|
| `MQTT_HOST` | `localhost` | Host del broker EMQX |
| `MQTT_PORT` | `1883` | Puerto MQTT |
| `MQTT_TLS_ENABLED` | `false` | Habilitar TLS |
| `SAFEAIR_EMULATOR_ID_1` | - | ID del primer emulador |
| `SAFEAIR_EMULATOR_ID_2` | - | ID del segundo emulador |
| `SAFEAIR_EMULATOR_ID_3` | - | ID del tercer emulador |
| `SPRING_PROFILES_ACTIVE` | `production` | Perfil de Spring Boot |

---

## 14. Modos de Despliegue

### 14.1 Modo Local (All-in-One)

Todos los servicios en una sola máquina usando Docker Compose:

```bash
docker compose --env-file .env.docker up --build -d db mqtt api frontend
```

Servicios levantados:
- PostgreSQL (puerto 6543)
- EMQX (puertos 1883, 8084, 18083)
- API (puerto 3000)
- Frontend (puerto 8080)

Para levantar emuladores (después de crear habitaciones):
```bash
docker compose --env-file .env.docker up -d emulator-java
```

### 14.2 Modo Distribuido (LAN/VPN)

Cada servicio en una máquina diferente, comunicándose por IPs de red privada:

```
┌──────────────────────────────────────────────────────────────┐
│                    MODO DISTRIBUIDO                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Laptop Fedora          Laptop Windows       Laptop Ubuntu  │
│  ┌────────────┐        ┌────────────┐       ┌────────────┐│
│  │ PostgreSQL │        │    API     │       │  Frontend   │
│  │ 10.10.0.10  │◄──────►│ 10.10.0.20  │◄─────►│ 10.10.0.30  │
│  │ Puerto 5432│        │  Puerto3000 │       │  Puerto8080 ││
│  └─────┬──────┘        └────────────┘       └─────────────┘│
│        │                                                    
│   ┌────┴────┐                                         
│   │   EMQX  │                                            
│   │10.10.0.10│◄──────────────────────────────────────────────│
│   │Puerto1883│    ▲                ▲                ▲       │
│   └─────────┘    │                │                │         │
│                  │                │                │         │
│              ┌───┴───┐        ┌───┴───┐        ┌───┴───┐   │
│              │Emul. 1│        │Emul. 2│        │Emul. 3│   │
│              │10.10.0│        │10.10.0│        │10.10.0│   │
│              │  .40  │        │  .50  │        │  .60  │   │
│              └───────┘        └───────┘        └───────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 14.3 Credenciales de demo

- **Email:** `admin@safeair.local`
- **Password:** `admin123`

---

## 15. Diagrama de Arquitectura

```
                            USUARIO
                              │
                              ▼
                    ┌─────────────────┐
                    │    BROWSER      │
                    │   (Angular)     │
                    │ Puerto: 8080     │
                    └────────┬────────┘
                             │
                  HTTP/REST │ WebSocket/MQTT
                             │
              ┌─────────────┴──────────────┐
              │                              │
              ▼                              ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   API BACKEND   │           │   MQTT BROKER   │
    │   (Express)     │           │   (EMQX)        │
    │   Puerto: 3000  │           │   Puerto: 1883  │
    └────────┬────────┘           │   Puerto: 8084  │
             │                    └────────┬────────┘
             │                             │
      ┌──────┴──────┐                      │
      │             │                      │
      ▼             ▼                      ▼
┌───────────┐ ┌───────────┐       ┌─────────────────┐
│ PostgreSQL│ │ EMULADORES│       │   FRONTEND       │
│ Puerto:   │ │ (Java)    │       │   (MQTT sub)    │
│ 6543       │ │ Puerto:  │       │                  │
└───────────┘ │ 8081      │       └─────────────────┘
              └───────────┘

Flujo de datos:
1. HTTP/REST: Frontend ↔ API ↔ PostgreSQL
2. MQTT: Emuladores → API (telemetría)
3. MQTT: API → Emuladores (comandos)
4. WebSocket: EMQX → Frontend (alarmas, acciones)
```

---

## Resumen Ejecutivo

**SafeAir** es una plataforma IoT completa para monitoreo y control de calidad del aire en espacios cerrados. El sistema se compone de:

1. **Frontend Angular** - Interfaz de usuario con dashboard en tiempo real.
2. **API Node.js/Express** - Lógica de negocio, gestión de datos y comunicación MQTT.
3. **PostgreSQL** - Persistencia de todos los datos del sistema.
4. **EMQX** - Broker MQTT para comunicación en tiempo real.
5. **Emuladores Java** - Simulación de dispositivos IoT que publican telemetría.

El flujo principal es:
- Los **emuladores** publican telemetría de sensores (temperatura, humedad, CO2, PM2.5) al broker MQTT.
- La **API** recibe esta telemetría, la persiste, y evalúa reglas de negocio.
- Según las reglas, la **API** envía comandos a los actuadores (minisplit, purificador, extractor).
- El **frontend** muestra los datos en tiempo real y permite control manual.

El sistema soporta múltiples usuarios, cada uno con sus propias instancias y habitaciones, y puede desplegarse en modo local (todo en una máquina) o distribuido (servicios en diferentes máquinas conectadas por LAN/VPN).

---

*Documento generado automáticamente.*
*SafeAir - Proyecto de Desarrollo de Sistemas en Red.*
*Junio 2026*
