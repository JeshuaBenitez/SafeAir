# Guía de Despliegue en Render - Reportes Históricos

Actualización de las 3 imágenes Docker en Render para incluir la funcionalidad de reportes históricos por rango de tiempo.

---

## 📋 Cambios Realizados

### 1. Frontend (Frontend_SafeAir/Dockerfile)
**Mejoras:**
- ✅ `npm ci` en lugar de `npm install` (reproducible builds)
- ✅ `npm run build -- --configuration production` (build optimizado)
- ✅ HEALTHCHECK para monitoreo
- ✅ Nginx proxy para `/api/` → `http://api:3000` (Docker Compose compatible)

**Nuevas funcionalidades:**
- Selector de hora inicio/fin en modo historial
- Validación de rango (min 20 min, máx 24h)
- Botones "Descargar CSV" y "Imprimir PDF"
- Retorno a vista normal del dashboard

### 2. API Backend (Api_Emuladores/Dockerfile)
**Mejoras:**
- ✅ `npm ci` (reproducible builds)
- ✅ Usuario no-root para seguridad
- ✅ HEALTHCHECK `/health`
- ✅ Metadatos optimizados

**Funcionalidades:**
- Endpoint `/api/v1/rooms/:id/metrics/history?from=X&to=Y` ya existía
- Filtra métricas por rango de timestamps
- Devuelve dispositivos activos en el período

### 3. Emulator (Api_Emuladores/Dockerfile.emulator)
**Mejoras:**
- ✅ Usuario no-root
- ✅ Mejor documentación
- ✅ Compatible con producción

---

## 🚀 Instrucciones de Deploy en Render

### Paso 1: Validar Cambios Localmente

Antes de desplegar, verifica que todo compila:

```bash
# Frontend
cd Frontend_SafeAir
npm ci
npm run build -- --configuration production
# Debe generar /dist/safeair-frontend/browser

# API
cd ../Api_Emuladores
npm ci
npm run build
# Debe generar /dist con los archivos compilados

# Emulator
npm run build
# Mismo output
```

---

### Paso 2: Desplegar en Render (por servicio)

#### A) Frontend (Web Service)
1. Ve a **Render Dashboard** → selecciona tu servicio frontend
2. Navega a **Settings** → **Build & Deploy**
3. **Opción A - Auto redeploy (recomendado):**
   - Git está conectado → push a `master` automáticamente triggea redeploy
   ```bash
   git add Dockerfile Frontend_SafeAir/
   git commit -m "feat(frontend): agregar reportes históricos con CSV/PDF export"
   git push origin master
   ```
   - Render verá los cambios en `Dockerfile` y hará rebuild automático

4. **Opción B - Manual redeploy:**
   - En **Settings** → **Build & Deploy** → botón "Clear build cache"
   - Click en "Deploy" (redeploy usando el Dockerfile actualizado)

5. **Verificar:**
   ```bash
   curl https://<tu-frontend-render-url>/health
   # Debe responder con 200
   ```

---

#### B) API Backend (Web Service)
1. Ve a **Render Dashboard** → selecciona tu servicio API
2. Navega a **Settings** → **Build & Deploy**
3. **Auto redeploy:**
   ```bash
   git add Api_Emuladores/Dockerfile
   git commit -m "feat(api): optimizar Dockerfile para producción"
   git push origin master
   ```

4. **Verificar:**
   ```bash
   curl https://<tu-api-render-url>/health
   # Debe responder con código 200
   ```

---

#### C) Emulator (Background Worker / Cron Job)
1. Ve a **Render Dashboard** → selecciona tu servicio emulator
2. Navega a **Settings** → **Build & Deploy**
3. **Auto redeploy:**
   ```bash
   git add Api_Emuladores/Dockerfile.emulator
   git commit -m "feat(emulator): optimizar Dockerfile para producción"
   git push origin master
   ```

4. **Verificar:**
   - Los logs deben mostrar que el emulador se conectó a la API
   - Debe estar publicando telemetría MQTT
   ```bash
   # Ver logs en Render console
   # Busca: "Connected to API" o "Publishing telemetry"
   ```

---

## 🔧 Configuración de Variables de Entorno

### Frontend (Render Environment Variables)
Para que el frontend se comunique con la API correctamente en producción:

**En Render Dashboard → Frontend Settings → Environment:**

```
API_BASE_URL=https://<tu-api-render-url>
```

O déjalo como está si usas proxy en Nginx (recomendado):
```
API_BASE_URL=http://localhost:3000
# Nginx proxy maneja la comunicación interna
```

### API Backend (Render Environment Variables)
Deben estar ya configuradas, pero verifica:

```
NODE_ENV=production
DB_HOST=<tu-render-postgres-host>
DB_PORT=5432
DB_NAME=safeair
DB_USER=postgres
DB_PASSWORD=<tu-contraseña>
MQTT_URL=mqtt://<tu-mqtt-host>:1883
JWT_SECRET=<tu-secret>
# ... otras vars
```

### Emulator (Render Environment Variables)
```
BACKEND_API_URL=https://<tu-api-render-url>
MQTT_URL=mqtt://<tu-mqtt-host>:1883
NODE_ENV=production
```

