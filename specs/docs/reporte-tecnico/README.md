# Guía del Reporte Técnico - SafeAir

Este directorio contiene la documentación técnica estructurada y organizada del proyecto SafeAir para la materia Desarrollo de Sistemas en Red. La estructura de documentos está diseñada para cubrir de manera secuencial y formal los apartados solicitados en la rúbrica de evaluación del reporte técnico.

SafeAir es un sistema de monitoreo, persistencia y control ambiental mediante emuladores, API REST, MQTT y PostgreSQL.

---

## 1. Mapeo de Documentos a la Rúbrica de la Materia

A continuación se detalla qué archivo cubre cada uno de los puntos requeridos para la entrega y su nivel de avance:

| Apartado de la Rúbrica | Archivo de Documentación | Estado / Avance |
|-------------------------|--------------------------|-----------------|
| **1. Hoja de Presentación** | [00-portada.md](./00-portada.md) | Completado (Pendiente de nombres e integrantes finales) |
| **2. Descripción de la Problemática** | [01-problematica.md](./01-problematica.md) | Completado |
| **3. Diagrama Conceptual de la Solución** | [02-diagrama-conceptual.md](./02-diagrama-conceptual.md) | Completado (Incluye diagrama Mermaid) |
| **4. Elementos de Diseño: Resumen** | [03-elementos-diseno.md](./03-elementos-diseno.md) | Completado |
| **4.1 Modelo de Datos** | [04-modelo-datos.md](./04-modelo-datos.md) | Completado (Incluye diagrama ERD Mermaid y capa de compatibilidad) |
| **4.2 Arquitectura** | [05-arquitectura.md](./05-arquitectura.md) | Completado (Incluye diagramas Mermaid de red y secuencia) |
| **4.3 Interfaces Gráficas de Usuario** | [06-interfaces-graficas.md](./06-interfaces-graficas.md) | Completado (Contiene los marcadores de capturas y propósitos debug) |
| **4.4 Tópicos Implementados en MQTT** | [07-topicos-mqtt.md](./07-topicos-mqtt.md) | Completado (Payloads JSON reales) |
| **5. Protocolo de Pruebas y Evidencias**| [08-validacion-y-evidencias-pendientes.md](./08-validacion-y-evidencias-pendientes.md) | **[NUEVO]** Completado (Detalle de local, comandos útiles y evidencias LAN) |
| **6. Catálogo de Rutas API Auditadas** | [09-rutas-api-verificadas.md](./09-rutas-api-verificadas.md) | **[NUEVO]** Completado (Mapeo detallado de Express vs Frontend y caso 404) |
| **7. Roles Asignados al Equipo** | *Por completar en portada/conclusiones* | Pendiente de asignar |
| **8. Conclusiones** | *Por completar en el archivo final* | Pendiente de redactar |

---

## 2. Archivos de Auditoría Interna (Checkpoints)

Adicionalmente, se incluyen dos documentos de auditoría interna generados para contrastar la documentación teórica con la implementación del código fuente real:

1. **[checkpoint-estado-actual.md](./checkpoint-estado-actual.md)**: Resumen del estado actual del repositorio, las tecnologías físicas detectadas en el backend, frontend y base de datos, mapeo de tópicos reales en el código, y detección de inconsistencias.
2. **[second-checkpoint-cambios.md](./second-checkpoint-cambios.md)**: Registro de los cambios, ajustes y actualizaciones más recientes del sistema, como el doble factor de autenticación (2FA OTP), el bypass para demostración local (`AUTH_SKIP_OTP=true`), la base de datos PostgreSQL enriquecida y los visualizadores de logs interactivos.

---

## 3. Estado de Validación Actual

* **Orquestación en Local**: El sistema ha sido levantado localmente de forma exitosa mediante Docker Compose. Todos los contenedores (`db`, `mqtt`, `api`, `frontend`, `emulator-java`) arrancan y se comunican entre sí en la red virtual bridge `safeair-network`.
* **Persistencia de Telemetría**: Se confirmó que las mediciones simuladas de temperatura y CO2 enviadas por el emulador Java a través de MQTT viajan al backend y se guardan de forma persistente en PostgreSQL mediante consultas SQL directas (`SELECT * FROM cycle_measurements`).
* **Integración de Actuadores**: Se confirmó por pruebas directas utilizando comandos `curl` con tokens JWT válidos que el endpoint de control de actuadores (`POST /api/v1/rooms/:roomId/actuators/:deviceType/command`) responde con `200 OK`.
* **Transmisión de Mensajes MQTT**: Se validó en el log del backend que la recepción de comandos por Express dispara la publicación del evento en el broker EMQX en el tópico de control `safeair/{emulatorId}/actuator-state`.
* **Pendiente**: Aún no se ha realizado la validación física en una red LAN real utilizando laptops independientes para correr el frontend, el backend y el emulador. La configuración de IPs estáticas de hardware y la apertura de puertos en firewalls locales quedan como tareas críticas para la demostración en vivo. Las capturas de evidencia de red física se agregarán posteriormente.

---

## 4. Evidencias Pendientes por Capturar (Mañana)

Para la entrega definitiva del reporte técnico, se deben capturar e insertar las siguientes evidencias del sistema operando en red:

1. **Evidencia de Login y OTP**: Captura de pantalla de la interfaz de login, recepción del correo de verificación (en consola o bandeja de entrada) y verificación exitosa del código OTP.
2. **Evidencia de Dashboard en Red**: Captura del dashboard mostrando telemetrías en tiempo real con datos fluctuantes de temperatura y CO2 provenientes del emulador Java en red física.
3. **Evidencia de Envío de Datos MQTT**: Captura de pantalla del dashboard de EMQX (`http://localhost:18083`) mostrando los clientes conectados y la tasa de mensajes publicados en el tópico `safeair/+/telemetry`.
4. **Evidencia de Persistencia Histórica**: Consulta SQL directa a la tabla `cycle_measurements` en PostgreSQL demostrando que las mediciones se están guardando de manera continua.
5. **Evidencia de Control de Actuadores**: Captura antes y después del envío de un comando para encender el minisplit, mostrando el cambio reflejado en la temperatura y el registro de la acción en los logs visuales de `/debug/logs/html`.
6. **Evidencia de Reporte Histórico y Exportación**: Captura de la gráfica histórica del frontend Angular y el archivo CSV generado al hacer clic en el botón de exportar.
7. **Evidencia del Docker Compose**: Captura de la terminal ejecutando `docker compose ps` confirmando que todos los contenedores (`api`, `frontend`, `db`, `emqx`, `emulator`) están en estado *running*.

---

## 5. Información por Completar Manualmente

* **Nombres**: Llenar los integrantes definitivos del equipo y el nombre del docente en [00-portada.md](./00-portada.md).
* **Roles**: Asignar los roles de desarrollo y documentación a los integrantes en la hoja de portada o en una sección anexa al final del reporte técnico consolidado.
* **Conclusiones**: Redactar las conclusiones individuales y grupales de la materia sobre el desarrollo de sistemas distribuidos y protocolos de comunicación en red.
