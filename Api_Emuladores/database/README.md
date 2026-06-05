# Database Folder (separada de la API)

Esta carpeta contiene todo lo necesario para levantar PostgreSQL de forma local y desacoplada del backend.

## 1) Configurar variables

Copiar:

- `database/.env.example` -> `database/.env`

## 2) Levantar PostgreSQL

Desde `database/`:

```bash
docker compose up -d
```

## 3) Conectar API a la BD

En la raiz del proyecto (`.env`) usar los mismos valores:

- `DB_HOST=127.0.0.1`
- `DB_PORT=6543`
- `DB_NAME=safeair`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres` (o el que definas)

## 4) Crear tablas y datos iniciales

Desde la raiz del proyecto:

```bash
npm run seed
```

Sequelize crea/actualiza tablas en base a los modelos de `src/infrastructure/database/models`.

## 5) Capa de compatibilidad con diccionario de datos

Para alinear al 100% el esquema solicitado en el diccionario/ERD sin romper la API actual,
aplicar el script SQL de compatibilidad:

- `database/sql/002-dictionary-compat.sql`

Este script agrega columnas opcionales y crea vistas con nombres/campos esperados por el diccionario en el esquema `dictionary_compat`:

- `dictionary_compat.instance`, `dictionary_compat.room`, `dictionary_compat.room_setup`, `dictionary_compat.room_setup_derived`, `dictionary_compat.emulator`, `dictionary_compat.device`, `dictionary_compat.cycle`, `dictionary_compat.cycle_measurement`, `dictionary_compat.device_action`, `dictionary_compat.alarm`

Ejemplo con `psql`:

```bash
psql "<DATABASE_URL_EXTERNA>" -f database/sql/002-dictionary-compat.sql
```
