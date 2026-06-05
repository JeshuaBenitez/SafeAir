# SafeAir - Diagnóstico y Plan de Implementación para Demo

## 📋 RESUMEN EJECUTIVO

| Punto | Estado | Acción Requerida |
|-------|--------|------------------|
| 1. Persistencia de datos | ✅ Implementado | Ninguna |
| 2. Logs en interfaz gráfica | ❌ No existia | **IMPLEMENTADO** (nuevo) |
| 3. Dashboard emuladores Java | ❌ No existe | Pendiente (solo fallback) |
| 4. Conexión LAN | ✅ Mayormente | Verificar en demo |
| 5. Docker Compose | ✅ Implementado | Verificar en demo |

---

## 1. PERSISTENCIA DE DATOS - ✅ IMPLEMENTADO

### Tablas existentes en PostgreSQL:

| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios y autenticación JWT |
| `cycles` | Ciclos de monitoreo |
| `cycle_measurements` | Lecturas: temp, humidity, CO2, PM2.5 |
| `device_actions` | Acciones: on/off, temp changes |
| `device_states` | Estados reportados de dispositivos |
| `rooms` | Habitaciones/aulas |
| `instances` | Instancias de emuladores |
| `emulators` | Configuraciones de emuladores |
| `alarms` | Alarmas del sistema |
| `api_request_logs` | Logs de requests |

### Endpoints de reportes:

| Endpoint | Propósito |
|----------|-----------|
| `GET /api/v1/rooms/:id/metrics/history?from=...&to=...` | **CONSULTA DESDE POSTGRESQL** |
| `GET /api/v1/rooms/:id/metrics/current` | Última medición |
| `GET /api/v1/rooms/:id/metrics/actuator-state` | Estados de actuadores |

### ⚠️ FALTA: Exportación CSV/PDF

Los datos vienen de PostgreSQL, pero no hay endpoints para exportar.

---

## 2. LOGS EN INTERFAZ GRÁFICA - ✅ IMPLEMENTADO (NUEVO)

### Archivos creados:

| Archivo | Propósito |
|---------|-----------|
| `Api_Emuladores/src/application/services/debug-logs.service.ts` | Buffer circular de logs + HTML |
| `Api_Emuladores/src/api/routes/debug.routes.ts` | Router para endpoints de debug |

### Endpoints disponibles:

| Endpoint | Formato | Propósito |
|----------|---------|-----------|
| `GET /debug/logs` | JSON | Logs recientes (filtrables) |
| `GET /debug/logs/html` | HTML | **Vista gráficos en navegador** |
| `GET /debug/status` | JSON | Estado del sistema |

### Cómo usar la vista de logs:

```
# En navegador:
http://localhost:3000/debug/logs/html

# Para monitoreo programmatico:
http://localhost:3000/debug/logs?limit=50&source=mqtt-received
```

### Parametros de filtros:

- `limit` - Cantidad maxima de logs (default: 100)
- `level` - info|warn|error|debug
- `source` - api|mqtt-received|mqtt-published|frontend|emulator|postgres|system
- `since` - ISO timestamp para filtrar desde cierta hora

---

## 3. DASHBOARD DE EMULADORES - ❌ NO IMPLEMENTADO

### Estado actual:
- El emulador Java Spring Boot NO tiene interfaz web
- Solo publica mensajes MQTT
- No hay control de dispositivos desde el emulador

### ⚠️ PENDIENTE:
El usuario pidió no cambiar Spring Boot por otra tecnología. La alternativa sería agregar una vista web simple al emulador Java, pero esto requiere cambios significativos en el proyecto Java.

**Recomendación:** Para la demo de mañana, usar la vista de logs del API como evidencia visual del funcionamiento.

---

## 4. CONEXIÓN LAN - ✅ CONFIGURABLE

### Variables de entorno para LAN:

| Variable | Valor Local | Valor LAN | Propósito |
|----------|-------------|-----------|-----------|
| `API_HOST` | `0.0.0.0` | `0.0.0.0` | Bind a todas las interfaces |
| `CORS_ORIGINS` | `localhost:*` | `http://192.168.x.x:8080` | Orígenes permitidos |
| `DB_HOST` | `db` | `192.168.x.x` | IP de PostgreSQL |
| `MQTT_URL` | `mqtt://mqtt:1883` | `mqtt://192.168.x.x:1883` | IP de EMQX |
| `AUTH_SKIP_OTP` | `true` | `true` | Para demo sin OTP |

