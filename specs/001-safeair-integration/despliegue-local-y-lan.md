# SafeAir - Guía de Despliegue y Configuración para Demo Local y LAN

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura del sistema SafeAir, los cambios realizados para soportar ejecución en red local (LAN) y Docker Compose, y las instrucciones de despliegue para diferentes escenarios de demo.

**Última actualización**: Junio 2026

---

## 1. Arquitectura del Sistema

### 1.1 Componentes

| Componente | Puerto Default | Tecnología | Propósito |
|------------|----------------|------------|-----------|
| Frontend | 8080 | Angular + Nginx | Interfaz de usuario |
| API/Backend | 3000 | Node.js + Express | Lógica de negocio y REST API |
| EMQX Broker | 1883/8084 | EMQX | Broker MQTT para telemetría |
| PostgreSQL | 5432 | PostgreSQL 16 | Persistencia de datos |
| Emuladores | 8081 | Spring Boot | Dispositivos IoT simulados |

### 1.2 Flujo de Datos

```
Emuladores → EMQX (MQTT) → API → PostgreSQL → Frontend
                                              ↓
Front-end → API → EMQX/API ← Emuladores
```

### 1.3 Características Obligatorias

- ✅ **EMQX como broker MQTT** (no Mosquitto)
- ✅ Autenticación JWT
- ✅ Verificación OTP (opcional para demos)
- ✅ CORS configurable
- ✅ Docker Compose para desarrollo local

---

## 2. Diagnóstico Inicial

### 2.1 Problemas Identificados

| Problema | Causa | Solución Implementada |
|----------|-------|----------------------|
| CORS bloquea LAN | Hardcoded en app.ts | Variable de entorno `CORS_ORIGINS` |
| API_URL hardcodeada | Apuntaba a Render | Configurable en environment.ts |
| OTP bloquea demos | Sin modo bypass | Variable `AUTH_SKIP_OTP` |
| Solo funciona local | Nombres de servicio Docker | IP configurable para LAN |

### 2.2 Archivos Relevantes

```
/Api_Emuladores/src/
├── app.ts                          # CORS dinámico
├── shared/config/env.ts            # Variables de entorno
└── application/services/auth.service.ts  # Modo demo sin OTP

/Frontend_SafeAir/
├── Dockerfile                      # API_BASE_URL configurable
├── nginx.conf                      # Proxy a API
└── src/environments/environment.ts # URL de API dinámica

/docker-compose.yml                 # Orquestación completa
/.env.docker                        # Variables de entorno
```

---

## 3. Cambios Realizados

### 3.1 Backend (API)

#### `Api_Emuladores/src/shared/config/env.ts`
- Agregadas variables:
  - `AUTH_SKIP_OTP`: Omite verificación OTP para demos
  - `API_HOST`: Host para bind (0.0.0.0 = todas las interfaces)
  - `CORS_ORIGINS`: Lista de orígenes permitidos

#### `Api_Emuladores/src/app.ts`
- CORS dinámico basado en variable de entorno

#### `Api_Emuladores/src/application/services/auth.service.ts`
- Modo demo: cuando `AUTH_SKIP_OTP=true`, el login retorna JWT directamente
- Log de debug para diagnóstico de OTP

### 3.2 Frontend

#### `Frontend_SafeAir/src/environments/environment.ts`
- URL de API configurable dinámicamente
- Soporte para `window.__env__` para runtime injection

#### `Frontend_SafeAir/Dockerfile`
- Valor por defecto `API_BASE_URL=host.docker.internal:3000` para Docker Compose

#### `Frontend_SafeAir/nginx.conf`
- Proxy a API con HTTP (compatible con LAN)
- soporta替换 de URL en build time

### 3.3 Docker Compose

#### `docker-compose.yml`
- Mejor documentación
- Health checks mejorados
-puertos expuestos para acceso LAN
- Soporte para variables de entorno externas

#### `.env.docker`
- Variables completas para desarrollo
- Nilai地制宜 por defecto para modo demo

---

## 4. Modo Demo Sin OTP

### 4.1 Activación

