# SafeAir

SafeAir es una plataforma IoT para monitoreo y control de calidad del aire en espacios cerrados. El proyecto integra un frontend Angular, una API Node.js/Express, PostgreSQL, un broker MQTT EMQX y emuladores Java/Spring Boot que simulan sensores y actuadores.

Tambien incluye una practica de gestores de bases de datos llamada **ENLACE**, donde se inicializa un modelo normalizado en PostgreSQL, se carga informacion desde Excel y se replica hacia MariaDB y SQL Server para validar datos con procedimientos almacenados.

## Objetivo

El objetivo principal es demostrar un sistema distribuido donde un usuario puede registrar aulas o habitaciones, recibir telemetria ambiental simulada y controlar actuadores como minisplit, purificador y extractor.

El sistema funciona asi:

1. El usuario entra al frontend en `http://localhost:8080`.
2. El frontend consume la API en `http://localhost:3000`.
3. La API guarda usuarios, habitaciones, configuraciones, mediciones, alarmas y acciones en PostgreSQL.
4. Los emuladores Java publican telemetria al broker EMQX usando MQTT.
5. La API esta suscrita a los topics MQTT, valida la telemetria y la persiste.
6. Cuando el usuario prende/apaga un actuador, el frontend llama a la API.
7. La API valida el comando, lo guarda en `device_actions` y lo publica por MQTT hacia el emulador.
8. El emulador actualiza su estado interno y vuelve a reportar telemetria y estados de actuadores.

## Tecnologias

| Parte | Tecnologia |
| --- | --- |
| Frontend | Angular 19, TypeScript, Nginx |
| API | Node.js, Express, TypeScript, Sequelize |
| Base principal | PostgreSQL 16 |
| Broker | EMQX MQTT |
| Emulador | Java 21, Spring Boot, Maven, Eclipse Paho |
| ENLACE | PostgreSQL, MariaDB, SQL Server, JDBC |

## Levantar el Proyecto con Docker Compose

Desde la raiz del proyecto:

```bash
docker compose --env-file .env.docker --profile emulator up --build -d
```

Esto levanta:

- `db`: PostgreSQL principal de SafeAir.
- `mqtt`: broker EMQX.
- `api`: backend Express.
- `frontend`: interfaz Angular servida con Nginx.
- `emulator-java`: emuladores IoT Java.

Verificar:

```bash
docker compose ps
curl http://localhost:3000/health
```

URLs locales:

| Servicio | URL |
| --- | --- |
| Frontend | `http://localhost:8080` |
| API health | `http://localhost:3000/health` |
| API logs debug | `http://localhost:3000/debug/logs/html` |
| Emuladores debug | `http://localhost:3000/debug/emulators/html` |
| Estado debug | `http://localhost:3000/debug/status` |
| EMQX dashboard | `http://localhost:18083` |

Credencial local sembrada:

- Email: `admin@safeair.local`
- Password: `admin123`

### Levantar Gestores ENLACE

Para la practica ENLACE:

```bash
docker compose --profile enlace up -d db mariadb sqlserver
```

Verificar:

```bash
docker compose --profile enlace ps
```

Puertos usados por ENLACE segun `.env`:

| Gestor | Host | Puerto | Base |
| --- | --- | --- | --- |
| PostgreSQL | `localhost` | `6543` | `enlace` |
| MariaDB | `localhost` | `3307` | `enlace_mariadb` |
| SQL Server | `localhost` | `14330` | `enlace_sqlserver` |

Inicializar estructuras:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="init"
```

Cargar datos desde Excel:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="populate /home/jbenitez/BD/Procedimientos Almacenados/ENLACE.xls"
```

Replicar desde PostgreSQL hacia MariaDB y SQL Server:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="replicate"
```

Validar los tres gestores:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="validate"
```

