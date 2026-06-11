# SafeAir Frontend

Frontend de la plataforma SafeAir para monitoreo y control de calidad de aire en espacios cerrados.

## Objetivo

Interfaz de usuario Angular 19 que permite:
- Visualizar métricas ambientales en tiempo real (temperatura, humedad, CO2, PM2.5)
- Consultar reportes históricos con filtros por fecha y hora
- Exportar reportes en formato CSV y PDF
- Controlar dispositivos (actuadores) desde el panel

## Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Angular | 19.x | Framework frontend |
| RxJS | 7.x | Programación reactiva |
| TypeScript | 5.x | Tipado estático |
| Nginx | 1.27 | Proxy reverso y servidor |
| Docker | - | Contenedorización |

---

## Pre-requisitos

### Para desarrollo local

```bash
# Node.js 18+ required
node --version  # Verificar versión

# npm o yarn
npm --version
```

### Para Docker

```bash
# Docker instalado
docker --version
```

---

## Instalación

### 1. Instalar dependencias

```bash
cd Frontend_SafeAir
npm install
```

### 2. Configurar entorno (development)

El archivo `src/environments/environment.ts` contiene la configuración:

```typescript
export const environment = {
  production: false,
  
  // URL del API
  API_BASE_URL: 'http://localhost:3000',
  
  // Broker MQTT WebSocket
  MQTT_BROKER_URL: 'ws://localhost:8084/mqtt',
  
  // Modo de autenticación y dashboard
  AUTH_MODE: 'api',
  DASHBOARD_MODE: 'api',
  
  // Feature flags
  features: {
    liveDashboardMetrics: true,
    persistentSession: true,
    jwtInterceptor: true,
  },
};
```

---

## ⚠️ CONFIGURACIÓN PARA RED LOCAL (LAN)

### Para ejecutar en LAN (múltiples laptops)

1. Abrir el archivo `src/environments/environment.ts`
2. Cambiar la URL del API por la IP de la laptop donde corre el API:

```typescript
// CAMBIAR ESTO:
API_BASE_URL: 'http://localhost:3000'

// POR ESTO (usar IP de la laptop con el API):
API_BASE_URL: 'http://IP_PC_API:3000'
```

**Nota**: Cambiar `IP_PC_API` por la IP de la maquina donde corre el API.

### Cómo saber la IP de tu máquina

```bash
# Linux/Mac
hostname -I

# Windows
ipconfig
```

Buscar la IP que начинается con `192.168.` (red local).

---

## Comandos de Desarrollo

### Iniciar servidor de desarrollo

```bash
npm start
# o
ng serve
```

El servidor estará disponible en: **http://localhost:4200**

### Construir para producción

```bash
npm run build
# o
ng build --configuration production
```

Salida en: `dist/safeair-frontend/browser/`

### Ejecutar tests unitarios

```bash
npm test
```

---

## 🐳 Docker

### Construir imagen

**Para una máquina (localhost):**
```bash
docker build -t safeair-frontend .
```

**Para LAN (especificar IP del API):**
```bash
docker build --build-arg API_BASE_URL=http://IP_PC_API:3000 -t safeair-frontend .
```

### Ejecutar contenedor

```bash
# Puerto 8080
docker run -d -p 8080:80 safeair-frontend
```

### Docker Compose

El proyecto incluye `docker-compose.yml` en la raíz que levanta todos los servicios:

```bash
# Desde la raíz del proyecto (directorio padre)
cd ..
docker compose up -d frontend

# Ver servicios
docker compose ps
```

---

## 🔌 Endpoints del API que usa el Frontend

El frontend se comunica con los siguientes endpoints del API:

| Método | Endpoint | Propósito |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Autenticación |
| POST | `/api/v1/auth/register` | Registro de usuarios |
| GET | `/api/v1/rooms` | Listar habitaciones |
| GET | `/api/v1/rooms/:id` | Obtener habitación |
| GET | `/api/v1/rooms/:id/metrics/current` | Métricas actuales |
| GET | `/api/v1/rooms/:id/metrics/history` | Reporte Histórico |
| GET | `/api/v1/rooms/:id/metrics/history/export` | Exportar CSV/PDF |
| POST | `/api/v1/rooms/:id/actuators/:device/command` | Control dispositivo |