---

## ✅ Verificación Post-Deploy

### 1. Verificar Frontend
```bash
# Debe servir la app Angular compilada
curl https://<tu-frontend-render-url>
# Debe devolver HTML de index.html

# Verificar assets
curl https://<tu-frontend-render-url>/assets/
# Debe estar disponible

# Prueba en navegador
# Abre https://<tu-frontend-render-url>
# - Login debe funcionar
# - Dashboard debe cargar
# - Selector de fecha debe aparecer
```

### 2. Verificar API
```bash
# Health check
curl https://<tu-api-render-url>/health
# Respuesta esperada: { "status": "ok" }

# Endpoint de reportes
curl -H "Authorization: Bearer <token>" \
  "https://<tu-api-render-url>/api/v1/rooms/{id}/metrics/history?from=2026-06-03T10:00:00Z&to=2026-06-03T15:00:00Z"
# Debe devolver array de métricas
```

### 3. Verificar Emulator
```bash
# En Render Dashboard → Emulator logs
# Busca mensajes como:
# - "Connected to API: https://..."
# - "Connected to MQTT broker"
# - "Publishing telemetry..."
# - "Actuator state changed"
```

### 4. End-to-End
1. Abre https://<tu-frontend-render-url> en navegador
2. Login con credenciales válidas
3. Ve a Dashboard
4. Presiona selector de fecha
5. Selecciona una fecha → "Aplicar"
6. Ingresa horas inicio/fin
7. Presiona "Aplicar Rango"
8. Tabla debe cargar con métricas históricas
9. Descarga CSV → archivo se descarga
10. Presiona "Imprimir PDF" → abre ventana de impresión
11. Presiona "Volver a Tiempo Real" → vuelve a dashboard normal

---

## 🐛 Troubleshooting Render

### Frontend no carga
```bash
# Ver logs en Render console
# Busca errores de nginx o 404s

# Posibles causas:
# 1. Build falló
#    Solución: Clear cache → redeploy
# 2. Nginx proxy no funciona
#    Solución: Verificar nginx.conf está copiado
# 3. API_BASE_URL incorrecta
#    Solución: Revisar environment.ts en build
```

### API devuelve 502 Bad Gateway
```bash
# Render timeout o crash de app
# Revisar logs

# Causas comunes:
# 1. DB connection fail
#    Solución: Verificar DB_HOST, DB_PASSWORD
# 2. MQTT connection fail
#    Solución: Verificar MQTT_URL
# 3. Out of memory
#    Solución: Upgrade plan Render o optimizar queries
```

### Emulator no publica telemetría
```bash
# Ver logs
# Buscar errores de conexión a API o MQTT

# Verificaciones:
# 1. ¿BACKEND_API_URL es accesible?
#    curl $BACKEND_API_URL/health
# 2. ¿MQTT_URL es accesible?
#    Verificar firewall, credenciales
# 3. ¿Hay logs de autenticación?
#    Debe haber "Authenticated as: <device-name>"
```

---

## 📊 Monitoreo

### Render Dashboard Insights
- **Frontend**: Monitorear CPU, memoria, requests
- **API**: Monitorear CPU, memoria, latencia de requests
- **Emulator**: Monitorear memoria (no debe crecer indefinidamente)

### Logs
```bash
# Frontend logs (Nginx)
# Buscar 502, 503, timeout errors

# API logs (Node)
# Buscar errores de DB, MQTT, autenticación

# Emulator logs (Node)
# Buscar "Publishing telemetry", "Error", "Reconnecting"
```

---

## 📝 Checklist Deployment

- [ ] Código local compilado sin errores
- [ ] Git status limpio (no hay cambios uncommitted)
- [ ] Branch correcto (master o main)
- [ ] Push a remote (`git push origin master`)
- [ ] Render auto-redeploy triggered (revisar Render dashboard)
- [ ] Builds completaron sin errores
- [ ] Frontend accesible en URL
- [ ] API health check responde
- [ ] Emulator logs muestran telemetría activa
- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Reportes históricos cargan datos
- [ ] CSV descarga
- [ ] PDF abre

---

## 🔄 Rollback (si algo falla)

Si necesitas volver a una versión anterior:

```bash
# 1. Identifica el commit anterior bueno
git log --oneline | head -10

# 2. Reset local
git reset --hard <commit-hash>

# 3. Push
git push origin master --force
# ⚠️ Solo usa --force si es necesario en una rama de desarrollo

# 4. Render se redeploya automáticamente con el código anterior
```

---

## 📚 Referencias

- Dockerfiles: `/Frontend_SafeAir/Dockerfile`, `/Api_Emuladores/Dockerfile`, `/Api_Emuladores/Dockerfile.emulator`
- Nginx config: `/Frontend_SafeAir/nginx.conf`
- Funcionalidad: `ESCENARIOS_REPORTES.md`
- Especificación completa: `specs/001-safeair-integration/spec.md`

---

**¿Problemas durante el deploy?** Revisa los logs en Render Dashboard o corre `npm run build` localmente para reproducir.
