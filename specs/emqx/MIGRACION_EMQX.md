# Migración de Mosquitto a EMQX

Cambio del broker MQTT de **Eclipse Mosquitto 2** a **EMQX Latest** para mejorar escalabilidad, monitoreo y características empresariales.

---

## 📊 Comparativa: Mosquitto vs EMQX

| Característica | Mosquitto | EMQX |
|---|---|---|
| **Ligereza** | ✅ ~10MB | ⚠️ ~100MB |
| **Escalabilidad** | ❌ Limitada | ✅ Excelente |
| **Clustering** | ❌ No | ✅ Sí |
| **Dashboard Web** | ❌ No | ✅ Sí (Puerto 18083) |
| **Monitoreo** | ❌ Logs solamente | ✅ Métricas + Dashboard |
| **WebSocket** | ⚠️ Requiere config | ✅ Nativo (Puerto 8084) |
| **TLS/SSL** | ✅ Sí | ✅ Sí (Puerto 8883) |
| **Soporte** | ⚠️ Comunidad | ✅ Comercial + Comunidad |
| **Ideal para** | Desarrollo simple | Producción / Escalabilidad |

---

## 🚀 Cambios Realizados

### 1. Docker Compose Actualizado

**Antes (Mosquitto):**
```yaml
mqtt:
  image: eclipse-mosquitto:2
  ports:
    - "1883:1883"
```

**Ahora (EMQX):**
```yaml
mqtt:
  image: emqx/emqx:latest
  environment:
    EMQX_ALLOW_ANONYMOUS: "true"
    EMQX_LOG_LEVEL: info
  ports:
    - "1883:1883"      # MQTT TCP
    - "8883:8883"      # MQTT over TLS
    - "8084:8084"      # WebSocket
    - "18083:18083"    # Dashboard web
```

### 2. Configuración EMQX

Nuevo archivo: **`emqx.conf`** (opcional, usa defaults si no existe)

Contiene:
- Puerto MQTT: 1883
- WebSocket: 8084
- Dashboard: 18083
- Conexiones anónimas permitidas
- Máximo 1M de conexiones

### 3. URLs de Conexión (sin cambios para backend)

```
# Interno (Docker):
mqtt://mqtt:1883

# Local:
mqtt://localhost:1883

# Red distribuida:
mqtt://{IP}:1883

# WebSocket (para navegador):
ws://localhost:8084

# TLS:
mqtts://localhost:8883
```

---

## 🔧 Usar el Nuevo Broker

### Inicio Local con Docker Compose

```bash
# Parar Mosquitto si estaba corriendo
docker stop safeair-mqtt

# Levantar EMQX
docker compose up -d mqtt

# Verificar que esté corriendo
docker ps | grep emqx

# Ver logs
docker logs safeair-mqtt
```

### Acceder al Dashboard Web

```
URL: http://localhost:18083

Credenciales por defecto:
- Usuario: admin
- Contraseña: public

Características disponibles:
- Conexiones activas
- Mensajes publicados/recibidos
- Métricas de rendimiento
- Gestión de usuarios
- Configuración en vivo
```

### Verificar Conectividad MQTT

```bash
# Probar con mosquitto-cli (si tienes instalado)
mosquitto_pub -h localhost -p 1883 -t "test/topic" -m "Hello EMQX"
mosquitto_sub -h localhost -p 1883 -t "test/topic"

# O con herramienta MQTT online
# MQTTBox, MQTT Explorer, etc.
```

---

## 📋 Escenarios de Despliegue

### Escenario 1: Local Nativo (sin Docker)

```bash
# Descargar y ejecutar EMQX directamente
# Desde: https://www.emqx.io/downloads

# Luego apuntar backend a:
MQTT_URL=mqtt://localhost:1883
```

### Escenario 2: Docker Compose (actual)

```bash
docker compose up -d
# Automáticamente levanta EMQX en puerto 1883
```

### Escenario 3: Distribuido en Red

```bash
# En Laptop C (broker):
docker run -d --name safeair-mqtt \
  -p 1883:1883 \
  -p 18083:18083 \
  -e EMQX_ALLOW_ANONYMOUS=true \
  emqx/emqx:latest

# Desde otras laptops:
MQTT_URL=mqtt://{IP_LAPTOP_C}:1883
```

### Escenario 4: Render (Producción)

En Render, EMQX puede correr como:
- Web Service (con puerto público)
- Database Service (MQTT privado)

Dashboard web: `https://{render-url}:18083`

---

## 🔒 Seguridad para Producción

**⚠️ Cambios recomendados ANTES de producción:**

