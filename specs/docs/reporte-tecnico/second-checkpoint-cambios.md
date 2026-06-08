# Segundo Punto de Control: Registro de Cambios - SafeAir

Este documento registra las actualizaciones técnicas implementadas recientemente en el sistema SafeAir, destinadas a optimizar la seguridad, interactividad y persistencia del sistema distribuido antes de la entrega final.

---

## 1. Principales Actualizaciones Implementadas

* **Doble Factor de Autenticación (2FA OTP)**: Se añadió un segundo factor de seguridad en el login. El backend genera un código numérico aleatorio y seguro persistido en la base de datos con expiración y lo transmite por correo electrónico (usando Nodemailer). El frontend bloquea la sesión hasta que se valide el código.
* **Bypass de Desarrollo (`AUTH_SKIP_OTP`)**: Para demostraciones locales o entornos cerrados sin salida SMTP a internet, se configuró la variable de entorno `AUTH_SKIP_OTP=true` en el backend. Esto permite saltar la validación OTP y generar un token JWT directamente en el login.
* **Dashboard Híbrido en Frontend**: Se implementó una lógica de control en Angular que permite cambiar dinámicamente el comportamiento de la interfaz de usuario. En el modo de monitoreo normal, realiza consultas recurrentes (polling) al endpoint `/api/v1/rooms/:id/metrics/current` para mostrar telemetría en tiempo real. En el modo de reporte histórico, deshabilita el polling y realiza consultas parametrizadas por rango de fecha y hora a la base de datos a través de `/api/v1/rooms/:id/metrics/history`.
* **Persistencia con Integridad Referencial CASCADE**: Se actualizaron las relaciones Sequelize del backend para añadir la cláusula `onDelete: 'CASCADE'`. Esto garantiza que si se elimina una aula, se borren de forma automática y consistente sus mediciones, dispositivos, estados e historial de acciones asociados en PostgreSQL.
* **Consolas Web de Depuración en el Backend**: Se crearon endpoints en Express que sirven interfaces HTML interactivas protegidas por tokens de autenticación JWT. La vista `/debug/emulators/html` consolida en una sola tabla la información física en base de datos y la última telemetría MQTT activa. La vista `/debug/logs/html` lee en tiempo real el historial de trazas de ejecución del servidor para auditar eventos.

---

## 2. Estado de Validación Actual

* **Orquestación en Local**: El sistema ha sido levantado localmente de forma exitosa mediante Docker Compose. Todos los contenedores (`db`, `mqtt`, `api`, `frontend`, `emulator-java`) arrancan y se comunican entre sí en la red virtual bridge `safeair-network`.
* **Persistencia de Telemetría**: Se confirmó que las mediciones simuladas de temperatura y CO2 enviadas por el emulador Java a través de MQTT viajan al backend y se guardan de forma persistente en PostgreSQL mediante consultas SQL directas (`SELECT * FROM cycle_measurements`).
* **Integración de Actuadores**: Se confirmó por pruebas directas utilizando comandos `curl` con tokens JWT válidos que el endpoint de control de actuadores (`POST /api/v1/rooms/:roomId/actuators/:deviceType/command`) responde con `200 OK`.
* **Transmisión de Mensajes MQTT**: Se validó en el log del backend que la recepción de comandos por Express dispara la publicación del evento en el broker EMQX en el tópico de control `safeair/{emulatorId}/actuator-state`.
* **Pendiente**: Aún no se ha realizado la validación física en una red LAN real utilizando laptops independientes para correr el frontend, el backend y el emulador. La configuración de IPs estáticas de hardware y la apertura de puertos en firewalls locales quedan como tareas críticas para la demostración en vivo. Las capturas de evidencia de red física se agregarán posteriormente.

---

## 3. Riesgos Pendientes antes de la Demostración (Demo LAN)

La transición del entorno local de Docker Compose a una ejecución distribuida en una red LAN física representa varios riesgos técnicos:

* **Configuración de IPs Físicas**: Se debe evitar el uso de `localhost` o `127.0.0.1` en los archivos de configuración. La laptop que aloje el Backend y el Broker EMQX debe tener una IP estática o fija en la red LAN asignada por el router (ej., `192.168.1.15`).
* **Bloqueos de Firewall**: Los firewalls del sistema operativo de la máquina servidor deben abrir explícitamente los puertos de red:
  * Puerto `3000` (API REST de Express).
  * Puerto `8080` / `80` (Servidor web Nginx del frontend).
  * Puerto `1883` (Conectividad TCP de MQTT del emulador Java).
  * Puerto `18083` (Dashboard administrativo de EMQX).
* **CORS_ORIGINS Dinámico**: La variable `CORS_ORIGINS` configurada en el `.env` del backend debe incluir explícitamente la IP física y puerto de la laptop que ejecutará el frontend Angular en la red LAN (ej., `http://192.168.1.25:8080`). De lo contrario, las peticiones HTTP del navegador serán rechazadas.
* **API_BASE_URL en Frontend**: Al compilar la imagen Docker del frontend Angular, se debe establecer la IP del backend real en la LAN mediante `--build-arg API_BASE_URL=http://192.168.1.15:3000`. De lo contrario, intentará hacer llamadas a `localhost:3000` en la laptop del operador.
* **Expiración de Tokens JWT**: La duración predeterminada de los tokens JWT es de 24 horas (`JWT_EXPIRES_IN=24h`). Si la sesión se inició con anterioridad a la demostración, el token puede expirar durante la presentación, lo que causará errores de "no autorizado" (401) en las peticiones REST y en el dashboard de debug.
* **Acceso Protegido a Debug**: Las consolas `/debug/emulators/html` y `/debug/logs/html` requieren que el token JWT sea enviado en las cabeceras HTTP o en una cookie de sesión activa. Se debe asegurar que el navegador tenga almacenado el token correcto antes de intentar abrir estas rutas.
* **Datos Históricos Vacíos**: Las gráficas históricas dependen de las marcas de tiempo. Si los relojes de las laptops de la LAN física no están sincronizados o si se selecciona un rango de fechas inválido (por ejemplo, con diferencias de zona horaria), la API retornará arreglos vacíos de telemetrías.
