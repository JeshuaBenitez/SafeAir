# Modelo de Datos - SafeAir

Este documento define la arquitectura de persistencia relacional implementada en la base de datos PostgreSQL de SafeAir. Para cumplir con los requerimientos académicos del curso, se detalla tanto el modelo físico real operado por el ORM Sequelize como la capa de abstracción compatible con el diccionario de datos del curso.

---

## 1. Diagrama Entidad-Relación Físico (Mermaid ERD)

El siguiente diagrama ilustra las tablas relacionales reales del backend de SafeAir y sus relaciones cardinales:

```mermaid
erDiagram
    users {
        uuid id PK
        string email UNIQUE
        string password_hash
        string first_name
        string last_name
        string role
        string otp_code
        timestamp otp_expires_at
        boolean otp_verified
        timestamp created_at
        timestamp updated_at
    }

    instances {
        uuid id PK
        string name
        string description
        boolean is_active
        uuid user_id FK
        timestamp created_at
        timestamp updated_at
    }

    rooms {
        uuid id PK
        string name
        uuid instance_id FK
        timestamp created_at
        timestamp updated_at
    }

    room_setups {
        uuid id PK
        uuid room_id FK "1:1"
        float room_width
        float room_length
        float room_height
        integer window_count
        float window_area_total
        integer minisplit_count
        integer purifier_count
        integer extractor_count
        timestamp created_at
        timestamp updated_at
    }

    room_setup_derived {
        uuid id PK
        uuid room_id FK "1:1"
        float room_volume
        float room_area
        float window_area_total_derived
        float recommended_purifier_cadr
        float recommended_extractor_flow
        timestamp created_at
        timestamp updated_at
    }

    emulators {
        uuid id PK
        string emulator_external_id UNIQUE
        uuid room_id FK "1:1"
        string status
        timestamp created_at
        timestamp updated_at
    }

    devices {
        uuid id PK
        uuid room_id FK
        string type
        string label
        timestamp created_at
        timestamp updated_at
    }

    cycles {
        uuid id PK
        uuid room_id FK
        timestamp started_at
        timestamp ended_at
        string status
        timestamp created_at
        timestamp updated_at
    }

    cycle_measurements {
        uuid id PK
        uuid cycle_id FK
        timestamp timestamp
        float temperature
        float humidity
        float co2
        float pm25
        timestamp created_at
        timestamp updated_at
    }

    device_states {
        uuid id PK
        uuid device_id FK "1:1"
        boolean is_on
        float target_temperature
        timestamp last_reported_at
        timestamp created_at
        timestamp updated_at
    }

    device_actions {
        uuid id PK
        uuid device_id FK
        string action_type
        string action_value
        string executed_by
        timestamp executed_at
        timestamp created_at
        timestamp updated_at
    }

    alarms {
        uuid id PK
        uuid room_id FK
        string type
        string severity
        string message
        boolean is_active
        timestamp triggered_at
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
    }

    %% Relaciones
    users ||--o{ instances : "crea/administra"
    instances ||--o{ rooms : "contiene"
    rooms ||--|| room_setups : "tiene"
    rooms ||--|| room_setup_derived : "calcula"
    rooms ||--|| emulators : "se vincula a"
    rooms ||--o{ devices : "tiene instalados"
    rooms ||--o{ cycles : "registra histórico en"
    rooms ||--o{ alarms : "dispara"
    devices ||--|| device_states : "mantiene estado"
    devices ||--o{ device_actions : "registra historial"
    cycles ||--o{ cycle_measurements : "persiste lecturas"
```

---

## 2. Diccionario de Datos Físico (Resumen de Tablas Reales)

### 2.1 Tabla `users` (Usuarios y Credenciales)
Almacena las cuentas de operadores y administradores del sistema, incluyendo los campos del flujo de doble factor (2FA OTP).
* `id` (UUID, PK): Identificador único del usuario.
* `email` (VARCHAR, UNIQUE): Correo electrónico (identificador de login).
* `password_hash` (VARCHAR): Contraseña cifrada con bcrypt.
* `first_name` / `last_name` (VARCHAR): Nombre y apellido del operador.
* `role` (VARCHAR): Rol del sistema (ej., `operator`, `admin`).
* `otp_code` (VARCHAR, NULL): Código OTP numérico de un solo uso.
* `otp_expires_at` (TIMESTAMP, NULL): Fecha de expiración del código OTP.
* `otp_verified` (BOOLEAN): Estado de verificación de la sesión OTP.

### 2.2 Tabla `instances` (Instancia de Organización)
Agrupa las aulas de una misma instalación física (por ejemplo, "Campus Central").
* `id` (UUID, PK): Identificador de la instancia.
* `name` (VARCHAR): Nombre descriptivo (ej., "Edificio A").
* `user_id` (UUID, FK): Enlace al usuario creador (`users.id`).
* `is_active` (BOOLEAN): Indica si es la instancia activa en el dashboard.

