# Arquitectura de Red y Flujo de Datos - SafeAir

Este documento especifica la arquitectura física y lógica de la solución SafeAir, detallando las tecnologías, los puertos reales de comunicación y los flujos de mensajería sincrónicos y asincrónicos.

---

## 1. Stack Tecnológico Confirmado

A partir de los archivos de configuración del proyecto (`package.json`, `pom.xml` y `docker-compose.yml`), se confirman las siguientes tecnologías y versiones:

* **Frontend**: Aplicación SPA desarrollada en **Angular 19** con **TypeScript**. En el entorno de contenedor Docker, se compila para producción y se sirve utilizando **Nginx 1.27-alpine** (expone el puerto local `8080`).
* **Backend API**: Servicio RESTful y cliente MQTT desarrollado en **Node.js** utilizando el framework web **Express 5.2.1** con **TypeScript**. La interacción y mapeo relacional con la base de datos se realiza con el ORM **Sequelize 6.37.8** sobre el controlador nativo de PostgreSQL (`pg 8.20.0`). Expone el puerto `3000`.
* **Broker de Mensajería MQTT**: Intermediario **EMQX** (imagen Docker `emqx/emqx:latest`). Actúa como el broker centralizado que orquesta la mensajería Pub/Sub.
* **Base de Datos**: Motor de base de datos relacional **PostgreSQL 16** (imagen Docker `postgres:16`).
* **Emulador de Dispositivos**: Aplicación de simulación matemática escrita en **Java 17** utilizando **Spring Boot 3.3.0**, y conectada al broker mediante el cliente MQTT Eclipse Paho (`1.2.5`) y buffers de serialización de Google Protobuf (`3.25.3`). Expone el puerto local `8081` para depuración.

---

## 2. Mapa de Puertos y Enrutamiento Físico en Red

El siguiente diagrama detalla la configuración de puertos y protocolos expuestos por el entorno orquestado de Docker Compose:

```
                      INTERRUPTOR DE RED LAN (WIFI / ETHERNET)
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼ (Puerto 8080)            ▼ (Puerto 3000)            ▼ (Puerto 18083)
     ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
     │   Frontend   │           │   Backend    │           │ EMQX Console │
     │  (Angular)   │           │ (Express 5)  │           │ (Dashboard)  │
     └──────────────┘           └──────────────┘           └──────────────┘
            │                          │                          │
   [Red Docker Bridge: safeair-network]───────────────────────────┘
            │                          │                          │
            ▼ (Puerto 6543:5432)       ▼ (Puerto 1883/8084)       ▼ (Puerto 8081:8080)
     ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
     │ Base de Datos│           │ Broker MQTT  │           │   Emulador   │
     │ (Postgres 16)│           │    (EMQX)    │           │ (Spring Boot)│
     └──────────────┘           └──────────────┘           └──────────────┘
```

### Tabla de Puertos del Contenedor vs. Host
| Servicio | Imagen Docker | Puerto Interno | Puerto Host | Protocolo / Propósito |
|----------|---------------|----------------|-------------|-----------------------|
| `frontend` | `node:20` + `nginx` | `80` | `8080` | HTTP (Servicio de UI Angular) |
| `frontend` | `node:20` + `nginx` | `443` | `8443` | HTTPS (Seguridad opcional SSL) |
| `api` | `node:20-alpine` (Express) | `3000` | `3000` | HTTP (API REST de SafeAir) |
| `db` | `postgres:16` | `5432` | `6543` | PostgreSQL (Persistencia relacional) |
| `mqtt` | `emqx/emqx:latest` | `1883` | `1883` | MQTT TCP (Conexión de emuladores) |
| `mqtt` | `emqx/emqx:latest` | `8883` | `8883` | MQTT sobre TLS (Producción segura) |
| `mqtt` | `emqx/emqx:latest` | `8084` | `8084` | MQTT WebSockets (Suscripciones frontend) |
| `mqtt` | `emqx/emqx:latest` | `18083` | `18083` | HTTP (Consola administrativa EMQX) |
| `emulator` | `maven` + `openjdk:17` | `8080` | `8081` | HTTP (Debug de variables en emulador) |

---

## 3. Diagrama de Secuencia y Flujo de Eventos

El siguiente diagrama detalla paso a paso el flujo de datos que ocurre cuando un operador modifica un actuador en la interfaz de usuario, demostrando cómo se sincronizan el canal HTTP REST y la comunicación distribuida de eventos MQTT:

```mermaid
sequenceDiagram
    autonumber
    actor Operador
    participant Frontend as Frontend (Angular)
    participant Backend as Backend (Express API)
    participant DB as DB (PostgreSQL)
    participant Broker as Broker MQTT (EMQX)
    participant Emulator as Emulador (Java)

    %% Flujo de Comando
    Operador->>Frontend: Enciende minisplit en la habitación
    activate Frontend
    Note over Frontend: Valida token JWT local
    Frontend->>Backend: POST /api/v1/rooms/:id/actuators/minisplit/command<br/>Payload: {"action": "minisplit_on", "value": true}
    activate Backend
    Note over Backend: Middleware auth verifica JWT
    Backend->>DB: INSERT INTO device_actions (device_id, action_type, executed_by)
    Note over Backend: Obtiene externalId de emulador (ej., EMU-0001)
    Backend->>Broker: Publica comando en safeair/EMU-0001/actuator-state<br/>Payload JSON con roomId, deviceType y action
    Broker-->>Backend: Aceptación de envío QOS 1
    Backend-->>Frontend: Retorna 200 OK {"success": true}
    deactivate Backend
    Frontend-->>Operador: Muestra estado provisional ("Encendiendo...")
    deactivate Frontend

    %% Flujo Asíncrono MQTT al Emulador
    Broker->>Emulator: Entrega mensaje en safeair/EMU-0001/actuator-state
    activate Emulator
    Note over Emulator: Parser parsea JSON<br/>Aplica minisplit=true a las ecuaciones físicas
    Note over Emulator: Simula cambio de temperatura térmica
    Emulator->>Broker: Publica telemetría en safeair/EMU-0001/telemetry<br/>Payload: {"temperature": 23.5, "co2": 720}
    deactivate Emulator

    %% Recepción de Telemetría por el Backend
    activate Backend
    Broker->>Backend: Entrega mensaje en safeair/EMU-0001/telemetry
    Backend->>DB: INSERT INTO cycle_measurements (cycle_id, temperature, co2)
    Note over Backend: Almacena en memoria estado actual para debug
    deactivate Backend

    %% Actualización del Frontend
    Note over Frontend: Polling periódico o suscripción WebSocket
    Frontend->>Backend: GET /api/v1/rooms/:id/metrics/current
    activate Frontend
    activate Backend
    Backend-->>Frontend: Retorna JSON {"temperature": 23.5, "co2": 720}
    deactivate Backend
    Frontend-->>Operador: Muestra temperatura real en 23.5°C
    deactivate Frontend
```
