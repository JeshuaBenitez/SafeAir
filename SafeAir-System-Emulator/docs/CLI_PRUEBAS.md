# Pruebas de la CLI del emulador

Esta guia contiene comandos listos para ejecutar el emulador con la nueva CLI interactiva y validar sus funciones principales.

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
3. Modificar comportamiento/configuracion
0. Salir
```

Pruebas recomendadas:

1. Escribe `1` para validar el listado de emuladores y sus atributos.
2. Escribe `2`, luego `2` para ver logs de todos los emuladores ordenados.
3. Escribe `2`, luego `1`, captura un `emulatorId` del listado y consulta solo sus logs.
4. Escribe `3`, luego `1` para modificar un solo emulador.
5. Dentro de esa opcion, prueba:
   `1` escenario `poor-air`
   `2` variable `set_co2` con valor `1400`
   `3` para pausar
   `4` para reanudar
   `5` para reconfigurar sala
6. Escribe `3`, luego `2` para aplicar cambios al conjunto completo.

## 6. Ejemplo de prueba manual completa

Secuencia corta para una validacion rapida:

```text
1
2
2
3
1
CLI-EMU-ALPHA
1
hot-room
2
1
CLI-EMU-ALPHA
3
2
2
1
poor-air
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
- Menu interactivo para listar, ver logs y modificar comportamiento o configuracion.

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
