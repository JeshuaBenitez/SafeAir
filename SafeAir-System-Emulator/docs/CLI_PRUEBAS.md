# Pruebas de la CLI del emulador

Esta guia contiene comandos listos para ejecutar el emulador con la CLI interactiva local y validar sus funciones principales.

Nota de arquitectura: esta CLI es local al emulador Java. No vive en la API, no se suscribe al broker y no publica comandos MQTT. Interactua directamente con `EmulatorManager`, permite observar y modificar actuadores en memoria, y la telemetria del emulador sigue saliendo por MQTT normalmente cuando `MQTT_ENABLED=true`.

## Requisitos

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
java -version
mvn -version
```

La CLI solo aparece si el programa se lanza desde una terminal interactiva. Si lo ejecutas desde un proceso sin consola, Spring arrancara normal pero la CLI se omitira.

## 1. Compilar el proyecto

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
mvn clean package
```

## 2. Ejecutar el emulador con la CLI activa

Escenario base con `profile1`:

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
SPRING_PROFILES_ACTIVE=production,profile1 \
SAFEAIR_CLI_ENABLED=true \
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true \
MQTT_ENABLED=false \
MQTT_CONSOLE_LOG_ENABLED=true \
mvn spring-boot:run
```

Notas:

- `MQTT_ENABLED=false` permite probar la CLI sin depender del broker MQTT.
- `SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true` evita que la telemetria automatica invada la terminal mientras usas la CLI sin apagar la publicacion MQTT.
- `MQTT_CONSOLE_LOG_ENABLED=true` deja habilitado el canal de consola si necesitas diagnostico explicito.
- Si quieres probar con broker real, cambia `MQTT_ENABLED=true` y define `MQTT_HOST` y `MQTT_PORT`.

## 3. Ejecutar el escenario de prueba dedicado para la CLI

Este escenario usa el archivo `src/main/resources/application-cli-demo.yml` y crea varios emuladores con configuraciones diferentes.

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
SPRING_PROFILES_ACTIVE=production,profile1,cli-demo \
SAFEAIR_CLI_ENABLED=true \
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true \
MQTT_ENABLED=false \
MQTT_CONSOLE_LOG_ENABLED=true \
mvn spring-boot:run
```

## 4. Ejecutar el JAR empaquetado

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
SPRING_PROFILES_ACTIVE=production,profile1,cli-demo \
SAFEAIR_CLI_ENABLED=true \
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true \
MQTT_ENABLED=false \
MQTT_CONSOLE_LOG_ENABLED=true \
java -jar target/safe-air-emulator-0.1.0-SNAPSHOT.jar
```

## 5. Flujo sugerido para validar la CLI

Cuando aparezca el menu:

```text
1. Listar emuladores
2. Ver logs
3. Controlar actuadores
0. Salir
```

Pruebas recomendadas:

1. Escribe `1` para validar el listado de emuladores y sus atributos.
2. Escribe `2`, luego `2` para ver logs de todos los emuladores ordenados.
3. Escribe `2`, luego `1`, captura un `emulatorId` del listado y consulta solo sus logs.
4. Escribe `3` para controlar actuadores de un emulador.
5. Selecciona un emulador del listado.
6. Selecciona un dispositivo disponible.
7. Prueba acciones reales soportadas:
   - MiniSplit: encender, apagar, cambiar temperatura objetivo.
   - AirExtractor: encender, apagar.
   - HumidifierPurifier: encender, apagar, cambiar nivel `1` a `5`.
8. Valida que despues de cada cambio se imprima el estado actualizado.

La CLI no permite editar area de sala, ventanas, sensores, estructura de dispositivos, roomId, nombre de room ni datos de API/BD.

## 6. Ejemplo de prueba manual completa

Secuencia corta para una validacion rapida:

```text
1
2
2
3
1
1
3
24
1
3
2
4
0
```

## 7. Ejecutar las pruebas unitarias relacionadas

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
mvn -q -Dtest=EmulatorLogStoreTest,EmulatorManagerCliSupportTest test
```

