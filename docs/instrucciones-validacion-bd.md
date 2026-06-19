# Instrucciones de validacion BD ENLACE

## Contexto detectado

- Proyecto Java/Maven: `SafeAir-System-Emulator`, Spring Boot 3.3.0, Java 21.
- Paquete agregado: `com.safeair.emulator.enlace`.
- Compose principal: `docker-compose.yml`.
- Servicios base existentes: `db` PostgreSQL, `mqtt`, `api`, `frontend`.
- Servicios agregados para la practica: `mariadb` y `sqlserver` bajo perfil `enlace`.
- Puertos publicados por defecto: PostgreSQL `6543`, MariaDB `3307`, SQL Server `14330`.
- Scripts SQL: `SafeAir-System-Emulator/src/main/resources/db/enlace/`.

La ruta indicada `/home/jbenitez/BD/Proyectos Almacenados` no existe en este equipo. Se uso la referencia equivalente encontrada en `/home/jbenitez/BD/Procedimientos Almacenados`.

## Ver estado de Docker Compose

Desde la raiz del proyecto:

```bash
docker compose ps
docker compose config
docker compose logs --tail=100
```

Para incluir los gestores destino de la practica:

```bash
docker compose --profile enlace config
docker compose --profile enlace ps
```

## Levantar bases de datos

Levantar PostgreSQL, MariaDB y SQL Server sin iniciar frontend/API:

```bash
docker compose --profile enlace up -d db mariadb sqlserver
```

No borres volumenes para repetir pruebas. Si se necesitara limpiar datos persistentes, pedir confirmacion antes de ejecutar `docker compose down -v`.

## Compilar

```bash
cd SafeAir-System-Emulator
mvn -DskipTests compile
```

## Inicializar tablas, catalogos y procedimientos

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="init"
```

Esto crea/verifica:

- Base `enlace` en PostgreSQL.
- Base `enlace_mariadb` en MariaDB.
- Base `enlace_sqlserver` en SQL Server.
- Tablas normalizadas.
- Catalogos base.
- Procedimientos almacenados de validacion.

## Poblar PostgreSQL desde Excel

La ruta por defecto es `/home/jbenitez/BD/Procedimientos Almacenados/ENLACE.xls`.

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="populate /home/jbenitez/BD/Procedimientos Almacenados/ENLACE.xls"
```

## Replicar hacia MariaDB y SQL Server

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="replicate"
```

La replicacion conserva los IDs originales desde PostgreSQL. En SQL Server se usa `SET IDENTITY_INSERT dbo.<tabla> ON/OFF` por tabla.

## Ejecutar validaciones

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="validate"
```

Prueba controlada con `EXTREMO`, usando transaccion y rollback:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="controlled-invalid-test"
```

Resumen de conteos:

```bash
cd SafeAir-System-Emulator
mvn -DskipTests exec:java \
  -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool \
  -Dexec.args="status"
```

## PostgreSQL

Entrar al contenedor:

```bash
docker compose exec db psql -U postgres -d enlace
```

Si entras desde el host:

```bash
PGPASSWORD=1234567890 psql -h localhost -p 6543 -U postgres -d enlace
```

Consultas:

```sql
\dt

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

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

## MariaDB

Entrar al contenedor:

```bash
docker compose --profile enlace exec mariadb mariadb -u mariadb -p enlace_mariadb
```

Password por defecto: `1234567890`.

Desde el host, usa el puerto publicado `3307`:

```bash
mariadb -h 127.0.0.1 -P 3307 -u mariadb -p enlace_mariadb
```

Consultas:

```sql
SHOW TABLES;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = DATABASE()
ORDER BY table_name, ordinal_position;

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

## SQL Server

Entrar al contenedor:

```bash
docker compose --profile enlace exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hallo1505' -d enlace_sqlserver -C
```

Si la imagen usa la ruta anterior de herramientas:

```bash
docker compose --profile enlace exec sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'Hallo1505' -d enlace_sqlserver
```

Desde el host, usa el puerto publicado `14330`:

```bash
sqlcmd -S localhost,14330 -U sa -P 'Hallo1505' -d enlace_sqlserver -C
```

Consultas:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
ORDER BY TABLE_NAME, ORDINAL_POSITION;
GO

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

## Evidencias sugeridas

- `docker compose --profile enlace ps` con los tres gestores saludables.
- Salida de `mvn -DskipTests compile`.
- Salida de `init`, `populate`, `replicate`, `validate` y `status`.
- Capturas de tablas existentes en PostgreSQL, MariaDB y SQL Server.
- Conteos de `escuela`, `resultado_promedio`, `resultado_logro` y `alumnos_evaluados`.
- Resultado agrupado de `validacion_error`.
- Salida de `controlled-invalid-test` mostrando errores para `validar_grado_marginacion`.