### 1. Cambiar Credenciales de Dashboard

```conf
# En emqx.conf o variables de entorno
dashboard.default_username = admin
dashboard.default_password = TU_CONTRASEÑA_FUERTE
```

### 2. Deshabilitar Conexiones Anónimas

```conf
authorization.allow_anonymous = false

# Crear usuarios MQTT:
# - emulator: para publicar telemetría
# - api: para suscribirse a comandos
# - frontend: para WebSocket (opcional)
```

### 3. Habilitar TLS/SSL

```conf
listeners.ssl.default.bind = 0.0.0.0:8883
listeners.ssl.default.keyfile = /path/to/key.pem
listeners.ssl.default.certfile = /path/to/cert.pem
```

### 4. Limitar Conexiones por IP

```conf
# Rate limiting
mqtt.max_connections = 10000
mqtt.max_packet_size = 1048576
```

---

## 📊 Monitoreo con Dashboard EMQX

Accede a: `http://localhost:18083`

**Secciones disponibles:**

1. **Overview** — Estado general del broker
   - Conexiones totales
   - Mensajes por segundo
   - Bytes enviados/recibidos
   - CPU y memoria

2. **Clients** — Clientes conectados
   - IP y puerto
   - Tópicos suscritos
   - Mensajes recibidos/enviados
   - Estado de sesión

3. **Topics** — Análisis de tópicos
   - Tópicos activos
   - Publicaciones por segundo
   - Suscriptores

4. **Settings** — Configuración en vivo
   - Parámetros del broker
   - Control de autenticación
   - Límites de conexión

5. **Tools** — Herramientas
   - WebSocket client (publicar/suscribirse)
   - Topic analyser
   - Test MQTT

---

## 🔄 Migración sin Downtime

Si tienes emuladores conectados a Mosquitto:

```bash
# 1. Levantar EMQX mientras Mosquitto está activo
docker compose up -d mqtt

# 2. Reconectar emuladores (se desconectarán de Mosquitto y se conectarán a EMQX)
# Pueden convivir temporalmente (puerto 1883 está en EMQX ahora)

# 3. Verificar conectividad en el dashboard de EMQX
# http://localhost:18083 → Clients

# 4. Detener Mosquitto (si es necesario)
docker stop safeair-mqtt
```

---

## 🐛 Troubleshooting

### EMQX no inicia

```bash
# Ver logs
docker logs safeair-mqtt

# Soluciones comunes:
# 1. Puerto 1883 en uso: `lsof -i :1883` → kill proceso
# 2. Permissions: `sudo chown -R 1000:1000 /var/lib/emqx`
# 3. Reiniciar: `docker restart safeair-mqtt`
```

### Emuladores no se conectan

```bash
# Verificar que MQTT_URL es correcto
echo $MQTT_URL

# Probar conectividad
nc -zv localhost 1883

# Ver clientes conectados en dashboard
# http://localhost:18083 → Clients
```

### Dashboard no accesible

```bash
# Verificar puerto 18083
docker ps | grep emqx
netstat -an | grep 18083

# Firewall:
sudo ufw allow 18083/tcp
```

---

## 📝 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `docker-compose.yml` | Cambió imagen a `emqx/emqx:latest`, agregó variables de entorno y puertos |
| `emqx.conf` (nuevo) | Configuración EMQX (opcional) |
| `mosquitto.conf` | **DEPRECADO** — Ya no se usa |

---

## ✅ Checklist de Migración

- [ ] `docker compose down` (detener stack anterior)
- [ ] Editar `docker-compose.yml` con cambios EMQX
- [ ] `docker compose up -d mqtt` (levantar EMQX)
- [ ] `docker logs safeair-mqtt` (verificar sin errores)
- [ ] Acceder a `http://localhost:18083` (dashboard)
- [ ] Probar conexión MQTT desde emulador
- [ ] Verificar clientes en dashboard → "Clients"
- [ ] Backend recibe telemetría
- [ ] Frontend muestra datos en tiempo real
- [ ] Exportar/importar configuración si es necesario

---

## 🚀 Siguientes Pasos

1. **En desarrollo:** Usa EMQX default (conexiones anónimas permitidas)
2. **Pre-producción:** Configura TLS y autenticación
3. **Producción Render:** Usa variables de entorno para credenciales
4. **Monitoreo:** Integra alertas de EMQX con tu sistema

---

## 📚 Referencias

- **EMQX Docs:** https://docs.emqx.io/
- **MQTT Spec:** https://mqtt.org/
- **Dashboard URL:** `http://localhost:18083`
- **Repositorio:** `emqx/emqx` en Docker Hub