Ver conteos:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="status"
```

## Bajar el Proyecto con Docker Compose

Bajar contenedores sin borrar datos:

```bash
docker compose --profile emulator --profile enlace down
```

Bajar solo SafeAir:

```bash
docker compose --profile emulator down
```

Bajar ENLACE:

```bash
docker compose --profile enlace down
```

Borrar tambien volumenes persistentes:

```bash
docker compose --profile emulator --profile enlace down -v
```

Usa `down -v` solo si quieres reiniciar las bases desde cero. Ese comando elimina datos de PostgreSQL, MariaDB, SQL Server y EMQX.

## Consultas a Bases de Datos

### PostgreSQL SafeAir

Entrar al contenedor:

```bash
docker compose exec db psql -U postgres -d safeair
```

Entrar desde el host:

```bash
PGPASSWORD=1234567890 psql -h localhost -p 6543 -U postgres -d safeair
```

Visualizar tablas:

```sql
\dt
```

Ver tablas principales:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Ver habitaciones y emuladores asignados:

```sql
SELECT u.email, i.name AS instance_name, r.name AS room_name, e."emulatorExternalId"
FROM users u
JOIN instances i ON i."userId" = u.id
JOIN rooms r ON r."instanceId" = i.id
LEFT JOIN emulators e ON e."roomId" = r.id
ORDER BY u.email, r.name;
```

### Almacenamiento de Datos por Actuadores

Los comandos manuales o automaticos se almacenan en `device_actions`. El ultimo estado reportado por MQTT se guarda en `device_states`. Las mediciones ambientales se almacenan en `cycle_measurements`.

Consultar acciones de actuadores:

```sql
SELECT "roomId", "deviceType", "deviceIndex", action, reason, "requestedBy", "executedAt"
FROM device_actions
ORDER BY "executedAt" DESC
LIMIT 20;
```

Consultar ultimo estado de actuadores:

```sql
SELECT "roomId", "emulatorId", "deviceType", "deviceIndex", "isOn",
       mode, "targetTemperature", "reportedAt"
FROM device_states
ORDER BY "reportedAt" DESC
LIMIT 20;
```

Consultar ultimas mediciones:

```sql
SELECT "roomId", temperature, humidity, co2, pm25, "measuredAt", source
FROM cycle_measurements
ORDER BY "measuredAt" DESC
LIMIT 20;
```

### PostgreSQL ENLACE

```bash
PGPASSWORD=1234567890 psql -h localhost -p 6543 -U postgres -d enlace
```

```sql
\dt

SELECT COUNT(*) FROM escuela;
SELECT COUNT(*) FROM resultado_promedio;
SELECT COUNT(*) FROM resultado_logro;
SELECT COUNT(*) FROM alumnos_evaluados;

CALL validar_base_enlace();

SELECT nombre_validacion, COUNT(*) AS total
FROM validacion_error
GROUP BY nombre_validacion
ORDER BY nombre_validacion;
```

### MariaDB ENLACE

```bash
docker compose --profile enlace exec mariadb mariadb -u mariadb -p enlace_mariadb
```

Password local: `1234567890`

```sql
SHOW TABLES;

SELECT COUNT(*) FROM escuela;
SELECT COUNT(*) FROM resultado_promedio;
SELECT COUNT(*) FROM resultado_logro;
SELECT COUNT(*) FROM alumnos_evaluados;

CALL validar_base_enlace();

SELECT nombre_validacion, COUNT(*) AS total
FROM validacion_error
GROUP BY nombre_validacion
ORDER BY nombre_validacion;
```

### SQL Server ENLACE

```bash
docker compose --profile enlace exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hallo1505' -d enlace_sqlserver -C
```

Visualizar tablas:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO
```

Consultar conteos y validaciones:

```sql
SELECT COUNT(*) AS escuelas FROM dbo.escuela;
SELECT COUNT(*) AS resultados_promedio FROM dbo.resultado_promedio;
SELECT COUNT(*) AS resultados_logro FROM dbo.resultado_logro;
SELECT COUNT(*) AS alumnos_evaluados FROM dbo.alumnos_evaluados;
GO

EXEC dbo.validar_base_enlace;
GO

SELECT nombre_validacion, COUNT(*) AS total
FROM dbo.validacion_error
GROUP BY nombre_validacion
ORDER BY nombre_validacion;
GO
```

## Sistema de Gestores de Bases de Datos

El proyecto maneja dos contextos de persistencia.

El primer contexto es **SafeAir**, que usa PostgreSQL como base transaccional principal. La API crea y sincroniza sus tablas con Sequelize. Ahi se guardan los usuarios, instancias, habitaciones, configuraciones fisicas, emuladores asignados, ciclos de monitoreo, mediciones, estados de actuadores, acciones y alarmas. Esta base es la fuente de verdad operativa de la plataforma.

El segundo contexto es **ENLACE**, usado para practicar interoperabilidad entre gestores. El flujo es:

