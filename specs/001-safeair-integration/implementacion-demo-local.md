# SafeAir - Implementación para Demo Local

## 📋 Resumen de Cambios

### Archivos Creados:

| Archivo | Propósito |
|---------|-----------|
| `Api_Emuladores/src/application/services/debug-logs.service.ts` | Logs visuales + Dashboard emuladores |
| `Api_Emuladores/src/api/routes/debug.routes.ts` | Rutas de debug |
| `specs/.../implementacion-demo-local.md` | Este documento |

### Archivos Modificados:

| Archivo | Cambio |
|---------|--------|
| `Api_Emuladores/src/api/controllers/metrics.controller.ts` | Agregado endpoint `export()` para CSV/HTML |
| `Api_Emuladores/src/api/routes/v1/metrics.routes.ts` | Agregada ruta `history/export` |
| `Api_Emuladores/src/server.ts` | Integración de logging y estados de emuladores |
| `Api_Emuladores/src/app.ts` | Agregado router de debug |

---

## 🧪 Comandos para Probar

### Docker Compose (una máquina):

```bash
cd /home/jbenitez/DSR_Jorge/Proyecto

# Configurar modo demo sin OTP
echo "AUTH_SKIP_OTP=true" >> .env

# Levantar servicios
docker compose up -d --build

# Verificar
curl http://localhost:3000/health
```

### Endpoints de Demo:

| Servicio | URL | Propósito |
|----------|-----|-----------|
| **Logs visuales** | `http://localhost:3000/debug/logs.html` | Ver todos los logs del sistema |
| **Dashboard emuladores** | `http://localhost:3000/debug/emulators/html` | Ver estado de emuladores conectados |
| **Estado sistema** | `http://localhost:3000/debug/status` | Ver uptime, memoria, etc. |
| **Exportar CSV** | `http://localhost:3000/api/v1/rooms/:id/metrics/history/export?format=csv&from=...&to=...` | Descargar CSV |
| **Ver reportes HTML** | `http://localhost:3000/api/v1/rooms/:id/metrics/history/export?format=html&from=...&to=...` | Ver tabla HTML (imprimir a PDF) |
| **Frontend** | `http://localhost:8080` | Aplicación web |

---

## 📊 Flujos Verificables

### 1. Emulador → PostgreSQL → Frontend
```
1. Emulador publica a EMQX (MQTT)
2. API recibe telemetry (ver logs /debug/logs.html)
3. API persiste en PostgreSQL
4. Frontend consulta /api/v1/rooms/:id/metrics/history
```

### 2. Frontend → EMQX → Emulador
```
1. Frontend sends command to API
2. API publishes to EMQX
3. Emulador receives command
4. Dashboard shows update (/debug/emulators/html)
```

---

## ✅ Checklist de Validación

| # | Prueba | Verificación |
|---|--------|---------------|
| 1 | API responde | `curl http://localhost:3000/health` |
| 2 | Login sin OTP | `POST /api/v1/auth/login` → JWT (con AUTH_SKIP_OTP=true) |
| 3 | Logs visuales | Abrir `http://localhost:3000/debug/logs.html` |
| 4 | Dashboard emuladores | Abrir `http://localhost:3000/debug/emulators/html` |
| 5 | Persistencia datos | Ver tablas en PostgreSQL |
| 6 | Reportes datos | `GET /api/v1/rooms/:id/metrics/history?from=&to=` |
| 7 | Exportar CSV | Botón "Descargar CSV" en frontend |
| 8 | Imprimir PDF | Botón "Imprimir PDF" → ventana impresión |

---

## 📝 Faltantes (para futura iteración)

1. **Dashboard nativo en emulador Java** - Requiere agregar Thymeleaf al proyecto Spring Boot
2. **Control bidireccional completo** - El flujo existe, pero UI de control en emulador no existe

---

*Documento generado: Junio 2026*
