# Bloque de Documentación: Problemática, Diagrama Conceptual y Elementos de Diseño - SafeAir

## 1. Introducción del Bloque

Este documento consolida y articula de manera formal los apartados correspondientes a la descripción de la problemática, el diagrama conceptual de la solución y los elementos de diseño técnico (modelo de datos, arquitectura física y lógica, y tópicos de comunicación MQTT) requeridos por la rúbrica de evaluación de la materia Desarrollo de Sistemas en Red. 

El propósito de este bloque es proporcionar una especificación del diseño de SafeAir, un sistema estructurado bajo una arquitectura de red distribuida orientada a eventos para el monitoreo ambiental y control de actuadores en espacios escolares cerrado. La documentación se centra en la coherencia entre el diseño conceptual y la implementación física del proyecto, sirviendo de base para la posterior integración de interfaces y pruebas en red de área local (LAN).

---

## 2. Descripción de la Problemática

El monitoreo de variables ambientales en espacios escolares cerrados, como aulas de clase universitarias y laboratorios, ha tomado una relevancia crítica en el diseño de infraestructura educativa. Los salones de clase que albergan una densidad alta de estudiantes durante periodos prolongados son susceptibles a la acumulación rápida de exhalaciones biológicas y a variaciones extremas en las condiciones de confort higrotérmico.

La falta de un monitoreo estructurado en estos entornos genera consecuencias negativas asociadas a dos ejes principales:

* **Seguridad Ambiental y Rendimiento Cognitivo**: Concentraciones elevadas de Dióxido de Carbono (CO2) y de partículas finas suspendidas (PM2.5) pueden asociarse con la aparición de fatiga, somnolencia, dolores de cabeza y disminución general del rendimiento de alumnos y docentes. El CO2 acumulado sirve como indicador indirecto de la tasa de renovación de aire en un aula.
* **Incertidumbre en la Climatización**: La falta de visibilidad en tiempo real sobre la temperatura y humedad relativa puede contribuir al uso ineficiente de equipos acondicionadores de aire y extractores, afectando negativamente el confort y elevando el consumo eléctrico sin garantizar una ventilación efectiva.

### Dificultades ante la falta de Monitoreo
Sin un sistema de recolección de métricas, los administradores de mantenimiento del campus carecen de datos para tomar decisiones estratégicas. No es posible identificar cuáles salones presentan deficiencias estructurales de ventilación ni verificar de manera objetiva si las políticas de apertura de ventanas o el uso de equipos de climatización son suficientes para mantener condiciones óptimas de habitabilidad.

### Utilidad del Almacenamiento Histórico
El análisis en tiempo real es indispensable para la reacción inmediata (alertas de ventilación), pero resulta limitado para el planeamiento a mediano y largo plazo. La persistencia histórica de telemetría permite realizar auditorías energéticas, correlacionar la calidad del aire con el aforo y horario de uso del salón, y exportar bitácoras de mediciones a formatos estándar (CSV) para auditorías institucionales o estudios estadísticos sobre el uso seguro del espacio físico.

### Justificación de Emuladores en el Diseño
El desarrollo y evaluación de sistemas distribuidos aplicados al Internet de las Cosas (IoT) en entornos académicos presenta limitaciones logísticas y económicas, como el costo de sensores, actuadores y el cableado para cada alumno. El uso de emuladores lógicos de hardware permite simular el comportamiento térmico y de calidad del aire del aula. El emulador aplica modelos matemáticos de simulación física que reaccionan de manera dinámica a factores del entorno (presencia de estudiantes, volumen de la habitación) y a la activación remota de actuadores (minisplits, extractores y purificadores), permitiendo validar toda la lógica del backend y frontend bajo condiciones operativas realistas sin requerir sensores físicos durante la etapa de pruebas.

### Justificación de la Comunicación MQTT
Los sistemas distribuidos requieren canales de red altamente eficientes. El protocolo de peticiones HTTP REST, aunque idóneo para operaciones de administración de usuarios y consulta de base de datos, presenta una sobrecarga en las cabeceras de red e ineficiencia al gestionar transmisiones recurrentes de telemetría desde múltiples salones de clase.

Para el flujo de sensores en tiempo real y el control de dispositivos se utiliza **MQTT (Message Queuing Telemetry Transport)** sobre el broker **EMQX**, debido a:
* **Protocolo Ligero**: Reduce al mínimo el consumo de ancho de banda y el procesamiento en los emuladores simulados.
* **Modelo Publicación/Suscripción**: Desacopla lógicamente a los emuladores del backend, permitiendo que cada emulador publique de forma independiente y que el backend consuma los eventos asíncronamente sin bloqueos.
* **Transmisión Bidireccional de Comandos**: Permite que el emulador permanezca suscrito de manera pasiva a tópicos de control, reaccionando al instante cuando el backend publica una instrucción de encendido o cambio de setpoint.

