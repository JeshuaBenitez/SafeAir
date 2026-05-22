# Dockerizacion - Plan y ejecucion

## Objetivo
Estandarizar el despliegue local para pruebas en red sin depender de IPs fijas, usando nombres de servicio de Docker Compose.

## Pasos y justificacion

### 1) Dockerfile del backend
- **Accion**: crear [Api_Emuladores/Dockerfile](Api_Emuladores/Dockerfile).
- **Por que**: permite compilar TypeScript en una etapa y ejecutar solo artefactos finales.
- **Optimo**: reduce tamaño y dependencias en runtime.
- **Cumple objetivo de red**: SI, el backend se levanta con `BACKEND_BIND_HOST=0.0.0.0` y se conecta por nombre de servicio.

### 2) Dockerfile del frontend
- **Accion**: crear [Frontend_SafeAir/Dockerfile](Frontend_SafeAir/Dockerfile).
- **Por que**: genera build estatico y lo sirve con Nginx.
- **Optimo**: mejor performance y menor superficie en runtime.
- **Cumple objetivo de red**: SI, frontend expuesto en el host (puerto 8080) para acceso desde otros dispositivos.

### 3) Configuracion Nginx para SPA
- **Accion**: crear [Frontend_SafeAir/nginx.conf](Frontend_SafeAir/nginx.conf).
- **Por que**: permite routing de Angular con `try_files`.
- **Optimo**: evita 404 en rutas internas.
- **Cumple objetivo de red**: SI, asegura navegacion estable en acceso remoto.

### 4) Docker Compose en raiz
- **Accion**: crear [docker-compose.yml](docker-compose.yml).
- **Por que**: orquesta servicios con nombres estables `db`, `mqtt`, `api`, `frontend`.
- **Optimo**: elimina dependencias de IPs en la red interna.
- **Cumple objetivo de red**: SI, backend apunta a `db` y `mqtt` por nombre, frontend se expone en host.

### 5) Variables comunes por entorno
- **Accion**: crear [.env.docker](.env.docker).
- **Por que**: centraliza credenciales y parametros de servicios.
- **Optimo**: reduce errores de configuracion manual.
- **Cumple objetivo de red**: SI, estandariza configuracion para multiples dispositivos.

## Comandos de uso
- `docker compose up -d --build`
- `docker compose logs -f api`
- `docker compose logs -f frontend`

## Verificacion de red
- API: `http://<HOST_IP>:3000/health`
- Frontend: `http://<HOST_IP>:8080/auth/login`

## Estado
- Implementado: Dockerfiles, compose, nginx y .env.
- Pendiente: validar en red real con 2-3 dispositivos.