## 8. Ejecutar con broker MQTT real

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
SPRING_PROFILES_ACTIVE=production,profile1,cli-demo \
SAFEAIR_CLI_ENABLED=true \
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true \
MQTT_ENABLED=true \
MQTT_HOST=127.0.0.1 \
MQTT_PORT=1883 \
MQTT_CONSOLE_LOG_ENABLED=true \
mvn spring-boot:run
```

## 9. Verificacion esperada

Si todo esta correcto, deberias ver:

- Resumen de arranque de Spring y del perfil activo.
- Mensaje `=== SafeAir CLI ===`.
- Conteo de emuladores activos.
- Menu interactivo para listar, ver logs y controlar actuadores soportados.

## 10. Parametro nuevo para silenciar telemetria automatica

Puedes activar este parametro adicional cuando quieras usar la CLI sin que la telemetria continua ensucie la terminal:

```bash
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true
```

Comportamiento:

- `true`: no imprime la telemetria automatica en consola; la publicacion MQTT sigue activa si `MQTT_ENABLED=true`.
- `false`: mantiene el comportamiento normal de telemetria.

Ejemplo minimo:

```bash
cd /home/matador1081/Documentos/networksystem/finalProyect/SafeAir/SafeAir-System-Emulator
SPRING_PROFILES_ACTIVE=production,profile1 \
SAFEAIR_CLI_ENABLED=true \
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true \
MQTT_ENABLED=false \
mvn spring-boot:run
```

## 11. Resiliencia MQTT y CLI limpio

El emulador usa reconexion automatica de Eclipse Paho. Si EMQX se reinicia o deja de responder temporalmente, el proceso Java no debe detenerse ni matar el loop de telemetria. Al reconectar, el cliente vuelve a suscribirse a los topics de configuracion, provisionamiento, comandos y escenarios.

Configuracion recomendada para demo:

```bash
SPRING_PROFILES_ACTIVE=production,profile1 \
SAFEAIR_CLI_ENABLED=true \
SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=true \
SAFEAIR_MQTT_LOG_LEVEL=WARN \
SAFEAIR_MQTT_LOG_STACKTRACE=false \
SAFEAIR_EMULATOR_CONFIG_LOG_LEVEL=WARN \
MQTT_ENABLED=true \
MQTT_HOST=127.0.0.1 \
MQTT_PORT=1883 \
MQTT_KEEP_ALIVE_SECONDS=60 \
MQTT_CONNECTION_TIMEOUT_SECONDS=10 \
MQTT_MAX_INFLIGHT=100 \
mvn spring-boot:run
```

Comportamiento esperado:

- El menu interactivo permanece visible y usable.
- Los bloques detallados de configuracion dinamica no se imprimen sobre el menu.
- Los eventos internos se consultan desde `2. Ver logs`.
- Los errores MQTT se resumen en consola; el stacktrace completo queda reservado para `SAFEAIR_MQTT_LOG_STACKTRACE=true` o nivel `DEBUG`.
- Si una publicacion falla durante una caida de MQTT, el loop de telemetria sigue vivo y los warnings quedan limitados para evitar spam.

Prueba manual de reconexion:

```bash
timeout 30 docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_sub -h 127.0.0.1 -p 1883 -t 'safeair/+/telemetry' -v

cd ~/DSR_Jorge/Proyecto
docker compose --env-file .env.docker restart mqtt

timeout 60 docker run --rm --network host eclipse-mosquitto:2 \
  mosquitto_sub -h 127.0.0.1 -p 1883 -t 'safeair/+/telemetry' -v
```

Despues del reinicio de MQTT, valida tambien un comando desde API:

```bash
curl -i -X POST "http://localhost:3000/api/v1/edit/emulador/EMU-U001-R001" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"extractor1":"on"}'
```
