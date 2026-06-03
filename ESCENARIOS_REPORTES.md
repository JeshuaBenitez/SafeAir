# Verificación de Reportes Históricos en los 3 Escenarios

La funcionalidad de **reportes históricos por rango de tiempo** debe funcionar en los 3 modos de despliegue de SafeAir.

---

## 🎯 Requisitos Funcionales

✅ Seleccionar rango de tiempo (horaInicio → horaFin)  
✅ Validar rango mínimo (20 min) y máximo (día completo)  
✅ Consultar API endpoint `/api/v1/rooms/{id}/metrics/history?from=X&to=Y`  
✅ Mostrar tabla con métricas históricas  
✅ Exportar CSV y PDF  
✅ Volver a vista normal del dashboard  

---

## 📋 Escenario 1: Monolítico Local Nativo

**Configuración**: Todo en 1 máquina, servicios nativos con Node.js

### Setup:
```bash
# Terminal 1: Base de datos
docker compose up -d db mqtt

# Terminal 2: Backend
cd Api_Emuladores
npm install
npm run seed
npm run dev
# Escucha en: http://localhost:3000

# Terminal 3: Emulador (opcional para datos en vivo)
npm run emulator

# Terminal 4: Frontend
cd ../Frontend_SafeAir
npm install
npm start
# Escucha en: http://localhost:4200
```

### Configuración Necesaria:
- ✅ `Frontend_SafeAir/src/environments/environment.ts`
  ```typescript
  API_BASE_URL: 'http://localhost:3000'  // Ya está por defecto
  ```

### Verificación:
1. Login en `http://localhost:4200` con `admin@safeair.local / admin123`
2. Navega a Dashboard
3. Presiona selector de fecha → selecciona fecha → "Aplicar"
4. Entra a modo historial
5. Ajusta horas inicio/fin (ej: 10:00:00 → 15:30:00)
6. Presiona "Aplicar Rango" → debe cargar tabla
7. Descarga CSV o Imprimir PDF
8. Presiona "Volver a Tiempo Real"

### URLs Generadas:
```
GET http://localhost:3000/api/v1/rooms/{id}/metrics/history?from=2026-06-03T10:00:00.000Z&to=2026-06-03T15:30:00.000Z
```

---

## 🐳 Escenario 2: Docker Compose (Monolítico en Contenedores)

**Configuración**: Todo en contenedores Docker Compose

### Setup:
```bash
# Desde raíz del proyecto
docker compose up -d

# Espera ~30s a que servicios inicien
# Frontend: http://localhost:8080
# Backend: http://localhost:3000 (desde host)
```

### Configuración Necesaria:

#### 2.1 Nginx Proxy (CRÍTICO)
**Ya implementado en `Frontend_SafeAir/nginx.conf`**:
```nginx
location /api/ {
  proxy_pass http://api:3000;  # Refiere al contenedor 'api'
  # Headers necesarios para que Angular funcione detrás del proxy
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### 2.2 Frontend Environment (Build Time)
El frontend se compila con `environment.ts` en tiempo de build. El proxy de Nginx maneja la comunicación interna.

**Importante**: La URL `http://localhost:3000` en el navegador funciona porque:
- Externamente: `http://localhost:8080` (frontend Nginx)
- Nginx hace proxy: `/api/*` → `http://api:3000` (interno en Docker)
- El navegador ve URLs relativas como `/api/v1/rooms/...`

### Verificación:
1. Abre `http://localhost:8080`
2. Login con `admin@safeair.local / admin123`
3. Dashboard → Selector fecha → "Aplicar"
4. Modo historial → ajusta horas → "Aplicar Rango"
5. Tabla debe cargar (petición se enruta vía Nginx proxy)
6. Exporta CSV/PDF
7. "Volver a Tiempo Real"

### URLs Generadas (desde frontend):
```
GET http://localhost:8080/api/v1/rooms/{id}/metrics/history?from=...&to=...
    ↓ (Nginx proxy)
GET http://api:3000/api/v1/rooms/{id}/metrics/history?from=...&to=...
```

### Troubleshooting Docker:
```bash
# Ver logs del frontend
docker logs safeair-frontend

# Ver logs del API
docker logs safeair-api

# Verificar que API está corriendo
curl http://localhost:3000/health

# Reiniciar stack
docker compose down
docker compose up -d
```

---

## 🌐 Escenario 3: Distribuido en Red (Multi-Laptop)

**Configuración**: Componentes en 4 laptops diferentes

### Distribución:
| Laptop | Componente | Puertos | IP Ejemplo |
|--------|-----------|---------|-----------|
| A | PostgreSQL | 6543 | 192.168.1.50 |
| B | API Backend | 3000 | 192.168.1.51 |
| C | MQTT/Emulador | 1883 | 192.168.1.52 |
| D | Frontend | 4200 | 192.168.1.53 |

### Setup por Laptop:

#### Laptop A (Base de Datos):
```bash
docker run -d --name safeair-db \
  -p 6543:5432 \
  -e POSTGRES_DB=safeair \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16

# Firewall: permitir puerto 6543
```

#### Laptop B (Backend):
```bash
cd Api_Emuladores
npm install
npm run seed

# Editar .env:
DB_HOST=192.168.1.50    # IP de Laptop A
DB_PORT=6543
BACKEND_BIND_HOST=0.0.0.0
BACKEND_PORT=3000
MQTT_URL=mqtt://192.168.1.52:1883

npm run dev
# Escucha en: http://0.0.0.0:3000
```