Establecer variable de entorno:
```bash
AUTH_SKIP_OTP=true
```

### 4.2 Comportamiento

| AUTH_SKIP_OTP | Login Response |
|---------------|----------------|
| `false` (default) | `{ requiresOtp: true, email }` → requiere verificación |
| `true` | `{ authenticated: true, accessToken, ... }` → login directo |

### 4.3 Recomendación

Para demos y desarrollo local, siempre usar `AUTH_SKIP_OTP=true`.

---

## 5. Instrucciones de Ejecución

### 5.1 Modo: Una Sola Máquina (Docker Compose)

```bash
# 1. Copiar archivo de variables
cd /home/jbenitez/DSR_Jorge/Proyecto
cp .env.docker .env

# 2. Habilitar modo demo sin OTP
sed -i 's/AUTH_SKIP_OTP=false/AUTH_SKIP_OTP=true/' .env

# 3. Construir y levantar servicios
docker compose up -d --build

# 4. Verificar servicios
docker compose ps

# 5. Verificar salud
curl http://localhost:3000/health     # API
curl http://localhost:8080            # Frontend
curl http://localhost:18083           # EMQX Dashboard
```

### 5.2 Modo: Red Local (4 Laptops)

#### Laptop 1: PostgreSQL
```bash
docker run -d \
  --name safeair-db \
  -e POSTGRES_DB=safeair \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

#### Laptop 2: EMQX + API
```bash
# EMQX
docker run -d \
  --name safeair-mqtt \
  -e EMQX_ALLOW_ANONYMOUS=true \
  -p 1883:1883 -p 8084:8084 -p 18083:18083 \
  emqx/emqx:latest

# API (ajustar IP de PostgreSQL)
docker run -d --name safeair-api \
  -e DB_HOST=192.168.1.100 \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=safeair \
  -e MQTT_URL=mqtt://localhost:1883 \
  -e CORS_ORIGINS="http://192.168.1.104:8080,http://localhost:8080" \
  -e AUTH_SKIP_OTP=true \
  -p 3000:3000 \
  lapajara/safeair-api:latest
```

#### Laptop 3: Emuladores
```bash
docker run -d --name safeair-emulator \
  -e MQTT_HOST=192.168.1.102 \
  -e MQTT_PORT=1883 \
  -p 8081:8080 \
  lapajara/safeair-emulator:latest
```

#### Laptop 4: Frontend
```bash
# Build con IP de la API (Laptop 2)
docker build --build-arg API_BASE_URL=192.168.1.102:3000 \
  -t safeair-frontend:latest .

docker run -d -p 8080:80 safeair-frontend:latest
```

---

## 6. Variables de Entorno

### 6.1 Variables del Backend

| Variable | Descripción | Default | Ejemplo LAN |
|----------|-------------|---------|-------------|
| `AUTH_SKIP_OTP` | Omitir OTP | `false` | `true` |
| `CORS_ORIGINS` | Orígenes CORS | `localhost:*` | `192.168.1.104:8080` |
| `DB_HOST` | IP PostgreSQL | `db` | `192.168.1.100` |
| `DB_PORT` | Puerto PostgreSQL | `5432` | `5432` |
| `DB_USER` | Usuario PostgreSQL | `postgres` | `postgres` |
| `DB_PASSWORD` | Contraseña PostgreSQL | - | `postgres` |
| `DB_NAME` | Base de datos | `safeair` | `safeair` |
| `MQTT_URL` | URL MQTT | `mqtt://mqtt:1883` | `mqtt://192.168.1.102:1883` |
| `API_HOST` | Host API | `0.0.0.0` | `0.0.0.0` |
| `PORT` | Puerto API | `3000` | `3000` |

### 6.2 Variables del Frontend (Build Argument)

| Variable | Descripción | Docker Compose | LAN |
|----------|-------------|----------------|-----|
| `API_BASE_URL` | URL del API | `host.docker.internal:3000` | `192.168.1.102:3000` |

---

## 7. Verificación y Pruebas

### 7.1 Checklist de Salud

