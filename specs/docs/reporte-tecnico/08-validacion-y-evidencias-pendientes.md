# Validación y Evidencias Pendientes - SafeAir

Este documento especifica el estado del protocolo de pruebas del sistema distribuido SafeAir. Detalla las validaciones ya completadas en el entorno de desarrollo local, los casos pendientes por validar en red LAN física y los comandos operativos para realizar diagnósticos durante la presentación.

---

## 1. Evidencias Ya Validadas (Entorno Local)

Las siguientes pruebas fueron ejecutadas con éxito en el entorno de desarrollo local orquestado bajo Docker Compose:

* **Orquestación Multicontenedor**: Verificación del arranque simultáneo de la base de datos PostgreSQL 16, broker MQTT EMQX, API Express, Frontend Nginx y el Emulador Java.
* **Persistencia de Telemetría**: El emulador Java simula el comportamiento físico de calidad del aire y publica periódicamente los datos en el broker. El backend recibe los mensajes de telemetría de forma asíncrona y los inserta en la base de datos PostgreSQL.
* **Control de Actuadores**: Inyección exitosa de un comando para encender el minisplit mediante una petición HTTP POST utilizando un token JWT válido. El emulador Java recibe la instrucción al instante por MQTT y altera la curva de temperatura.
* **Consola Debug de Logs**: El backend expone en tiempo real las trazas en formato HTML (`/debug/logs/html`) mostrando la recepción de telemetría e interacciones.

---

## 2. Evidencias Pendientes (Entorno LAN Física)

Las siguientes validaciones deben completarse mañana utilizando dispositivos físicos independientes conectados a un mismo interruptor o router de red LAN:

* **Prueba de Conectividad LAN**: Validar que la máquina cliente (donde corre el frontend Angular o el emulador) pueda realizar un `ping` exitoso hacia la laptop que actúa como servidor (donde corren la base de datos, el broker EMQX y la API Express).
* **Consumo de API por IP Real**: Validar que el frontend servido por Nginx acceda a la API del backend utilizando la IP física real en lugar de `localhost`.
* **Suscripción MQTT Distribuida**: Confirmar que el emulador Java ejecutándose en una laptop cliente pueda establecer conexión TCP contra la IP física del broker EMQX.

---

## 3. Capturas de Pantalla requeridas para la Entrega Final

Para completar la documentación del reporte, se deben tomar las siguientes capturas de pantalla durante la validación física en red:

1. **Evidencia de Login y OTP**: Captura de la interfaz de login, de la consola o buzón con el código OTP y del acceso exitoso.
2. **Evidencia del Dashboard en Red**: Captura de la pantalla principal de Angular mostrando telemetrías dinámicas y fluctuantes provenientes del emulador Java.
3. **Evidencia del Dashboard de EMQX**: Captura de `http://localhost:18083` (o la IP correspondiente) mostrando el cliente del emulador Java conectado y enviando mensajes.
4. **Evidencia de Persistencia Histórica**: Consulta SQL directa a la tabla `cycle_measurements` demostrando el incremento continuo de registros.
5. **Evidencia de Control de Actuadores (Antes y Después)**: Captura de la interfaz Angular mostrando el estado "apagado" de un acondicionador, y la captura inmediata posterior al comando mostrando el estado "encendido" y la caída en la temperatura.
6. **Evidencia de Reporte Histórico**: Captura de la gráfica histórica y del archivo CSV descargado.
7. **Evidencia de Docker Compose**: Captura de la terminal ejecutando `docker compose ps` con todos los servicios en estado *Up*.

---

## 4. Comandos Útiles para Validación y Diagnóstico

### A. Verificar Estado de los Contenedores
Para confirmar que todos los servicios de la arquitectura distribuida están arriba y con puertos expuestos correctamente:
```bash
docker compose ps
```

### B. Monitorear logs del Backend en tiempo real
Para inspeccionar errores de base de datos, peticiones CORS o recepción de mensajería MQTT:
```bash
docker compose logs -f api
```

### C. Verificar Persistencia en PostgreSQL
Para auditar que las lecturas de CO2 y temperatura se están guardando en la base de datos relacional:
```bash
docker compose exec db psql -U postgres -d safeair -c "SELECT * FROM cycle_measurements ORDER BY timestamp DESC LIMIT 10;"
```

### D. Prueba manual de envío de Comandos (curl)
Para encender de forma directa el purificador de aire de un aula y validar la respuesta del backend:
```bash
curl -X POST http://localhost:3000/api/v1/rooms/{ROOM_ID}/actuators/purifier/command \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN_JWT}" \
  -d '{"action":"purifier_on","value":true,"source":"debug-curl"}'
```

### E. Monitorear tráficos MQTT
Para suscribirse de forma manual a las telemetrías y comandos que transitan por EMQX utilizando la consola interna:
```bash
docker compose exec mqtt emqx ctl broker pubsub
```

---

## 5. Checklist de Preparación de la Demostración

* `[ ]` Obtener la IP física de la laptop servidor (ej., `ip a` o `ifconfig`).
* `[ ]` Configurar `.env` con la IP del servidor en `CORS_ORIGINS`, `MQTT_URL` y `API_BASE_URL`.
* `[ ]` Abrir puertos `3000`, `8080`, `1883` e `18083` en el firewall de la laptop servidor.
* `[ ]` Iniciar Docker Compose en el servidor (`docker compose up -d`).
* `[ ]` Confirmar acceso al dashboard administrativo de EMQX.
* `[ ]` Registrar un nuevo usuario en la aplicación y loguearse (habilitando o saltando OTP).
* `[ ]` Levantar el emulador Java y confirmar que se enlaza al broker EMQX del servidor.
* `[ ]` Validar que el dashboard web de Angular refleje la telemetría dinámica.