#### Laptop C (MQTT/Emulador):
```bash
# Broker MQTT
docker run -d --name safeair-mqtt \
  -p 1883:1883 \
  -v $(pwd)/mosquitto.conf:/mosquitto/config/mosquitto.conf \
  eclipse-mosquitto:2

# Emulador
export BACKEND_API_URL=http://192.168.1.51:3000
export MQTT_URL=mqtt://localhost:1883
npm run emulator
```

#### Laptop D (Frontend) - CRÍTICO:
```bash
cd Frontend_SafeAir
npm install

# EDITAR: src/environments/environment.ts
# Cambiar:
# API_BASE_URL: 'http://192.168.1.51:3000'  // IP de Laptop B

npm start -- --host 0.0.0.0 --disable-host-check
# Escucha en: http://0.0.0.0:4200
```

### Configuración Necesaria:

**ANTES de cualquier otra cosa, edita el `environment.ts` en Laptop D:**

```typescript
// Frontend_SafeAir/src/environments/environment.ts

export const environment = {
  API_BASE_URL: 'http://192.168.1.51:3000',  // ← Cambiar IP de Laptop B
  // ... rest de config
};
```

### Verificación:
1. Desde cualquier dispositivo en la red, abre `http://192.168.1.53:4200`
2. Login
3. Dashboard → fecha → "Aplicar"
4. Historial → horas → "Aplicar Rango"
5. Tabla debe cargar (peticiones a `http://192.168.1.51:3000/api/v1/...`)
6. CSV/PDF
7. "Volver a Tiempo Real"

### URLs Generadas:
```
GET http://192.168.1.51:3000/api/v1/rooms/{id}/metrics/history?from=...&to=...
```

### Troubleshooting Distribuido:
```bash
# Desde Laptop D (Frontend), probar conectividad a Backend:
curl http://192.168.1.51:3000/health

# Desde Frontend, ver logs de red (Chrome DevTools → Network)
# Buscar requests a /api/v1/rooms/.../metrics/history

# Si falla con CORS:
# Verificar que API tiene CORS habilitado (debe estar en backend)
```

---

## ✅ Checklist de Validación

### Escenario 1 (Nativo Local):
- [ ] Login funciona
- [ ] Selector de fecha en topbar aparece
- [ ] Presionar "Aplicar" entra a modo historial
- [ ] Inputs de hora start/end están visibles
- [ ] "Aplicar Rango" carga tabla
- [ ] Validación: rango < 20 min muestra error
- [ ] Validación: rango > 24h muestra error
- [ ] CSV descarga correctamente
- [ ] PDF se abre en nueva ventana/abre impresora
- [ ] "Volver a Tiempo Real" sale del historial

### Escenario 2 (Docker):
- [ ] `docker compose up -d` levanta 4 servicios
- [ ] Frontend accesible en `http://localhost:8080`
- [ ] API accesible en `http://localhost:3000/health`
- [ ] Nginx proxy está activo (revisar nginx.conf)
- [ ] Login funciona
- [ ] Reportes cargan datos vía proxy
- [ ] Nginx logs no muestran errores 502/503

### Escenario 3 (Distribuido):
- [ ] Laptop B (API) responde a `curl http://{IP_B}:3000/health`
- [ ] Laptop D (Frontend) tiene `API_BASE_URL: 'http://{IP_B}:3000'`
- [ ] Frontend accesible desde otros dispositivos: `http://{IP_D}:4200`
- [ ] Login funciona
- [ ] Reportes cargan datos
- [ ] Firewall permite puerto 3000 en Laptop B
- [ ] Firewall permite puerto 4200 en Laptop D

---

## 🔧 Cambios Implementados

### Frontend:
- ✅ `dashboard-view-page.component.ts`:
  - Propiedades: `startTime`, `endTime`, `rangeError`
  - Métodos: `applyTimeRange()`, `validateTimeRange()`, `loadHistoryWithRange()`, `exportToCsv()`, `exportToPdf()`
  - Importa: `FormsModule`

- ✅ `dashboard-view-page.component.html`:
  - Controles de rango (inputs hora inicio/fin)
  - Botones de exportación (CSV, PDF)
  - Mensaje de error si rango inválido

- ✅ `dashboard-view-page.component.scss`:
  - Estilos para inputs, botones, error message
  - Responsive (mobile)

### Backend:
- ✅ Endpoint ya existe: `/api/v1/rooms/:id/metrics/history?from=X&to=Y`
- ✅ Service ya implementado: `metricsQueryService.history()`

### Infraestructura:
- ✅ `Frontend_SafeAir/nginx.conf`:
  - Proxy `/api/` → `http://api:3000` (para Docker)

---

## 📝 Notas Importantes

1. **Escenario 1**: Más simple, recomendado para desarrollo rápido
2. **Escenario 2**: Simula producción, todos los servicios en contenedores
3. **Escenario 3**: Caso real, distribuido. Requiere cambio de `API_BASE_URL` en el frontend

**El cambio crítico entre escenarios es la URL del API en `environment.ts`**. El resto de la funcionalidad es agnóstica al despliegue.
