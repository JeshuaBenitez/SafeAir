# SafeAir - Comparativa: Estado Anterior vs Estado Actual

> **Fecha:** 10 de Junio de 2026
> **Documento:** Comparación de funcionalidades
> **Versión anterior del análisis:** `SAFE-AIR-ANALISIS-SISTEMA.md`

---

## Tabla de Contenidos

1. [Resumen de Cambios](#1-resumen-de-cambios)
2. [Nuevos Endpoints de la API](#2-nuevos-endpoints-de-la-api)
3. [CLI: safeairctl](#3-cli-safeairctl)
4. [Modificaciones en Controladores Existentes](#4-modificaciones-en-controladores-existentes)
5. [Nuevos Tópicos MQTT](#5-nuevos-tópicos-mqtt)
6. [Nuevos Servicios y Repositorios](#6-nuevos-servicios-y-repositorios)
7. [Mejoras en Gestión de Emuladores](#7-mejoras-en-gestión-de-emuladores)
8. [Mejoras en Gestión de Usuarios](#8-mejoras-en-gestión-de-usuarios)
9. [Mejoras en Gestión de Rooms](#9-mejoras-en-gestión-de-rooms)
10. [Sistema de Logs Mejorado](#10-sistema-de-logs-mejorado)
11. [Middlewares de Seguridad](#11-middlewares-de-seguridad)
12. [Comparativa de Endpoints](#12-comparativa-de-endpoints)
13. [Flujos de Datos Nuevos](#13-flujos-de-datos-nuevos)
14. [Limitaciones Conocidas](#14-limitaciones-conocidas)
15. [Acciones Pendientes](#15-acciones-pendientes)

---

## 1. Resumen de Cambios

### Antes (Estado documentado)
- API con endpoints básicos de telemetría y actuadores
- Sin CLI para gestión
- Endpoints de debug limitados
- Gestión manual de emuladores
- Sin gestión completa de usuarios desde API

### Ahora (Estado actual)
- **11 routers** en la API (antes eran ~5-6)
- **CLI completo** `safeairctl` con gestión de auth, usuarios, rooms, emuladores, actuadores y logs
- **Endpoints de emuladores** completos: list, free, assigned, get, assign, release, scenario, config, command
- **Endpoints de usuarios** completos: list, get, create, update, update-email, update-password, update-status
- **Endpoints de logs** con filtrado por tipo, nivel, room y emulador
- **Nuevo middleware** `admin.middleware.ts` para protección de rutas administrativas
- **Tópicos MQTT adicionales**: `scenario`, `commands`, `config`
- **RoomService** refactorizado con lógica de dominio para auto-asignación de emuladores

---

## 2. Nuevos Endpoints de la API

### 2.1 Router de Emuladores (`/api/v1/emulators`)

| Método | Ruta | Descripción | Permiso |
|--------|------|-------------|---------|
| GET | `/` | Listar todos los emuladores accesibles | Auth |
| GET | `/free` | Listar emuladores sin asignar | Admin |
| GET | `/assigned` | Listar emuladores asignados | Auth |
| GET | `/:emulatorExternalId` | Obtener detalles de un emulador | Auth |
| POST | `/:emulatorExternalId/assign` | Asignar emulador a una habitación | Admin |
| POST | `/:emulatorExternalId/release` | Liberar emulador de su habitación | Admin |
| POST | `/:emulatorExternalId/scenario` | Enviar escenario al emulador | Auth |
| POST | `/:emulatorExternalId/config` | Enviar configuración al emulador | Auth |
| POST | `/:emulatorExternalId/command` | Enviar comando directo al emulador | Auth |

**Antes:** No existía este router. La gestión de emuladores era solo interna.

**Ahora:** API REST completa para gestión de emuladores.

### 2.2 Router de Usuarios (`/api/v1/users`)

| Método | Ruta | Descripción | Permiso |
|--------|------|-------------|---------|
| GET | `/` | Listar todos los usuarios | Admin |
| GET | `/:id` | Obtener usuario por ID | Admin |
| GET | `/?email=x` | Buscar usuario por email | Admin |
| POST | `/` | Crear nuevo usuario | Admin |
| PATCH | `/:id` | Actualizar perfil (firstName, lastName, role) | Admin |
| PATCH | `/:id/email` | Cambiar email del usuario | Admin |
| PATCH | `/:id/password` | Cambiar contraseña | Admin |
| PATCH | `/:id/status` | Cambiar estado (habilitado/deshabilitado) | Admin |

**Antes:** Solo existía `GET /api/v1/users?email=x` básico.

**Ahora:** CRUD completo con validaciones y límites de operadores.

### 2.3 Router de Logs (`/api/v1/logs`)

| Método | Ruta | Descripción | Permiso |
|--------|------|-------------|---------|
| GET | `/` | Listar logs con filtros | Auth |
| GET | `?type=api` | Filtrar logs de API | Auth |
| GET | `?type=emulator` | Filtrar logs de emuladores | Auth |
| GET | `?type=mqtt` | Filtrar logs MQTT | Auth |
| GET | `?roomId=x` | Filtrar logs por habitación | Auth |
| GET | `?emulator=x` | Filtrar logs por emulador | Auth |
| GET | `?level=error` | Filtrar por nivel (info, warn, error) | Auth |
| GET | `?limit=50` | Limitar cantidad de resultados | Auth |

**Antes:** Solo `GET /debug/logs/html` con formato HTML.

**Ahora:** API REST con filtrado granular y salida JSON estructurada.

### 2.4 Router de Rooms - Extensiones

| Método | Ruta | Descripción | Permiso |
|--------|------|-------------|---------|
| GET | `/` | Listar habitaciones | Auth |
| POST | `/` | Crear habitación | Auth |
| GET | `/:id` | Obtener habitación | Auth |
| PATCH | `/:id` | Actualizar habitación | Auth |
| DELETE | `/:id` | Eliminar habitación | Auth |
| GET | `/:id/setup` | Obtener configuración de la habitación | Auth |
| PATCH | `/:id/setup` | Crear/actualizar configuración | Auth |
| GET | `/:id/devices` | Listar dispositivos de la habitación | Auth |
| POST | `/:id/devices` | Crear dispositivo | Auth |
| GET | `/:id/actions` | Historial de acciones | Auth |

**Mejoras:** Integración con RoomService, auto-asignación de emuladores, validación de límites (máx 3 rooms por usuario).

### 2.5 Router de Auth - Extensiones

| Método | Ruta | Descripción | Permiso |
|--------|------|-------------|---------|
| POST | `/login` | Login con email/password | - |
| POST | `/verify-otp` | Verificar código OTP | - |
| POST | `/register` | Registro de usuario | - |
| GET | `/me` | Obtener usuario autenticado | Auth |

**Mejoras:** Endpoint `/me` para que el CLI pueda identificar al usuario actual.

---

## 3. CLI: safeairctl

### 3.1 Descripción General

**Ubicación:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/cli/safeairctl.ts`

El CLI `safeairctl` es una herramienta de línea de comandos para gestionar todos los aspectos del sistema SafeAir sin necesidad del frontend web.

### 3.2 Grupos de Comandos

```
safeairctl <group> <command> [options]

Auth:
  npm run cli -- login --email <email> [--password <pwd>] [--otp <code>]
  npm run cli -- whoami
  npm run cli -- logout

Users (Admin):
  npm run cli -- users list [--json]
  npm run cli -- users get --email <email> [--json]
  npm run cli -- users create --email <email> --password <pwd> [--firstName <name>] [--lastName <name>] [--role admin|operator]
  npm run cli -- users update --email <email> [--firstName <name>] [--lastName <name>] [--role <role>]
  npm run cli -- users update-email --email <email> --newEmail <new>
  npm run cli -- users reset-password --email <email> --password <pwd>
  npm run cli -- users disable --email <email>
  npm run cli -- users enable --email <email>

Rooms:
  npm run cli -- rooms list [--user <email>] [--json]
  npm run cli -- rooms create --name <name> [--instanceId <id>] [--user <email>]
  npm run cli -- rooms rename --roomId <id> --name <name>
  npm run cli -- rooms delete --roomId <id>
  npm run cli -- rooms metrics --roomId <id> [--json]
  npm run cli -- rooms devices --roomId <id> [--json]

Emulators:
  npm run cli -- emulators list [--json]
  npm run cli -- emulators free [--json]
  npm run cli -- emulators assigned [--json]
  npm run cli -- emulators get --id <externalId> [--json]
  npm run cli -- emulators assign --emulator <externalId> --roomId <id> [--json]
  npm run cli -- emulators release --emulator <externalId>
  npm run cli -- emulators scenario --emulator <externalId> --scenario <name>
  npm run cli -- emulators set-temp --emulator <id> --value <temp>
  npm run cli -- emulators set-humidity --emulator <id> --value <humidity>
  npm run cli -- emulators set-co2 --emulator <id> --value <co2>
  npm run cli -- emulators pause --emulator <id>
  npm run cli -- emulators resume --emulator <id>

Actuators:
  npm run cli -- actuators on --roomId <id> --device <type> [--index <n>] [--json]
  npm run cli -- actuators off --roomId <id> --device <type> [--index <n>] [--json]
  npm run cli -- actuators set-temp --roomId <id> --device <type> --value <temp> [--json]

Logs:
  npm run cli -- logs api [--limit <n>] [--json]
  npm run cli -- logs emulators [--limit <n>] [--json]
  npm run cli -- logs room --roomId <id> [--limit <n>] [--json]
  npm run cli -- logs emulator --emulator <id> [--limit <n>] [--json]
  npm run cli -- logs tail [--interval <ms>] [--limit <n>] [--json]
```

### 3.3 Características del CLI

| Característica | Descripción |
|----------------|-------------|
| **Configuración persistente** | Guarda token y URL en `~/.safeairctl.json` |
| **Variables de entorno** | `SAFEAIR_API_URL`, `SAFEAIR_MQTT_URL`, `SAFEAIR_TOKEN` |
| **Autenticación interactiva** | Solicita credenciales si no se proporcionan |
| **Salida flexible** | Tabla para listas, JSON para objetos únicos |
| **Soporte OTP** | Login con verificación de dos factores |
| **Publicación MQTT** | Envío directo de comandos y escenarios |

### 3.4 Ejemplos de Uso

```bash
# Login
npm run cli -- login --email admin@safeair.local --password admin123

# Listar usuarios
npm run cli -- users list

# Crear operador
npm run cli -- users create --email operador@safeair.local --password test123 --firstName "Juan" --lastName "Pérez" --role operator

# Crear habitación
npm run cli -- rooms create --name "Sala de Reuniones"

# Asignar emulador
npm run cli -- emulators assign --emulator EMU-U001-R001 --roomId <room-uuid>

# Enviar escenario
npm run cli -- emulators scenario --emulator EMU-U001-R001 --scenario normal_office

# Controlar actuador
npm run cli -- actuators on --roomId <room-uuid> --device minisplit

# Ver logs en vivo
npm run cli -- logs tail --interval 2000
```

---

## 4. Modificaciones en Controladores Existentes

### 4.1 ActuatorController

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/api/controllers/actuator.controller.ts`

**Cambios realizados:**

| Antes | Ahora |
|-------|-------|
| Solo `turn_on`, `turn_off`, `set_temperature` | Agregados `set_speed`, `set_mode` |
| Payload MQTT básico | Agregado `correlationId` para trazabilidad |
| Sin validación de `deviceIndex` | Validación con límite de 3 unidades |
| `source` solo aceptaba 4 valores | Agregado `safeairctl` como fuente válida |
| Sin normalización de valores | Función `normalizeActionValue()` para tipos |

**Nuevo payload MQTT:**
```typescript
const mqttPayload = {
  correlationId: randomUUID(),  // NUEVO: ID único para trazabilidad
  roomId,
  roomName: room.name,
  deviceType,
  deviceIndex,
  action,
  value: normalizedValue,
  source,
  timestamp: new Date().toISOString(),
};
```

### 4.2 UserController

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/api/controllers/user.controller.ts`

**Cambios realizados:**

| Antes | Ahora |
|-------|-------|
| Sin CRUD completo | CRUD completo con validaciones |
| Sin límite de operadores | Límite de operadores configurable (`MAX_SUPPORTED_OPERATORS`) |
| Sin normalización de nombres | Función `buildFullName()` y `splitName()` |
| Sin validación de email | Normalización y validación de formato email |
| Sin verificación de password | Validación de longitud mínima (6 caracteres) |

**Nuevas funcionalidades:**
- Creación de usuarios con rol (admin/operator)
- Actualización de perfil (firstName, lastName, role)
- Cambio de email con verificación de duplicados
- Cambio de contraseña con hash bcrypt
- Límite de operadores en el sistema

### 4.3 RoomController

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/api/controllers/room.controller.ts`

**Cambios realizados:**

| Antes | Ahora |
|-------|-------|
| Lógica inline en controller | Uso de `RoomService` con lógica de dominio |
| Sin gestión de setup | Endpoints GET/PATCH para `setup` de habitación |
| Sin límite de rooms | Validación de máximo 3 rooms por usuario |
| Sin gestión de devices | Endpoints GET/POST para devices |
| Sin auto-asignación de emuladores | `RoomService.create()` auto-asigna emulador libre |

---

## 5. Nuevos Tópicos MQTT

### 5.1 Tópicos agregados

| Tópico | Dirección | Descripción |
|--------|-----------|-------------|
| `safeair/{emulatorId}/scenario` | API → Emulador | Enviar escenario de simulación |
| `safeair/{emulatorId}/commands` | API → Emulador | Comando directo sin deviceType |
| `safeair/{emulatorId}/config` | API → Emulador | Configuración del emulador |

### 5.2 Escenarios disponibles

Los escenarios permiten cambiar el comportamiento del emulador:

| Escenario | Descripción |
|-----------|-------------|
| `normal_office` | Condiciones normales de oficina |
| `high_co2` | CO2 elevado para pruebas |
| `high_temperature` | Temperatura alta |
| `high_humidity` | Humedad alta |
| `emergency` | Condiciones de emergencia |

### 5.3 Comandos directos al emulador

| Comando | Valor | Descripción |
|---------|-------|-------------|
| `set_temperature` | número | Fijar temperatura del emulador |
| `set_humidity` | número | Fijar humedad del emulador |
| `set_co2` | número | Fijar nivel de CO2 |
| `pause` | - | Pausar publicación de telemetría |
| `resume` | - | Reanudar publicación de telemetría |

---

## 6. Nuevos Servicios y Repositorios

### 6.1 RoomService

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/application/services/room.service.ts`

**Responsabilidades:**
- Creación de rooms con auto-asignación de emuladores
- Validación de límites (máx 3 rooms por usuario)
- Gestión de setup de habitaciones
- Publicación de configuración a emuladores
- Gestión de dispositivos por habitación

**Métodos principales:**
```typescript
async create(input: { instanceId?: string; name: string }, userId: string)
async list(userId?: string)
async getById(roomId: string, userId?: string)
async update(roomId: string, input: { name?: string }, userId?: string)
async upsertSetup(roomId: string, setup: RoomSetupInput, userId?: string)
async getSetup(roomId: string, userId?: string)
async listDevices(roomId: string, userId?: string)
async createDevice(input, userId)
async delete(roomId: string, userId?: string)
```

### 6.2 EmulatorController

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/api/controllers/emulator.controller.ts`

**Responsabilidades:**
- Listado de emuladores (todos, libres, asignados)
- Asignación y liberación de emuladores
- Envío de escenarios y configuraciones
- Comandos directos a emuladores

**Métodos principales:**
```typescript
async list(req, res)
async free(req, res)          // Admin only
async assigned(req, res)
async get(req, res)
async assign(req, res)         // Admin only
async release(req, res)       // Admin only
async scenario(req, res)
async config(req, res)
async command(req, res)
```

### 6.3 LogController

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/api/controllers/log.controller.ts`

**Responsabilidades:**
- Consulta de logs del sistema
- Filtrado por tipo, nivel, habitación y emulador
- Paginación con límite configurable

### 6.4 EmulatorRepository - Métodos nuevos

```typescript
async findAllWithRooms()           // Todos con detalles de room
async findAssigned()               // Solo asignados
async findAssignedToUser(userId)   // Asignados a usuario específico
async findFree()                   // Solo libres
async findAllForUserDebug(userId)  // Para debugging de usuario
async findAllGlobalDebug(viewerUserId?) // Para debugging global
```

---

## 7. Mejoras en Gestión de Emuladores

### 7.1 Asignación automática

**Antes:**
1. Usuario crea habitación
2. Administrador manualmente busca emulador libre
3. Administrador asigna emulador a habitación

**Ahora:**
1. Usuario crea habitación via API/CLI
2. `RoomService.create()` llama `assignFirstAvailableToRoom()`
3. Sistema busca automáticamente emulador libre
4. Si existe, lo asigna; si no, registra warning y continua

### 7.2 Estados de emuladores

```
┌─────────────────────────────────────────────────────────┐
│              CICLO DE VIDA DEL EMULADOR                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐    create     ┌─────────────┐            │
│  │   FREE   │─────────────►│  ASSIGNED    │            │
│  │ (sin room)│              │ (a una room) │            │
│  └─────────┘               └──────┬───────┘            │
│                                  │                    │
│         ┌────────────────────────┤                    │
│         │                        │                    │
│         ▼                        ▼                    │
│   ┌───────────┐           ┌─────────────┐             │
│   │  ASSIGNED │◄──────────│  RELEASED   │             │
│   │           │  release() │ (por admin) │             │
│   └───────────┘           └──────┬──────┘             │
│                                  │                    │
│                                  ▼                    │
│                           ┌──────────┐                │
│                           │   FREE   │                │
│                           └──────────┘                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.3 API de emuladores para el CLI

```bash
# Ver emuladores libres
npm run cli -- emulators free

# Ver emuladores asignados
npm run cli -- emulators assigned

# Asignar emulador específico
npm run cli -- emulators assign --emulator EMU-U001-R001 --roomId <uuid>

# Liberar emulador
npm run cli -- emulators release --emulator EMU-U001-R001
```

---

## 8. Mejoras en Gestión de Usuarios

### 8.1 Roles de usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `admin` | Administrador del sistema | CRUD usuarios, asignar emuladores, ver todos los datos |
| `operator` | Operador normal | Gestionar sus propias rooms, ver sus emuladores |

### 8.2 Límite de operadores

El sistema tiene un límite configurable de operadores (`MAX_SUPPORTED_OPERATORS`). Cuando se alcanza el límite:
- No se pueden crear nuevos usuarios con rol `operator`
- Administradores pueden seguir creándose

### 8.3 API de usuarios para el CLI

```bash
# Listar todos los usuarios (admin)
npm run cli -- users list

# Buscar usuario por email
npm run cli -- users get --email admin@safeair.local

# Crear operador
npm run cli -- users create \
  --email operador@safeair.local \
  --password seguro123 \
  --firstName "Juan" \
  --lastName "Pérez" \
  --role operator

# Actualizar datos
npm run cli -- users update --email operador@safeair.local --firstName "Juan Carlos"

# Cambiar email
npm run cli -- users update-email --email operador@safeair.local --newEmail juan@safeair.local

# Reset password
npm run cli -- users reset-password --email operador@safeair.local --password nuevaPass123

# Deshabilitar usuario
npm run cli -- users disable --email operador@safeair.local

# Habilitar usuario
npm run cli -- users enable --email operador@safeair.local
```

---

## 9. Mejoras en Gestión de Rooms

### 9.1 Límite de rooms por usuario

- Máximo 3 habitaciones por usuario
- Validación en `RoomService.create()`
- Mensaje de error claro si se supera el límite

### 9.2 Setup de habitaciones

Cada habitación tiene un `setup` con configuración física:

```typescript
interface RoomSetupInput {
  roomWidth: number;      // metros
  roomLength: number;     // metros
  windowCount: number;    // cantidad de ventanas
  minisplitCount: number; // cantidad de minisplits
  purifierCount: number;  // cantidad de purificadores
  extractorCount: number;// cantidad de extractores
}
```

### 9.3 API de rooms para el CLI

```bash
# Listar rooms
npm run cli -- rooms list

# Listar rooms de un usuario específico (admin)
npm run cli -- rooms list --user otro@safeair.local

# Crear room (auto-asigna emulador si hay disponible)
npm run cli -- rooms create --name "Oficina Principal"

# Renombrar room
npm run cli -- rooms rename --roomId <uuid> --name "Sala de Juntas"

# Ver métricas actuales
npm run cli -- rooms metrics --roomId <uuid>

# Ver dispositivos
npm run cli -- rooms devices --roomId <uuid>

# Eliminar room
npm run cli -- rooms delete --roomId <uuid>
```

---

## 10. Sistema de Logs Mejorado

### 10.1 Fuentes de logs

| Fuente | Descripción |
|--------|-------------|
| `api` | Solicitudes HTTP a la API |
| `mqtt-received` | Mensajes MQTT recibidos |
| `mqtt-published` | Mensajes MQTT publicados |
| `postgres` | Operaciones de base de datos |
| `frontend` | Comandos recibidos del frontend |
| `emulator` | Eventos de emuladores |

### 10.2 Niveles de logs

| Nivel | Uso |
|-------|-----|
| `info` | Operaciones normales |
| `warn` | Situaciones que requieren atención |
| `error` | Errores y fallos |

### 10.3 API de logs para el CLI

```bash
# Ver últimos 20 logs
npm run cli -- logs api

# Ver logs de emuladores
npm run cli -- logs emulators

# Ver logs de una habitación específica
npm run cli -- logs room --roomId <uuid>

# Ver logs de un emulador específico
npm run cli -- logs emulator --emulator EMU-U001-R001

# Monitorear logs en vivo (actualiza cada 3 segundos)
npm run cli -- logs tail --interval 3000

# Limitar resultados
npm run cli -- logs api --limit 50
```

---

## 11. Middlewares de Seguridad

### 11.1 AdminMiddleware

**Archivo:** `/home/jbenitez/DSR_Jorge/Proyecto/Api_Emuladores/src/api/middlewares/admin.middleware.ts`

```typescript
export function adminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== "admin") {
    next(new AppError("Admin permissions required", 403, "ADMIN_REQUIRED"));
    return;
  }
  next();
}
```

### 11.2 Rutas protegidas con admin

| Router | Rutas que requieren admin |
|--------|--------------------------|
| `userRouter` | Todas (`/api/v1/users/*`) |
| `emulatorRouter` | `/free`, `/assigned` (GET), `/assign`, `/release` |

### 11.3 Flujo de autenticación

```
Request
   │
   ▼
authMiddleware (verifica JWT, extrae req.auth)
   │
   ├── Token válido → continúa
   │
   └── Token inválido → 401 Unauthorized
        │
        ▼
   ¿Ruta requiere admin?
   │
   ├── Sí → adminMiddleware
   │        │
   │        ├── Es admin → continúa
   │        │
   │        └── No es admin → 403 Forbidden
   │
   └── No → continúa
```

---

## 12. Comparativa de Endpoints

### 12.1 Resumen de endpoints

| Categoría | Antes | Ahora | Cambio |
|-----------|-------|-------|--------|
| Auth | 4 | 4 | 0 (agregado `/me`) |
| Users | 1 | 8 | +7 |
| Rooms | 5 | 10 | +5 |
| Emulators | 0 | 9 | +9 |
| Logs | 1 (HTML) | 1 (JSON+html) | +1 (REST) |
| Actuators | 1 | 1 | 0 |
| Metrics | 2 | 2 | 0 |
| Alarmas | 2 | 2 | 0 |
| Configuración | 1 | 1 | 0 |
| **TOTAL** | **~17** | **~39** | **+22** |

### 12.2 Endpoints nuevos detallados

#### Users (`/api/v1/users`)
- `GET /` - Listar usuarios
- `POST /` - Crear usuario
- `GET /:id` - Obtener usuario
- `PATCH /:id` - Actualizar usuario
- `PATCH /:id/email` - Cambiar email
- `PATCH /:id/password` - Cambiar password
- `PATCH /:id/status` - Cambiar estado

#### Emulators (`/api/v1/emulators`)
- `GET /` - Listar emuladores
- `GET /free` - Listar libres
- `GET /assigned` - Listar asignados
- `GET /:id` - Detalles de emulador
- `POST /:id/assign` - Asignar a room
- `POST /:id/release` - Liberar
- `POST /:id/scenario` - Enviar escenario
- `POST /:id/config` - Enviar config
- `POST /:id/command` - Enviar comando

#### Logs (`/api/v1/logs`)
- `GET /` - Listar con filtros

---

## 13. Flujos de Datos Nuevos

### 13.1 Flujo de creación de usuario via CLI

```
┌──────────────┐     create        ┌─────────┐     create      ┌────────────┐
│   CLI        │──────────────────►│   API   │─────────────────►│ PostgreSQL │
│ safeairctl   │  POST /users      │         │                  │            │
└──────────────┘                   └─────────┘                  └────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │ Validaciones │
                               │ - email único│
                               │ - password   │
                               │ - límite ops │
                               │ - rol válido │
                               └──────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │ Bcrypt hash  │
                               │ del password │
                               └──────────────┘
```

### 13.2 Flujo de asignación de emulador

```
┌──────────────┐   assign      ┌─────────┐   assignFirstAvailableToRoom   ┌─────────────┐
│   CLI        │──────────────►│   API   │────────────────────────────────►│ EmulatorRepo│
│ safeairctl   │               │         │                                 │             │
└──────────────┘               └────┬────┘                                 └──────┬──────┘
                                   │                                           │
                                   │                                           ▼
                                   │                                   ┌─────────────┐
                                   │                                   │ Buscar      │
                                   │                                   │ emulador    │
                                   │                                   │ libre       │
                                   │                                   └──────┬──────┘
                                   │                                          │
                         ┌─────────┴─────────┐                                 │
                         ▼                   ▼                                 ▼
                   ┌───────────┐      ┌───────────┐                    ┌───────────┐
                   │  Existe   │      │  No existe│                    │ Asignar   │
                   │  emulador │      │  libre    │                    │ roomId    │
                   └─────┬─────┘      └───────────┘                    └─────┬─────┘
                         │                                              │
                         ▼                                              ▼
                   ┌───────────┐                                  ┌───────────┐
                   │ Actualiza │                                  │ Retornar  │
                   │ BD        │                                  │ emulador  │
                   └───────────┘                                  └───────────┘
```

### 13.3 Flujo de envío de escenario

```
┌──────────────┐   scenario   ┌─────────┐   scenarioTopic   ┌──────────┐   subscribe   ┌────────────┐
│   CLI        │─────────────►│   API   │──────────────────►│   EMQX   │──────────────►│  Emulador  │
│ safeairctl   │              │         │                   │          │               │  (Java)    │
└──────────────┘              └─────────┘                   └──────────┘               └────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │ Envelope     │
                            │ { correlationId │
                            │   source,     │
                            │   timestamp,  │
                            │   scenario }  │
                            └──────────────┘
```

---

## 14. Limitaciones Conocidas

### 14.1 UserController - updateStatus

El endpoint `PATCH /api/v1/users/:id/status` devuelve 501 (Not Implemented):

```json
{
  "code": "USER_STATUS_NOT_SUPPORTED",
  "message": "The current users table has no enabled/status column. Add a migration before enabling this operation."
}
```

**Razón:** La tabla `users` no tiene columna `enabled` o `status`.

**Solución pendiente:** Crear migración de base de datos para agregar la columna.

### 14.2 Límite de operadores

El servicio `UserProvisioningService` define `MAX_SUPPORTED_OPERATORS`. Si se alcanza el límite, no se pueden crear más usuarios con rol `operator`.

### 14.3 Límite de rooms

Máximo 3 rooms por usuario, validado en `RoomService.create()`.

### 14.4 Límite de devices

Máximo 3 devices del mismo tipo por room, validado en `RoomService.createDevice()`.

---

## 15. Acciones Pendientes

### 15.1 Alta prioridad

| # | Acción | Responsable | Estado |
|---|--------|-------------|--------|
| 1 | Crear migración para columna `enabled` en tabla `users` | Backend | Pendiente |
| 2 | Documentar CLI en README del proyecto | Docs | Pendiente |
| 3 | Agregar tests para nuevos endpoints | QA | Pendiente |

### 15.2 Media prioridad

| # | Acción | Responsable | Estado |
|---|--------|-------------|--------|
| 1 | Implementar paginación en listados | Backend | Pendiente |
| 2 | Agregar logs de auditoría para operaciones admin | Backend | Pendiente |
| 3 | Documentar escenarios disponibles para emuladores | Docs | Pendiente |

### 15.3 Baja prioridad

| # | Acción | Responsable | Estado |
|---|--------|-------------|--------|
| 1 | Agregar comando `help` al CLI con ejemplos | CLI | Pendiente |
| 2 | Soporte para export/import de configuración | Backend | Pendiente |
| 3 | Dashboard web para administración | Frontend | Pendiente |

---

## 16. Comparación Visual de Cambios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVOLUCIÓN DEL SISTEMA SAFE AIR                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ANTES (Documentación anterior)                                             │
│  ─────────────────────────────────                                          │
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Frontend│◄──►│   API   │◄──►│ Postgres│    │  EMQX   │◄──►│Emuladores│  │
│  │ Angular │    │  Basic  │    │         │    │         │    │  Java   │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                      │                                                        │
│                      ▼                                                        │
│              Endpoints limitados                                             │
│              - Auth (login, register, verify-otp)                           │
│              - Rooms (CRUD básico)                                          │
│              - Actuators (comandos)                                         │
│              - Metrics (historial)                                          │
│              - Debug (HTML)                                                │
│                      │                                                        │
│                      ▼                                                        │
│              Sin CLI                                                         │
│              Sin gestión de usuarios                                         │
│              Sin gestión de emuladores                                       │
│              Sin logs estructurados                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AHORA (Estado actual)                                                      │
│  ────────────────────────                                                   │
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Frontend│◄──►│   API   │◄──►│ Postgres│    │  EMQX   │◄──►│Emuladores│  │
│  │ Angular │    │ Full    │    │         │    │         │    │  Java   │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                      │                                                        │
│                      ▼                                                        │
│              11 Routers con ~39 endpoints                                    │
│              ┌─────────────────────────────────────────────┐               │
│              │ Endpoints nuevos:                            │               │
│              │ - Users (CRUD completo)                      │               │
│              │ - Emulators (assign, release, scenario)     │               │
│              │ - Logs (REST con filtros)                    │               │
│              │ - Room setup y devices                      │               │
│              │ - Auth /me                                  │               │
│              └─────────────────────────────────────────────┘               │
│                      │                                                        │
│                      ▼                                                        │
│              ┌─────────────────────────────────────────────┐               │
│              │ safeairctl - CLI completo                    │               │
│              │ - auth (login, whoami, logout)               │               │
│              │ - users (list, create, update, delete)      │               │
│              │ - rooms (list, create, rename, delete)       │               │
│              │ - emulators (assign, release, scenario)     │               │
│              │ - actuators (on, off, set-temp)            │               │
│              │ - logs (tail, filter)                       │               │
│              └─────────────────────────────────────────────┘               │
│                                                                             │
│  Middlewares nuevos:                                                        │
│  ┌─────────────────────────────────────────────┐                           │
│  │ admin.middleware.ts - Protección de rutas   │                           │
│  │ auth.middleware.ts - Verificación JWT       │                           │
│  │ telemetry-api-key.middleware.ts            │                           │
│  └─────────────────────────────────────────────┘                           │
│                                                                             │
│  Tópicos MQTT nuevos:                                                       │
│  ┌─────────────────────────────────────────────┐                           │
│  │ safeair/{id}/scenario - Escenarios          │                           │
│  │ safeair/{id}/commands - Comandos directos   │                           │
│  │ safeair/{id}/config - Configuración         │                           │
│  └─────────────────────────────────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 17. Resumen de Impacto

| Aspecto | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Endpoints API** | ~17 | ~39 | +130% |
| **Routers** | ~6 | 11 | +83% |
| **Gestión de usuarios** | Solo lectura | CRUD completo | +∞ |
| **Gestión de emuladores** | Ninguna | Completa | +∞ |
| **Sistema de logs** | HTML debug | REST + filtros | +200% |
| **CLI** | No existía | Completo | +∞ |
| **Seguridad** | Solo auth | Auth + Admin | +100% |
| **Auto-asignación** | Manual | Automática | +∞ |

---

*Documento generado el 10 de Junio de 2026*
*SafeAir - Proyecto de Desarrollo de Sistemas en Red*
*Comparativa: Estado Anterior vs Estado Actual*