---

## 3. Objetivo General de la Solución

El objetivo general del sistema SafeAir es diseñar e implementar una arquitectura distribuida orientada a eventos para el monitoreo ambiental, emulación de sensores y actuadores, y control interactivo de recintos cerrados. El sistema integra el consumo de datos asíncronos mediante el protocolo MQTT canalizado por el broker EMQX, la comunicación de servicios síncronos a través de una API REST HTTP, la persistencia relacional en un motor de base de datos PostgreSQL, la simulación física de variables ambientales mediante emuladores en lenguaje Java, y la visualización interactiva y generación de reportes estructurados para el operador final.

---

## 4. Diagrama Conceptual de la Solución

SafeAir opera mediante el desacoplamiento de transacciones en la red local. Las solicitudes de administración y consulta de reportes históricos se gestionan mediante el protocolo HTTP REST (síncrono), mientras que las lecturas de telemetría y el enrutamiento de comandos a actuadores se realizan mediante el protocolo MQTT (asíncrono).

```mermaid
graph TD
    %% Nodos
    Usuario["Usuario (Operador / Administrador)"]
    Frontend["Frontend (Angular Web App)"]
    Backend["API Backend (Node.js / Express)"]
    Database[("Base de Datos (PostgreSQL 16)")]
    Broker["Broker MQTT (EMQX)"]
    Emulator["Emulador de Entorno (Java / Spring Boot)"]

    %% Flujos de Configuración
    Usuario -->|1. Configura aula| Frontend
    Frontend -->|2. HTTP PUT /rooms/:id/setup| Backend
    Backend -->|3. Persiste dimensiones y actuadores| Database
    Backend -->|4. Publica dimensiones: MQTT Publish| Broker
    Broker -->|5. Recibe config: MQTT Deliver| Emulator

    %% Flujos de Telemetría
    Emulator -->|6. Envía lecturas de sensores: MQTT Publish| Broker
    Broker -->|7. Recibe telemetría: MQTT Deliver| Backend
    Backend -->|8. INSERT mediciones históricas| Database
    Frontend -.->|9. HTTP GET Current (Polling)| Backend

    %% Flujos de Comandos de Actuadores
    Usuario -->|A. Controla dispositivo| Frontend
    Frontend -->|B. HTTP POST Command| Backend
    Backend -->|C. INSERT historial de acciones| Database
    Backend -->|D. Publica comando: MQTT Publish| Broker
    Broker -->|E. Recibe comando: MQTT Deliver| Emulator
    Emulator -->|F. Modifica simulación en memoria| Emulator

    %% Flujo de Reportes Históricos
    Usuario -->|I. Consulta gráfico / Exporta CSV| Frontend
    Frontend -->|II. HTTP GET History / Export| Backend
    Backend -->|III. SELECT mediciones históricas| Database
    Backend -->|IV. Retorna JSON / Archivo CSV| Frontend
```

---

## 5. Elementos de Diseño de la Solución

### 5.1 Modelo de Datos
La persistencia relacional en PostgreSQL está gestionada mediante el ORM Sequelize del backend, estructurado en once tablas físicas normalizadas que dividen los datos de control, configuración, mediciones y usuarios:

* **`users`**: Almacena las credenciales de operadores, perfiles y atributos del segundo factor de autenticación (OTP).
* **`instances`**: Permite organizar lógicamente las aulas en agrupaciones físicas del campus (ej., Edificios).
* **`rooms`**: Representa los salones de clase.
* **`room_setups`**: Guarda los parámetros dimensionales configurados del aula (ancho, largo, alto, número de ventanas y actuadores instalados).
* **`room_setup_derived`**: Registra los cálculos derivados calculados de forma automática por el backend (volumen del aula, áreas y flujos de ventilación recomendados).
* **`emulators`**: Mapea los identificadores de los emuladores Java con el ID lógico de las aulas.
* **`devices`**: Detalla el inventario de actuadores instalados en cada aula (`minisplit`, `purifier`, `extractor`).
* **`device_states`**: Mantiene el último estado reportado (encendido/apagado, temperatura objetivo) del dispositivo en base de datos.
* **`device_actions`**: Bitácora histórica que registra las acciones de control ejecutadas por los operadores sobre los actuadores.
* **`cycles`**: Registra periodos lógicos de monitoreo (clases o laboratorios en curso).
* **`cycle_measurements`**: Tabla histórica que persiste los sensores recopilados.

