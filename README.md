# 🌬️ SafeAir: Sistema de Monitoreo de Calidad de Aire

SafeAir es una plataforma de IoT para el monitoreo y control de calidad del aire en espacios cerrados.

---

## 🚀 Modo 1: Una Sola Computadora (Local)

Ejecución rápida donde todos los servicios funcionan en el mismo equipo.

### Pasos:

```bash
# 1. 进入 proyecto
cd /home/jbenitez/DSR_Jorge/Proyecto

# 2. Configurar modo demo (sin OTP)
echo "AUTH_SKIP_OTP=true" >> .env

# 3. Levantar todos los servicios
docker compose up -d --build

# 4. Verificar que todo esté corriendo
docker compose ps
```

### Verificación:

```bash
# Frontend
curl http://localhost:8080

# API
curl http://localhost:3000/health
```

### Acceso:

| Servicio | URL |
|----------|-----|
| **Frontend** | http://localhost:8080 |
| **API** | http://localhost:3000 |
| **Logs** | http://localhost:3000/debug/logs/html |
| **Emuladores** | http://localhost:3000/debug/emulators.html |
| **EMQX** | http://localhost:18083 |

### Credenciales:
- Email: `admin@safeair.io`
- Password: `admin123`

---

## 🌐 Modo 2: Red Local (4 Laptops)

Sistema distribuido donde cada componente corre en una laptop diferente.

### Distribución de Servicios

| Laptop | Servicio | Puerto | IP Configurable |
|--------|----------|--------|-----------------|
| **1** | PostgreSQL | 5432 | ✅ DB_HOST |
| **2** | API + EMQX | 3000, 1883, 8084 | ✅ MQTT_URL |
| **3** | Emuladores Java | 8081 | ✅ MQTT_HOST |
| **4** | Frontend Angular | 8080 | ✅ API_BASE_URL |

### Laptop 1: PostgreSQL

```bash
# Solo la base de datos
docker run -d \
  --name safeair-db \
  -e POSTGRES_DB=safeair \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

### Laptop 2: API + EMQX

```bash
# EMQX
docker run -d --name safeair-mqtt \
  -e EMQX_ALLOW_ANONYMOUS=true \
  -p 1883:1883 -p 8084:8084 -p 18083:18083 \
  emqx/emqx:latest

# API (ajustar IP de PostgreSQL: 192.168.1.100)
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

# Nota: Reemplazar 192.168.1.100 con IP real de Laptop 1
```

### Laptop 3: Emuladores

```bash
# Ajustar IP del EMQX (Laptop 2): 192.168.1.102
docker run -d --name safeair-emulator \
  -e MQTT_HOST=192.168.1.102 \
  -e MQTT_PORT=1883 \
  -e SPRING_PROFILES_ACTIVE=profile1 \
  -p 8081:8080 \
  lapajara/safeair-emulator:latest
```

### Laptop 4: Frontend

```bash
# Build con IP del API (Laptop 2): 192.168.1.102
docker build --build-arg API_BASE_URL=192.168.1.102:3000 \
  -t safeair-frontend .

docker run -d -p 8080:80 safeair-frontend
```

### Configuración del Frontend (Alternativa sin Docker)

Editar `Frontend_SafeAir/src/environments/environment.ts`:

```typescript
// Cambiar de:
API_BASE_URL: 'http://localhost:3000'

// A (IP de Laptop 2):
API_BASE_URL: 'http://192.168.1.102:3000'
```

---

## ✅ Verificación de Funcionamiento

```bash
# 1. API responde
curl http://localhost:3000/health
# Respuesta: {"status":"ok"}

# 2. Login (demo sin OTP)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safeair.io","password":"admin123"}'

# 3. Consultar rooms
curl -H "Authorization: Bearer {TOKEN}" \
  http://localhost:3000/api/v1/rooms

# 4. Ver logs visuales
# Abrir en navegador: http://localhost:3000/debug/logs.html

# 5. Enviar comando de control
curl -X POST "http://localhost:3000/api/v1/rooms/{ROOM_ID}/actuators/minisplit/command" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"action":"turn_on","value":true,"source":"frontend"}'
```

---

## 🛠️ Puertos a Verificar

| Puerto | Servicio |
|--------|----------|
| 3000 | API |
| 5432 | PostgreSQL |
| 6543 | PostgreSQL (Docker expose) |
| 8080 | Frontend |
| 8081 | Emulador Java |
| 1883 | EMQX MQTT |
| 8084 | EMQX WebSocket |
| 18083 | EMQX Dashboard |

---

## 📋 Comandos Rápidos

```bash
# Detener todo
docker compose down

# Ver logs de un servicio
docker logs safeair-api
docker logs safeair-mqtt  
docker logs safeair-frontend
docker logs safeair-emulator-java

# Reiniciar solo un servicio
docker compose restart api
```

---

## 🔧 Configuración de IP para LAN

Si ejecutas enred local diferentes máquinas, asegúrate de:

1. **Frontend**: Configurar `API_BASE_URL` con IP del API
2. **API**: Configurar `DB_HOST` con IP de PostgreSQL
3. **API**: Configurar `MQTT_URL` con IP de EMQX
4. **Emuladores**: Configurar `MQTT_HOST` con IP de EMQX
5. **CORS**: Agregar IPs de las laptops al `CORS_ORIGINS`

---

## ❗ Solución de Problemas

### No conecta desde otra laptop
- Verificar firewall: `firewall-cmd --list-ports`
- Verificar IP correcta: `hostname -I`
- Probar ping entre laptops: `ping 192.168.1.x`

### EMQX no acepta conexiones
- Verificar `EMQX_ALLOW_ANONYMOUS=true`
- Verificar puertos expuestos en docker run

### CORS bloquemado
- Agregar IP del frontend a `CORS_ORIGINS` en .env.docker

---

*SafeAir - Proyecto de Desarrollo de Sistemas en Red*
*Última actualización: Junio 2026*
