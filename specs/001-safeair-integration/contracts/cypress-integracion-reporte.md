# Cypress - Reporte de instalacion y ejecucion

## Fecha de ultima actualizacion
- 2026-05-19

## Estado actual
- Cypress instalado y configurado en backend y frontend.
- Pruebas individuales ejecutadas en ambos proyectos.
- Pruebas de integracion ejecutadas en ambos proyectos (suite completa por proyecto).
- Resultado: pruebas pasan (1/1 en backend, 1/1 en frontend).
- Nota: Cypress mostro advertencia sobre `allowCypressEnv` (sin impacto en la ejecucion).

## Fecha de la actualizacion que se va a hacer
- 2026-05-19

## Cambios y actualizaciones (datos y fuentes)

### 1) Instalacion y configuracion de Cypress
- **Dato**: Dependencia `cypress` en `devDependencies`.
- **Fuente**: `package.json` de backend y frontend.
- **Justificacion**: habilitar API testing y UI testing desde el mismo framework.

### 2) Configuracion de Cypress (backend)
- **Dato**: `baseUrl` = `http://localhost:3000`.
- **Fuente**: `Api_Emuladores/cypress.config.ts`.
- **Justificacion**: apuntar a la API local para probar `/health`.

### 3) Configuracion de Cypress (frontend)
- **Dato**: `baseUrl` = `http://localhost:4200`.
- **Fuente**: `Frontend_SafeAir/cypress.config.ts`.
- **Justificacion**: apuntar al servidor Angular local para UI smoke tests.

### 4) Prueba individual (backend)
- **Dato**: `GET /health` responde 200 con `{ status: "ok" }`.
- **Fuente**: `Api_Emuladores/cypress/e2e/health.cy.js` y `Api_Emuladores/src/app.ts`.
- **Justificacion**: valida disponibilidad basica de la API sin depender de login.

### 5) Prueba individual (frontend)
- **Dato**: Render del formulario en `/auth/login` y existencia de inputs `email` y `password`.
- **Fuente**: `Frontend_SafeAir/cypress/e2e/login-page.cy.js`.
- **Justificacion**: smoke test UI para asegurar que la vista carga.

### 6) Ajustes operativos para ejecutar pruebas
- **Dato**: `.env` local y base de datos local por docker compose.
- **Fuente**: `Api_Emuladores/.env` y `Api_Emuladores/database/.env`.
- **Justificacion**: el backend requiere variables de entorno y DB para iniciar.

- **Dato**: correccion en permisos de volumen SQL.
- **Fuente**: `Api_Emuladores/database/docker-compose.yml`.
- **Justificacion**: evitar errores de permisos al inicializar Postgres.

- **Dato**: ajuste de pool validate en Sequelize.
- **Fuente**: `Api_Emuladores/src/infrastructure/database/sequelize.ts`.
- **Justificacion**: evitar fallo de runtime en el pool de conexiones.

- **Dato**: logger con metodo `debug` para auditoria.
- **Fuente**: `Api_Emuladores/src/shared/config/logger.ts`.
- **Justificacion**: evitar error 500 en `/health` causado por `logger.debug` inexistente.

## Evidencia de ejecucion (comandos)

### Servicios requeridos
- `cd Api_Emuladores/database && docker compose up -d`
- `docker run -d --name safeair-mqtt -p 1883:1883 eclipse-mosquitto:2`
- `cd Api_Emuladores && npm run dev`
- `cd Frontend_SafeAir && npm start`

### Backend - pruebas individuales
- `cd Api_Emuladores`
- `npx cypress run --config-file cypress.config.ts --spec cypress/e2e/health.cy.js`
- Resultado: OK

### Frontend - pruebas individuales
- `cd Frontend_SafeAir`
- `npx cypress run --config-file cypress.config.ts --spec cypress/e2e/login-page.cy.js`
- Resultado: OK

### Backend - integracion
- `cd Api_Emuladores`
- `npx cypress run --config-file cypress.config.ts`
- Resultado: OK

### Frontend - integracion
- `cd Frontend_SafeAir`
- `npx cypress run --config-file cypress.config.ts`
- Resultado: OK
