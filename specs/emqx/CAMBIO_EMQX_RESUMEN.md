# Cambio de Mosquitto a EMQX - Resumen

## 🎯 Qué Se Cambió

### Docker Compose
- **Antes:** `eclipse-mosquitto:2`
- **Ahora:** `emqx/emqx:latest`

### Puertos Adicionales
| Puerto | Servicio | Acceso |
|--------|----------|--------|
| 1883 | MQTT TCP | Backend, Emuladores |
| 8883 | MQTT over TLS | Conexiones seguras |
| 8084 | WebSocket MQTT | Frontend, navegador |
| 18083 | Dashboard Web | `http://localhost:18083` |

### Variables de Entorno
```yaml
EMQX_ALLOW_ANONYMOUS: "true"  # Desarrollo (cambiar en producción)
EMQX_LOG_LEVEL: info           # Nivel de logs
```

---

## ✅ Compatibilidad

**SIN cambios requeridos en:**
- ✅ Backend API (`MQTT_URL=mqtt://mqtt:1883`)
- ✅ Emuladores (misma URL de conexión)
- ✅ Docker Compose (servicios dependientes)
- ✅ Endpoints HTTP

**Cambios opcionales:**
- Dashboard web en puerto 18083 (nuevo)
- WebSocket nativo en puerto 8084 (nuevo)
- TLS en puerto 8883 (opcional)

---

## 🚀 Para Probar

```bash
# Limpiar contenedores viejos
docker compose down

# Levantar nuevo stack con EMQX
docker compose up -d

# Ver que EMQX está corriendo
docker logs safeair-mqtt | head -20

# Acceder al dashboard
# http://localhost:18083 (usuario: admin, contraseña: public)
```

---

## 📊 Beneficios de EMQX

1. **Dashboard Web** — Monitoreo visual en tiempo real
2. **Escalabilidad** — Clustering para HA
3. **WebSocket nativo** — Mejor para frontends web
4. **TLS/SSL** — Seguridad mejorada
5. **Métricas** — Stats detalladas de broker

---

## ⚠️ Para Producción

Antes de desplegar en Render, cambiar:

```yaml
# EMQX credenciales
EMQX_ALLOW_ANONYMOUS: "false"
EMQX_DEFAULT_ADMIN_PASSWORD: "TU_CONTRASEÑA"
```

---

## 📁 Archivos Nuevos/Modificados

| Archivo | Estado |
|---------|--------|
| `docker-compose.yml` | ✏️ Modificado |
| `emqx.conf` | ✨ Nuevo |
| `mosquitto.conf` | ⚠️ Deprecado (no necesario) |
| `README.md` | ✏️ Actualizado |
| `MIGRACION_EMQX.md` | ✨ Nuevo (guía completa) |

---

## 🔗 Refs

- **Documentación completa:** `MIGRACION_EMQX.md`
- **EMQX Dashboard:** http://localhost:18083
- **EMQX Docs:** https://docs.emqx.io/