Las consultas y escrituras se realizan utilizando nombres de columnas reales confirmados por el código del backend, tales como:
* `roomId` (UUID): Enlace único de relación al aula física.
* `cycleId` (UUID): Vínculo al ciclo de clase en curso.
* `measuredAt` / `receivedAt` (TIMESTAMP): Marcas temporales de la lectura del sensor.
* `temperature` (FLOAT): Lectura de temperatura en °C.
* `humidity` (FLOAT): Lectura de humedad relativa en %.
* `co2` (FLOAT): Lectura de Dióxido de Carbono en ppm.
* `pm25` (FLOAT): Lectura de partículas suspendidas en μg/m³.

---

### 5.2 Arquitectura del Sistema
La arquitectura del sistema SafeAir está organizada en contenedores Docker independientes orquestados localmente mediante **Docker Compose**:

* **Servicio de UI (Frontend)**: Construido en **Angular 19** y servido para la red mediante un servidor web **Nginx 1.27-alpine** expuesto en el puerto host `8080`.
* **Servicio de Negocio (Backend)**: Desarrollado en **Node.js** con el framework **Express 5.2.1** y TypeScript, expuesto en el puerto host `3000`. Interactúa con la base de datos mediante **Sequelize** y actúa como un cliente MQTT suscriptor/publicador.
* **Servicio de Persistencia**: Contenedor con la base de datos **PostgreSQL 16**, persistido mediante volúmenes de Docker y expuesto externamente en el puerto host `6543`.
* **Servicio de Mensajería**: Contenedor del broker **EMQX latest**, encargado del ruteo Pub/Sub en el puerto host `1883` (MQTT TCP), `8084` (MQTT WebSockets) e `18083` (consola web administrativa de depuración).
* **Servicio de Emulación**: Contenedor ejecutando el emulador Java en **Java 17** con **Spring Boot 3.3.0**, expuesto en el puerto host `8081` para diagnóstico.

> **[Nota de Validación Operativa]**
> Esta arquitectura se encuentra validada localmente mediante orquestación de Docker Compose en una misma máquina. La validación en red LAN física (con laptops separadas) se encuentra catalogada como pendiente de evidencias físicas posteriores.

---

### 5.3 Tópicos MQTT y Payloads

La comunicación asíncrona entre el backend y los emuladores Java se implementa a través de tres tópicos específicos en el broker EMQX, segmentados utilizando el identificador único del emulador (`{emulatorId}`, ej., `EMU-0001`):

#### A. Tópico: `safeair/{emulatorId}/config`
* **Propósito**: Transmitir las dimensiones físicas y la cantidad de dispositivos del aula para inicializar la simulación.
* **Publicador**: Backend API.
* **Suscriptor**: Emulador Java.
* **Ejemplo de Payload JSON**:
```json
{
  "roomWidth": 10.00,
  "roomLength": 10.00,
  "roomHeight": 2.70,
  "windowCount": 4,
  "windowAreaTotal": 6.00,
  "minisplitCount": 2,
  "purifierCount": 1,
  "extractorCount": 1,
  "recommendedPurifierCadr": 350.00,
  "recommendedExtractorFlow": 420.00
}
```

#### B. Tópico: `safeair/{emulatorId}/telemetry`
* **Propósito**: Transmitir de forma periódica las mediciones de los sensores simulados para su persistencia histórica.
* **Publicador**: Emulador Java.
* **Suscriptor**: Backend API.
* **Ejemplo de Payload JSON**:
```json
{
  "temperature": 23.50,
  "humidity": 45.20,
  "co2": 720.00,
  "pm25": 12.50,
  "timestamp": "2026-06-08T04:20:00.000Z"
}
```

#### C. Tópico: `safeair/{emulatorId}/actuator-state`
* **Propósito**: Transmitir comandos de control (encender/apagar o modificar temperatura) dirigidos a los actuadores físicos.
* **Publicador**: Backend API.
* **Suscriptor**: Emulador Java.
* **Ejemplo de Payload JSON (Real)**:
```json
{
  "roomId": "cf84a3b8-6a10-449e-b98a-924a1e948c2a",
  "deviceType": "minisplit",
  "action": "minisplit_on",
  "value": true,
  "source": "debug-dashboard",
  "timestamp": "2026-06-08T04:20:00.000Z"
}
```

---

### 5.4 Interfaces Gráficas de Usuario

Este apartado será complementado por el integrante responsable de interfaces gráficas. En esta entrega se identifican como interfaces principales: login, dashboard de habitaciones, configuración de habitación, reportes históricos, control de actuadores y paneles debug.