---

## 🚀 URLs de Prueba

| Servicio | URL |
|----------|-----|
| Frontend (desarrollo) | http://localhost:4200 |
| Frontend (Docker) | http://localhost:8080 |
| API | http://localhost:3000 |
| Logs visuales | http://localhost:3000/debug/logs.html |
| Emuladores | http://localhost:3000/debug/emulators.html |
| EMQX Dashboard | http://localhost:18083 |

---

## ❗ Solución de Problemas

### Error: CORS bloqueado (más común en LAN)

**Síntoma**: Error en consola del navegador sobre CORS.

**Solución**: El API debe tener configurado el CORS_ORIGINS correcto.

En el archivo `.env.docker` del proyecto raíz:
```bash
CORS_ORIGINS=http://localhost:4200,http://localhost:8080,http://IP_PC_FRONTEND:4200
```

### Error: No conecta al API

**Síntoma**: Las llamadas al API fallan.

**Verificaciones**:
1. El API está corriendo: `curl http://localhost:3000/health`
2. La URL en `environment.ts` es correcta
3. Para LAN, verificar la IP de la máquina con el API

### Error: Puerto 4200 en uso

**Síntoma**: `Error: Port 4200 is already in use`

**Solución**:
```bash
# Matar proceso en ese puerto
lsof -ti:4200 | xargs kill -9

# O usar otro puerto
ng serve --port 4201
```

### Error: No llegan datos al dashboard

**Síntoma**: Dashboard muestra "Sin datos" o loading perpetuo.

**Verificaciones**:
1. API corriendo: `curl localhost:3000/health`
2. Emuladores publicando telemetry
3. Tokens de autenticación correctos
4. Revisar `/debug/logs.html` para ver flujo de datos

---

## 📁 Estructura de Proyecto

```
Frontend_SafeAir/
├── src/
│   ├── app/
│   │   ├── core/           # Servicios centrales, guards, interceptors
│   │   ├── features/       # Módulos de características
│   │   │   ├── auth/       # Login, registro
│   │   │   └── dashboard/   # Dashboard, rooms, métricas
│   │   ├── shared/         # Componentes compartidos
│   │   └── app.routes.ts   # Rutas principales
│   ├── environments/       # Configuración por entorno
│   │   ├── environment.ts      # Desarrollo
│   │   └── environment.prod.ts # Producción
│   └── assets/             # Imágenes, estilos estáticos
├── angular.json            # Configuración Angular
├── nginx.conf             # Configuración Nginx (proxy)
├── Dockerfile              # Construcción Docker
├── package.json
└── tsconfig.json
```

---

## 📋 Verificación de Funcionamiento

### Checklist rápido

```bash
# 1. Verificar que frontend inicia
npm start
# Abrir http://localhost:4200

# 2. Verificar que API responde
curl http://localhost:3000/health

# 3. Login (credenciales por defecto)
# Email: admin@safeair.io
# Password: admin123

# 4. Ver métricas en dashboard (después de login)

# 5. Ver logs visuales
# http://localhost:3000/debug/logs.html
```

---

## 📱 Información Adicional

### Gestión de Sesión
- El JWT se guarda en localStorage
- La sesión persiste entre recargas si `persistentSession: true`
- El interceptor automático añade el token a todas las peticiones

### Modo Demo (importante)
Para demos locales sinOTP:
```bash
# En el proyecto raíz, configurar en .env.docker:
AUTH_SKIP_OTP=true
```

### Credenciales por Defecto
El sistema se sembró con un usuario administrador:
- **Email**: `admin@safeair.io`
- **Password**: `admin123`

---

## 🔗 Referencias

- [Angular Documentation](https://angular.io/docs)
- [Docker](https://docs.docker.com/)
- [Nginx](https://nginx.org/en/docs/)
- [SafeAir API Documentation](../Api_Emuladores/README.md)
- [SafeAir Emulator Documentation](../SafeAir-System-Emulator/README.md)
- [README Principal](../README.md)

---

*Última actualización: Junio 2026*
*Parte del proyecto SafeAir - Desarrollo de Sistemas en Red*