### 2.3 Tabla `rooms` (Aulas / Recintos)
Representa físicamente el aula o salón monitoreado.
* `id` (UUID, PK): Identificador del recinto.
* `name` (VARCHAR): Nombre asignado (ej., "Aula 101").
* `instance_id` (UUID, FK): Instancia de pertenencia (`instances.id`).

### 2.4 Tabla `room_setups` (Configuración Física del Aula)
Almacena las dimensiones configuradas por el usuario para los cálculos físico-térmicos.
* `room_id` (UUID, FK, PK): Vínculo 1:1 con `rooms.id`.
* `room_width` / `room_length` / `room_height` (FLOAT): Ancho, largo y alto en metros.
* `window_count` (INTEGER): Número de ventanas físicas.
* `window_area_total` (FLOAT): Área total de ventilación natural en m².
* `minisplit_count` / `purifier_count` / `extractor_count` (INTEGER): Número de actuadores instalados.

### 2.5 Tabla `room_setup_derived` (Parámetros de Ventilación Derivados)
Valores calculados automáticamente por el backend a partir de las dimensiones del aula.
* `room_id` (UUID, FK, PK): Vínculo 1:1 con `rooms.id`.
* `room_volume` (FLOAT): Volumen del salón ($Width \times Length \times Height$) en m³.
* `room_area` (FLOAT): Área del salón ($Width \times Length$) en m².
* `recommended_purifier_cadr` (FLOAT): Tasa de entrega de aire limpio recomendada (m³/h).
* `recommended_extractor_flow` (FLOAT): Tasa de extracción recomendada (m³/h).

### 2.6 Tabla `emulators` (Registro de Emuladores IoT)
Mapea el identificador lógico que utiliza el emulador Java en la red MQTT con la base de datos.
* `id` (UUID, PK): Identificador interno.
* `emulator_external_id` (VARCHAR, UNIQUE): Cadena de texto usada como identificador en MQTT (ej., `EMU-0001`).
* `room_id` (UUID, FK): Vínculo con el aula (`rooms.id`).
* `status` (VARCHAR): Estado de conectividad (`online`, `offline`).

### 2.7 Tabla `devices` (Actuadores / Dispositivos)
Dispositivos instalados en cada aula.
* `id` (UUID, PK): Identificador del actuador.
* `room_id` (UUID, FK): Aula donde se ubica el dispositivo.
* `type` (VARCHAR): Tipo de dispositivo (`minisplit`, `purifier`, `extractor`).
* `label` (VARCHAR): Etiqueta visual (ej., "Extractor 1").

### 2.8 Tabla `device_states` (Estado Actual del Actuador)
Mantiene el último estado conocido del actuador reportado por el emulador.
* `device_id` (UUID, FK, PK): Vínculo 1:1 con `devices.id`.
* `is_on` (BOOLEAN): Estado de encendido.
* `target_temperature` (FLOAT, NULL): Temperatura objetivo del acondicionador de aire.
* `last_reported_at` (TIMESTAMP): Fecha y hora del último reporte de estado.

### 2.9 Tabla `cycles` (Ciclos Operativos de Clase)
Agrupa las mediciones en periodos lógicos de clases o laboratorios para evitar lecturas huérfanas o fuera de horario escolar.
* `id` (UUID, PK): Identificador del ciclo.
* `room_id` (UUID, FK): Aula del ciclo.
* `started_at` / `ended_at` (TIMESTAMP): Inicio y fin del ciclo de monitoreo.
* `status` (VARCHAR): Estado del ciclo (`active`, `closed`).

### 2.10 Tabla `cycle_measurements` (Mediciones de Telemetría)
Persiste las lecturas de los sensores del emulador en un histórico continuo.
* `id` (UUID, PK): Identificador de la lectura.
* `cycle_id` (UUID, FK): Enlace al ciclo de monitoreo (`cycles.id`).
* `timestamp` (TIMESTAMP): Marca temporal de la lectura.
* `temperature` / `humidity` / `co2` / `pm25` (FLOAT): Valores de las variables medidas.

---

## 3. Capa de Compatibilidad de Diccionario (`dictionary_compat`)

Para cumplir con la entrega académica del curso, se implementó un script SQL (`002-dictionary-compat.sql`) que expone vistas específicas. Estas vistas adaptan las llaves primarias camelCase y las relaciones físicas a las estructuras requeridas por los scripts de validación del curso, sin obligar al backend a cambiar sus modelos estructurados de Sequelize:

* **Vista `users_view`**: Expone las columnas de autenticación en snake_case e integra los campos 2FA.
* **Vista `rooms_view`**: Mapea el identificador físico al formato plano esperado.
* **Vista `derived_setups_view`**: Expone las dimensiones calculadas.
* **Vista `telemetry_view`**: Realiza un JOIN entre mediciones, ciclos y aulas para presentar una bitácora plana de telemetrías.
