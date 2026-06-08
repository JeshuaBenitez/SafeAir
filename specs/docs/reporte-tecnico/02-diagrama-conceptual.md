# Diagrama Conceptual de la Solución - SafeAir

Este documento describe a nivel abstracto y conceptual la interacción entre los diferentes actores y módulos que conforman la solución SafeAir. El sistema está diseñado bajo una arquitectura distribuida desacoplada, utilizando comunicación síncrona HTTP REST para operaciones administrativas e históricas, y comunicación asíncrona basada en eventos MQTT para la telemetría y el control en tiempo real.

---

## 1. Descripción de los Flujos de Datos Conceptuales

* **Flujo de Configuración**: El Usuario interactúa con la interfaz del Frontend Angular para establecer las dimensiones físicas del aula. Esta información se transmite por REST API al Backend, que tras calcular las variables derivadas de ventilación y transferencia térmica, persiste los datos en PostgreSQL y los publica a través del Broker EMQX para actualizar la simulación en el Emulador Java.
* **Flujo de Telemetría**: El Emulador Java genera simulaciones periódicas del comportamiento físico del aula. Publica estas lecturas de forma asíncrona hacia el Broker EMQX. El Backend, suscrito a los tópicos de telemetría, recibe estos paquetes, identifica el ciclo operativo del aula y almacena las lecturas en PostgreSQL.
* **Flujo de Comandos de Actuadores**: El Usuario emite una acción de encendido, apagado o setpoint de temperatura desde el Frontend. La solicitud viaja vía REST API al Backend, que registra el comando en la base de datos y publica un payload de control en el Broker EMQX. El Emulador Java, suscrito a dicho tópico, recibe el comando al instante, modifica el comportamiento de sus ecuaciones físicas y genera telemetría actualizada.
* **Flujo de Reportes Históricos**: El Usuario solicita un informe temporal de las condiciones de una habitación. El Frontend envía la petición de rango de fechas al Backend por REST API. El Backend realiza la consulta SELECT estructurada en PostgreSQL, formatea los datos y los retorna al Frontend para su representación gráfica o exportación en formato CSV.

---

## 2. Diagrama Conceptual Completo (Mermaid)

El siguiente diagrama visualiza la topología conceptual de la red y las transacciones de datos entre componentes:

```mermaid
graph TD
    %% Nodos de Componentes
    User["Usuario (Operador / Administrador)"]
    Frontend["Frontend (Angular Web App)"]
    Backend["API Backend (Node.js / Express)"]
    Database[("Base de Datos (PostgreSQL)")]
    Broker["Broker MQTT (EMQX)"]
    Emulator["Emulador de Entorno (Java / Spring Boot)"]

    %% Conexiones de Flujo de Configuración
    User -->|1. Configura Habitación| Frontend
    Frontend -->|2. HTTP POST /rooms| Backend
    Backend -->|3. INSERT Setup/Derived| Database
    Backend -->|4. MQTT Publish Config| Broker
    Broker -->|5. MQTT Deliver Config| Emulator

    %% Conexiones de Flujo de Telemetría
    Emulator -->|6. MQTT Publish Telemetry| Broker
    Broker -->|7. MQTT Deliver Telemetry| Backend
    Backend -->|8. INSERT Measurements| Database
    Frontend -.->|9. HTTP GET Current (Polling)| Backend

    %% Conexiones de Flujo de Comandos (Actuadores)
    User -->|A. Presiona Botón Control| Frontend
    Frontend -->|B. HTTP POST Command| Backend
    Backend -->|C. INSERT Action Log| Database
    Backend -->|D. MQTT Publish Command| Broker
    Broker -->|E. MQTT Deliver Command| Emulator
    Emulator -->|F. Cambia Simulación Físico-Térmica| Emulator

    %% Conexiones de Flujo de Reportes Históricos
    User -->|I. Solicita Historial / Exportar| Frontend
    Frontend -->|II. HTTP GET History / Export| Backend
    Backend -->|III. SELECT Measurements| Database
    Backend -->|IV. Retorna JSON / Archivo CSV| Frontend
```

---

## 3. Desacoplamiento y Roles en la Red

* **Síncrono (HTTP REST)**: Ideal para el flujo donde el cliente web requiere confirmación inmediata de la transacción (creación de salas, autenticación de usuarios, consultas a base de datos y descarga de reportes).
* **Asíncrono (MQTT Pub/Sub)**: Ideal para la transmisión masiva de sensores (telemetría) y para el ruteo de comandos en red local a dispositivos que pueden estar tras un firewall o con IPs dinámicas, ya que solo requieren una conexión de salida abierta hacia el broker EMQX.
