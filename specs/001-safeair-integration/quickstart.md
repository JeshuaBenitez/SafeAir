# Quickstart / Inicio Rápido

## Objetivo
Levantar el entorno local existente de SafeAir sin cambiar la arquitectura, y validar primero autenticación, luego datos reales y por último concurrencia local.

## 1. Prerrequisitos
- Node.js 18.x o superior.
- Docker y Docker Compose.
- npm instalado.
- PostgreSQL 16 accesible desde el host local en el puerto 6543.
- MQTT broker local accesible en localhost:1883 cuando se quiera probar telemetría en vivo.

## 2. Levantar la base de datos
Desde `Api_Emuladores/database/`:

```bash
docker compose up -d
```

Verificación esperada:
- El contenedor `safeair-postgres` queda en ejecución.
- El backend puede conectarse usando el puerto de host 6543.

## 3. Levantar el backend
Desde `Api_Emuladores/`:

```bash
npm install
npm run dev
```

Verificación esperada:
- El servicio responde en `http://localhost:3000`.
- `GET /health` responde correctamente.
- `POST /api/v1/auth/login` acepta el contrato acordado.

## 4. Levantar el frontend
Desde `Frontend_SafeAir/`:

```bash
npm install
npm start
```

Verificación esperada:
- La aplicación responde en `http://localhost:4200`.
- El login usa la ruta real de autenticación cuando el modo API está habilitado.

## 5. Validar autenticación
- Usar credenciales válidas del entorno local.
- Confirmar que la sesión se guarda en localStorage.
- Confirmar que una recarga mantiene el usuario autenticado mientras el token siga vigente.

## 6. Validar datos reales del dashboard
- Confirmar que el backend expone salas y métricas actuales.
- Confirmar que el frontend puede consultar datos reales desde el backend.
- Si el adapter live todavía no está activado, mantener el mock como respaldo temporal.

## 7. Validar 2-3 clientes simultáneos
- Abrir dos o tres pestañas o ventanas del navegador.
- Autenticarse en cada una.
- Verificar polling de métricas y estabilidad de sesión.
- Confirmar que no se agota la conexión a PostgreSQL ni se pierde la respuesta del backend.

## 8. Apagar el entorno
- Detener el frontend con Ctrl+C.
- Detener el backend con Ctrl+C.
- Apagar la base de datos con:

```bash
cd Api_Emuladores/database
docker compose down
```

## Resolución rápida de problemas / Quick Troubleshooting
- Si el login falla, verificar que el frontend envíe `email` y no `identifier`.
- Si el backend no conecta a la base de datos, confirmar el puerto 6543.
- Si el dashboard no muestra datos en vivo, verificar el adapter HTTP y la URL base.
- Si la telemetría no entra, revisar el broker MQTT y el flujo local de red.