[Pendiente de integrar por responsable de frontend/interfaces]

---

## 6. Flujo General de Operación

El flujo de extremo a extremo del sistema SafeAir se ejecuta a través de las siguientes 12 etapas secuenciales de sincronía y eventos:

1. **Configuración de Aula**: El usuario inicia sesión en el frontend Angular, ingresa a la vista de creación y especifica las dimensiones físicas del aula (ancho, largo, alto, ventanas y actuadores instalados).
2. **Envío de Petición HTTP**: El frontend emite una solicitud HTTP PUT al endpoint `/api/v1/rooms/:id/setup` del backend Express, adjuntando la configuración física y el token JWT de la sesión.
3. **Persistencia de Configuración**: El backend Express recibe la petición, calcula los parámetros derivados de ventilación y los escribe de forma persistente en las tablas `room_setups` y `room_setup_derived` de la base de datos PostgreSQL.
4. **Publicación de Inicialización MQTT**: El backend traduce la configuración física a JSON y la publica en el broker EMQX bajo el tópico `safeair/{emulatorId}/config`.
5. **Recepción en Emulador**: El emulador Java (suscrito al tópico de inicialización) recibe el JSON, lee las dimensiones del aula y arranca en su memoria las ecuaciones físico-térmicas correspondientes.
6. **Simulación de Variables**: El emulador calcula dinámicamente el comportamiento térmico y de calidad del aire basándose en el volumen y los dispositivos activos en el aula.
7. **Publicación de Telemetría**: Con una frecuencia periódica de 10 segundos, el emulador Java publica las mediciones calculadas en el tópico de red `safeair/{emulatorId}/telemetry`.
8. **Persistencia de Mediciones**: El backend Express intercepta el paquete de telemetría, identifica el ciclo de monitoreo activo asociado y realiza un INSERT de las variables en la tabla `cycle_measurements` de PostgreSQL.
9. **Consulta del Operador**: El frontend Angular realiza peticiones síncronas periódicas (polling) a `/api/v1/rooms/:id/metrics/current` o consultas de histórico a `/api/v1/rooms/:id/metrics/history` para presentar gráficas en la pantalla del usuario.
10. **Envío de Comando de Actuador**: El usuario presiona el botón interactivo de la interfaz para encender el minisplit, lo que dispara una petición HTTP POST a `/api/v1/rooms/:roomId/actuators/minisplit/command`.
11. **Publicación de Comando MQTT**: El backend valida el JWT, registra la acción del operador en la tabla `device_actions` y publica una instrucción de activación en el tópico `safeair/{emulatorId}/actuator-state` del broker EMQX.
12. **Ajuste Físico-Térmico**: El emulador Java intercepta la instrucción de control, cambia el estado en memoria del minisplit simulado a "encendido" y modifica la velocidad de enfriamiento de la habitación en sus cálculos térmicos de telemetría.

---

## 7. Estado de Validación del Bloque

El diseño técnico y los flujos del bloque de documentación han sido verificados de forma exitosa mediante pruebas locales:
* **Orquestación en Local**: Comprobación del correcto despliegue e interconexión de contenedores usando Docker Compose.
* **Persistencia Histórica**: Confirmación de la persistencia de mediciones mediante consultas directas SQL SELECT a la tabla `cycle_measurements` de PostgreSQL.
* **Envío de Comandos**: Confirmación de la ingesta de comandos de actuadores mediante peticiones locales `curl` protegidas con JWT, y la correspondiente publicación de mensajes en EMQX.
* **Pendiente**: La ejecución e interconexión distribuida en red LAN física utilizando hardware independiente para cada servicio se encuentra en estado: *Pendiente de validación en red LAN*. Las capturas de pantalla de evidencia se integrarán posteriormente.

---

## 8. Observaciones para Integración al Reporte Final

Para consolidar el reporte técnico definitivo para la materia Desarrollo de Sistemas en Red, se identifican las siguientes observaciones y pendientes de integración:
* **Interfaces Gráficas**: Falta completar la integración de pantallas finales y sus diagramas de flujo visuales por parte del integrante responsable de frontend.
* **Capturas de Evidencia Real**: Falta capturar e integrar las imágenes de validación LAN en los marcadores establecidos en el documento de interfaces gráficas.
* **Pruebas en Red Física**: Pendiente de validar la conectividad en red LAN física con equipos separados en la entrega presencial.
* **Conclusiones y Roles**: Pendiente de redactar las conclusiones de aprendizaje grupal y definir la asignación de roles técnicos definitivos en el reporte consolidado.