```bash
# 1. API responde
curl http://localhost:3000/health
# Esperado: {"status":"ok"}

# 2. CORS permite origen
curl -H "Origin: http://192.168.1.104:8080" \
  -H "Access-Control-Request-Method: GET" \
  http://localhost:3000/health
# Esperado: Headers CORS en respuesta

# 3. Login sin OTP (demo mode)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safeair.io","password":"admin123"}'
# Esperado: {"authenticated":true,"accessToken":"eyJ...","..."}

# 4. MQTT conectado (ver logs)
docker logs safeair-api | grep -i mqtt
# Esperado: "MQTT connected"

# 5. Emuladores publican
docker logs safeair-emulator | head -20
# Esperado: Mensajes de telemetría

# 6. Frontend carga
curl http://localhost:8080 | head -20
# Esperado: HTML de Angular

# 7. Proxy Nginx funciona
curl http://localhost:8080/api/v1/rooms \
  -H "Authorization: Bearer <TOKEN>"
# Esperado: JSON desde API
```

### 7.2 Endpoints de Prueba

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/health` | GET | Salud del servicio |
| `/api/v1/auth/login` | POST | Autenticación |
| `/api/v1/auth/verify-otp` | POST | Verificación OTP |
| `/api/v1/auth/me` | GET | Usuario actual |
| `/api/v1/rooms` | GET | Lista de habitaciones |
| `/api/v1/rooms/:id/metrics/current` | GET | Métricas actuales |
| `/api/v1/rooms/:id/metrics/history` | GET | Historial métricas |

---

## 8. Troubleshooting

### 8.1 Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| `host not found in upstream` | Nginx no puede resolver "api" | Usar IP real en `API_BASE_URL` |
| CORS blocked | Origen no en lista | Agregar IP a `CORS_ORIGINS` |
| MQTT no conecta | IP incorrecta | Verificar `MQTT_URL` con IP correcta |
| OTP no funciona | SMTP no configurado | Usar `AUTH_SKIP_OTP=true` |
| Frontend no carga | Puerto expuesto | Verificar puerto 80 en container |

### 8.2 Comandos de Debug

```bash
# Ver logs de un servicio
docker logs safeair-api
docker logs safeair-mqtt
docker logs safeair-frontend

# Ver red de Docker
docker network inspect safeair-network

# Conectar a contenedor
docker exec -it safeair-api sh
docker exec -it safeair-db psql -U postgres

# Ver eventos de Docker
docker events

# Reiniciar servicio
docker compose restart api
```

---

## 9. Seguridad en Producción

### 9.1 Cambios Obligatorios para Producción

1. **JWT_SECRET**: Generar nuevo-secret con `openssl rand -hex 32`
2. **DB_PASSWORD**: Contraseña Strong
3. **EMQX_ALLOW_ANONYMOUS**: Cambiar a `false`
4. **EMQX_ADMIN_PASSWORD**: Contraseña strong
5. **CORS_ORIGINS**: Solo dominios autorizados
6. **AUTH_SKIP_OTP**: Cambiar a `false`

### 9.2 Variables de Producción (.env.production)

```bash
# Production-safe values
AUTH_SKIP_OTP=false
CORS_ORIGINS=https://tu-dominio.com
JWT_SECRET=<generar-con-openssl>
DB_PASSWORD=<strong-password>
EMQX_ALLOW_ANONYMOUS=false
EMQX_ADMIN_PASSWORD=<strong-password>
API_BASE_URL=https://tu-api.onrender.com
```

---

## 10. Referencias

- [EMQX Docker Guide](https://www.emqx.io/docs/en/v5.0/deploy/install-docker.html)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [JWT Best Practices](https://auth0.com/blog/json-web-token-best-practices/)

---

## 📝 Historial de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-06-04 | Creación del documento | Claude Opus 4.7 |
| 2026-06-04 | Agregado modo demo sin OTP | Claude Opus 4.7 |
| 2026-06-04 | Configuración CORS dinámica | Claude Opus 4.7 |
| 2026-06-04 | Soporte para LAN | Claude Opus 4.7 |

---

*Documento generado para el proyecto SafeAir - Sistema de Monitoreo y Control Distribuido*
