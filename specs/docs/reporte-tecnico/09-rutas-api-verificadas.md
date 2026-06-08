# Rutas API Verificadas en Código - SafeAir

Este documento presenta el catálogo completo de rutas expuestas por la API backend de SafeAir. Cada ruta ha sido auditada contra el código fuente real de los enrutadores de Express (`Api_Emuladores/src/api/routes`) y clasificada según su uso y estado de validación técnica.

---

## 1. Tabla General de Rutas de la API

| Método | Ruta | Propósito | Archivo de Ruta | Consumida por Frontend | Estado |
|--------|------|-----------|------------------|------------------------|--------|
| **POST** | `/api/v1/auth/register` | Registrar un nuevo operador en el sistema | `auth.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/auth/login` | Iniciar sesión y emitir JWT (indica si requiere OTP) | `auth.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/auth/verify-otp` | Validar código OTP y emitir JWT definitivo | `auth.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/auth/resend-otp` | Reenviar un nuevo código OTP al correo del usuario | `auth.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/auth/me` | Obtener el perfil del usuario autenticado | `auth.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/instances` | Crear una nueva instancia organizacional (ej. edificio) | `instance.routes.ts` | Sí (Automático) | Confirmada |
| **GET** | `/api/v1/instances` | Listar todas las instancias asociadas al usuario | `instance.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/instances/:id` | Obtener detalles de la instancia (incluye su arreglo de salones `.rooms`) | `instance.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/rooms` | Registrar una nueva aula asociada a una instancia | `room.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms` | Listar todas las aulas del sistema (Global) | *Ninguno* | No | **No implementada directamente** (Devuelve 404) |
| **GET** | `/api/v1/rooms/:id` | Obtener el detalle de una habitación específica | `room.routes.ts` | Sí | Confirmada |
| **PUT** | `/api/v1/rooms/:id` | Modificar datos básicos del aula (nombre) | `room.routes.ts` | No | Confirmada |
| **DELETE**| `/api/v1/rooms/:id` | Eliminar aula y todos sus registros en cascada | `room.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/setup` | Obtener dimensiones físicas del aula | `room.routes.ts` | Sí | Confirmada |
| **PUT** | `/api/v1/rooms/:id/setup` | Guardar/Modificar dimensiones físicas y actuadores | `room.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/devices` | Listar dispositivos actuadores del aula | `room.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/rooms/:id/devices` | Registrar un nuevo actuador físico en el aula | `room.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/actions/history`| Listar historial de comandos enviados en el aula | `room.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/rooms/:roomId/actuators/:deviceType/command` | Enviar comando de control al dispositivo vía MQTT | `actuator.routes.ts` | Sí | Confirmada por prueba manual |
| **POST** | `/api/v1/telemetry` | Ingestar telemetría de sensores desde el emulador (por API Key) | `metrics.routes.ts` | No (Solo Emuladores) | Confirmada |
| **POST** | `/api/v1/actuators/state` | Ingestar estado reportado de actuadores (por API Key) | `metrics.routes.ts` | No (Solo Emuladores) | Confirmada |
| **GET** | `/api/v1/rooms/:id/metrics/current` | Obtener la última telemetría de la habitación en memoria | `metrics.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/metrics/history` | Obtener lecturas de sensores filtradas por rango de fecha | `metrics.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/metrics/history/export` | Exportar histórico de mediciones a formato CSV | `metrics.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/actuators/state` | Consultar estado actual del minisplit, extractor y purificador | `metrics.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/rooms/:id/config/publish` | Publicar configuración física del aula por MQTT al emulador | `configuration.routes.ts`| No | Confirmada |
| **GET** | `/api/v1/rooms/:id/config` | Obtener configuración de inicialización MQTT del aula | `configuration.routes.ts`| No | Confirmada |
| **POST** | `/api/v1/rooms/:id/cycles/start` | Iniciar ciclo de clase/monitoreo del salón | `cycle.routes.ts` | Sí | Confirmada |
| **POST** | `/api/v1/rooms/:id/cycles/close` | Cerrar ciclo de clase/monitoreo del salón | `cycle.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/cycles` | Listar todos los ciclos registrados del aula | `cycle.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/alarms` | Listar historial de alertas ambientales del aula | `alarm.routes.ts` | Sí | Confirmada |
| **GET** | `/api/v1/rooms/:id/alarms/active`| Obtener alertas ambientales actualmente activas en el aula | `alarm.routes.ts` | Sí | Confirmada |
| **GET** | `/debug/logs` | Obtener bitácora de eventos del servidor en formato JSON | `debug.routes.ts` | No | Debug |
| **GET** | `/debug/logs/html` | Panel interactivo en HTML de la bitácora de eventos | `debug.routes.ts` | Sí (Herramienta) | Debug / Confirmada manual |
| **GET** | `/debug/status` | Obtener estado general del sistema (servicios y base de datos) | `debug.routes.ts` | No | Debug |
| **GET** | `/debug/emulators` | Obtener estados en memoria de los emuladores en JSON | `debug.routes.ts` | No | Debug |
| **GET** | `/debug/emulators/html` | Panel interactivo en HTML de estado de emuladores y control manual | `debug.routes.ts` | Sí (Herramienta) | Debug / Confirmada manual |
| **GET** | `/health` | Endpoint básico de salud del servicio (retorna ok) | `app.ts` | No (Wget/Healthcheck)| Confirmada |

---

## 2. Aclaración de Flujo: Obtención de Habitaciones en el Frontend

Como se especifica en la tabla, el endpoint directo `GET /api/v1/rooms` **no existe** en los controladores del backend (por lo que su consulta directa genera un error 404).

Para listar los salones de clase en el Dashboard, el Frontend de SafeAir ejecuta las siguientes consultas estructuradas:
1. Consulta las instancias disponibles asociadas al usuario autenticado mediante `GET /api/v1/instances`.
2. Una vez seleccionada la instancia (o creada la de fallback si es una cuenta nueva), realiza la consulta de detalle `GET /api/v1/instances/{instanceId}`.
3. El JSON de respuesta del backend para esta última llamada devuelve el objeto de la instancia con una propiedad anidada `.rooms` que contiene todas las habitaciones, junto con su respectiva configuración física (`.setup`) y parámetros derivados (`.derivedSetup`).
4. El frontend mapea este arreglo estructurado para renderizar las tarjetas dinámicas del Dashboard.
