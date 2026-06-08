# Punto de Control: Estado Técnico Actual - SafeAir

Este documento resume los resultados de la auditoría inicial de consistencia técnica realizada sobre el repositorio SafeAir, contrastando la especificación teórica inicial con el código fuente real implementado en el backend, base de datos y frontend.

---

## 1. Tecnologías y Versiones Confirmadas en Código

Se validaron las versiones de software mediante la inspección directa de los archivos de dependencias y construcción del proyecto:

* **Base de Datos**: **PostgreSQL 16** (imagen oficial `postgres:16` configurada en `docker-compose.yml`).
* **Intermediario de Mensajería**: **EMQX latest** (imagen oficial `emqx/emqx:latest` en `docker-compose.yml`).
* **Backend API**: **Node.js** con **Express 5.2.1** y **Sequelize 6.37.8** (configurado en `Api_Emuladores/package.json`).
* **Frontend Web**: **Angular 19** con TypeScript y compilación de producción servida en **Nginx 1.27-alpine** (configurado en `Frontend_SafeAir/package.json` y `Dockerfile`).
* **Emulador IoT**: Aplicación en **Java 17** con **Spring Boot 3.3.0** (configurado en `SafeAir-System-Emulator/pom.xml`).

---

## 2. Auditoría de Rutas API y Discrepancias

Durante las pruebas iniciales de red, se detectaron discrepancias entre las rutas descritas y los controladores reales del backend:

### Caso Crítico: `GET /api/v1/rooms`
* **Inconsistencia**: Los documentos conceptuales previos asumían la existencia del endpoint `GET /api/v1/rooms` para listar todas las aulas. Sin embargo, al probar manualmente, el servidor devuelve: `Route not found: GET /api/v1/rooms`.
* **Implementación Real**: En el código del frontend (`DashboardMockStateService`), las habitaciones no se obtienen directamente consultando las salas globales, sino que se consulta la instancia activa a través de:
  1. `GET /api/v1/instances`: Retorna la lista de instancias organizacionales del usuario.
  2. `GET /api/v1/instances/:id`: Retorna el detalle completo de la instancia, el cual incluye en su estructura un arreglo anidado con todas las aulas asociadas (`instance.rooms`), con sus respectivas configuraciones y dimensiones.
* **Resolución en Documentación**: Se eliminaron las referencias a `GET /api/v1/rooms` como listado y se documentó el flujo de consulta a través de instancias, que es la estructura real soportada por la API y consumida por el frontend Angular.

---

## 3. Estado de Validación Actual

A continuación se detalla el nivel de madurez y validación operacional alcanzado hasta la fecha:

* **Orquestación en Local**: El sistema ha sido levantado localmente de forma exitosa mediante Docker Compose. Todos los contenedores (`db`, `mqtt`, `api`, `frontend`, `emulator-java`) arrancan y se comunican entre sí en la red virtual bridge `safeair-network`.
* **Persistencia de Telemetría**: Se confirmó que las mediciones simuladas de temperatura y CO2 enviadas por el emulador Java a través de MQTT viajan al backend y se guardan de forma persistente en PostgreSQL mediante consultas SQL directas (`SELECT * FROM cycle_measurements`).
* **Integración de Actuadores**: Se confirmó por pruebas directas utilizando comandos `curl` con tokens JWT válidos que el endpoint de control de actuadores (`POST /api/v1/rooms/:roomId/actuators/:deviceType/command`) responde con `200 OK`.
* **Transmisión de Mensajes MQTT**: Se validó en el log del backend que la recepción de comandos por Express dispara la publicación del evento en el broker EMQX en el tópico de control `safeair/{emulatorId}/actuator-state`.
* **Pendiente**: Aún no se ha realizado la validación física en una red LAN real utilizando laptops independientes para correr el frontend, el backend y el emulador. La configuración de IPs estáticas de hardware y la apertura de puertos en firewalls locales quedan como tareas críticas para la demostración en vivo. Las capturas de evidencia de red física se agregarán posteriormente.