1. PostgreSQL actua como origen normalizado.
2. `EnlaceDatabaseTool init` crea bases, tablas, catalogos y procedimientos en PostgreSQL, MariaDB y SQL Server.
3. `populate` importa el Excel ENLACE hacia PostgreSQL.
4. `replicate` copia las tablas normalizadas desde PostgreSQL hacia MariaDB y SQL Server.
5. `validate` ejecuta procedimientos almacenados equivalentes en los tres gestores.
6. `status` muestra conteos por tabla para comparar los resultados.

Las tablas ENLACE modelan entidades educativas: `entidad`, `municipio`, `localidad`, `escuela`, `nivel_educativo`, `grado`, `materia`, `resultado_promedio`, `resultado_logro`, `alumnos_evaluados` y `validacion_error`. Las validaciones revisan reglas como clave de escuela, grado de marginacion, coherencia de alumnos evaluados y porcentajes por nivel de logro.

La replicacion conserva los IDs originales. En SQL Server se habilita `IDENTITY_INSERT` por tabla para insertar las llaves provenientes de PostgreSQL. En MariaDB se limpian tablas con `FOREIGN_KEY_CHECKS = 0` antes de replicar. El proceso usa transacciones para confirmar o revertir la copia completa si ocurre un error.

## Arquitectura

La arquitectura combina comunicacion HTTP sincrona y mensajeria MQTT asincrona.

```text
Frontend Angular
  -> API Express
      -> PostgreSQL SafeAir
      -> EMQX MQTT
          -> Emulador Java
              -> EMQX MQTT
                  -> API Express
                      -> PostgreSQL SafeAir
```

Capas principales:

- `Frontend_SafeAir`: interfaz Angular para login, dashboard, reportes y control de actuadores.
- `Api_Emuladores/src/api`: rutas, middlewares y contratos HTTP.
- `Api_Emuladores/src/application`: casos de uso como autenticacion, habitaciones, metricas, comandos e ingestion de telemetria.
- `Api_Emuladores/src/domain`: tipos y reglas de dominio, por ejemplo calculos derivados de configuracion.
- `Api_Emuladores/src/infrastructure`: modelos Sequelize, repositorios y gateway MQTT.
- `SafeAir-System-Emulator`: simulacion Java de sensores y actuadores.
- `SafeAir-System-Emulator/src/main/java/com/safeair/emulator/enlace`: herramienta JDBC para gestores ENLACE.

## Patrones de Diseno y SOLID

Patrones identificados en el proyecto:

- **Arquitectura por capas**: separa API, aplicacion, dominio e infraestructura.
- **Repository**: los repositorios encapsulan acceso a Sequelize y evitan que los servicios dependan directo de consultas SQL.
- **Service Layer**: los servicios de aplicacion concentran casos de uso como `TelemetryIngestionService`, `ActuatorCommandService` y `MetricsQueryService`.
- **Gateway/Adapter**: `mqtt.gateway.ts` encapsula la comunicacion con EMQX.
- **Dependency Injection manual**: `container.ts` instancia dependencias y las inyecta en servicios.
- **Pub/Sub**: MQTT desacopla comandos y telemetria entre API y emuladores.
- **DTO/Schema Validation**: se usa validacion de entradas, por ejemplo con Zod en telemetria.

Principios SOLID aplicados:

- **S - Responsabilidad unica**: cada servicio atiende un caso de uso concreto; los repositorios solo persisten/consultan.
- **O - Abierto/cerrado**: nuevas reglas, rutas o repositorios pueden agregarse sin reescribir todo el flujo.
- **L - Sustitucion de Liskov**: los servicios consumen contratos simples de repositorios/gateways sin depender de detalles del motor.
- **I - Segregacion de interfaces**: la logica esta separada por modulos pequenos en lugar de una unica clase global.
- **D - Inversion de dependencias**: los servicios de aplicacion reciben repositorios y gateways desde el contenedor, no los crean dentro del caso de uso.

## Comandos Utiles

```bash
docker compose logs -f api
docker compose logs -f mqtt
docker compose logs -f frontend
docker compose logs -f emulator-java
docker compose restart api
docker compose ps
```

## Persistencia

Docker Compose usa volumenes persistentes:

- `db_data`
- `mqtt_data`
- `mqtt_log`
- `enlace_mariadb_data`
- `enlace_sqlserver_data`

Mientras uses `docker compose down` los datos se conservan. Si usas `docker compose down -v`, Docker elimina los volumenes y las bases se reinician.