---

## 5. DOCKER COMPOSE - ✅ IMPLEMENTADO

### Servicios incluidos:

```yaml
services:
  db:         # PostgreSQL :5432
  mqtt:       # EMQX :1883, :8084, :18083
  api:        # Node.js :3000
  frontend:   # Nginx :8080
  emulator-java:  # Spring Boot :8081
```

---

## 📦 ARCHIVOS TOCADOS/ CREADOS

| Archivo | Acción |
|---------|--------|
| `Api_Emuladores/src/application/services/debug-logs.service.ts` | **CREADO** |
| `Api_Emuladores/src/api/routes/debug.routes.ts` | **CREADO** |
| `Api_Emladores/src/app.ts` | Modificado - agregado debug router |
| `Api_Emuladores/src/server.ts` | Modificado - logging MQTT |
| `docker-compose.yml` | Ya estaba configurado |
| `.env.docker` | Ya estaba configurado |

---

## 🧪 COMANDOS PARA PROBAR

### Una máquina con Docker Compose:

```bash
cd /home/jbenitez/DSR_Jorge/Proyecto

# 1. Configurar variables (modo demo sin OTP)
cp .env.docker .env
sed -i 's/AUTH_SKIP_OTP=false/AUTH_SKIP_OTP=true/' .env

# 2. Levantar servicios
docker compose up -d --build

# 3. Verificar servicios
docker compose ps

# 4. Probar API
curl http://localhost:3000/health

# 5. Probar login (sin OTP)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safeair.io","password":"admin123"}'

# 6. Ver logs en navegador
# Abrir: http://localhost:3000/debug/logs/html

# 7. Ver métricas históricas
curl "http://localhost:3000/api/v1/rooms/{room-id}/metrics/history?from=2026-06-04T00:00:00Z&to=2026-06-04T23:59:59Z"

# 8. Ver dashboard EMQX
# Abrir: http://localhost:18083 (admin/admin)
```

### Red Local (4 laptops):

```bash
# === laptop 2: API + EMQX ===

# EMQX
docker run -d --name safeair-mqtt \
  -e EMQX_ALLOW_ANONYMOUS=true \
  -p 1883:1883 -p 8084:8084 -p 18083:18083 \
  emqx/emqx:latest

# API (ajustar IPs)
docker run -d --name safeair-api \
  -e DB_HOST=192.168.1.100 \
  -e DB_PORT=5432 \
  -e MQTT_URL=mqtt://localhost:1883 \
  -e CORS_ORIGINS="http://192.168.1.104:8080,http://localhost:8080" \
  -e AUTH_SKIP_OTP=true \
  -p 3000:3000 \
  lapajara/safeair-api:latest
```

---

## ✅ CHECKLIST DE VALIDACIÓN PARA LA DEMO

| # | Validación | Comando/Verificación |
|---|------------|---------------------|
| 1 | API responde | `curl http://localhost:3000/health` |
| 2 | Login funciona (sin OTP) | `POST /api/v1/auth/login` retorna JWT |
| 3 | EMQX conecta | Logs muestran "MQTT connected" |
| 4 | Emuladores publican | Ver en `docker logs` o EMQX dashboard |
| 5 | Datos persisten en PostgreSQL | Consultar tablas en DB |
| 6 | Reports muestran datos | `GET /rooms/:id/metrics/history` |
| 7 | CORS permite frontend LAN | Probar desde otra laptop |
| 8 | Vista de logs funciona | Abrir `/debug/logs/html` |
| 9 | Proxy Nginx/Nginx funciona | `curl http://localhost:8080/api/v1/...` |

---

## 📝 NOTAS IMPORTANTES

1. **EMQX es servicio independiente** - No está embebido en el API. El API es cliente MQTT.

2. **Persistencia** - Los reportes SÍ van a PostgreSQL (no memoria).

3. **CSV/PDF** - No implementado. Los reportes se ven en JSON/HTML.

4. **Logs** - Nueva vista `/debug/logs/html` muestra todos los eventos.

5. **Modo demo** - Usar `AUTH_SKIP_OTP=true` para evitar problema de correo.
