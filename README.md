# SafeAir

SafeAir es una plataforma IoT para monitoreo y control de calidad del aire en espacios cerrados. El estado actual del proyecto está orientado a demo y validación local, con frontend Angular, API Node.js + Express + TypeScript, PostgreSQL, broker MQTT EMQX y emuladores Java.

El modelo operativo actual es **multiusuario personalizado con pool de emuladores libres**: los usuarios crean sus propias instancias y habitaciones; las habitaciones nuevas toman un emulador libre si existe uno operativo; si no hay emulador disponible, la habitación queda marcada sin emulador y no debe mostrar telemetría falsa.

## Estado Actual

- Validado en modo local/all-in-one con Docker Compose.
- Docker Compose levanta todos los servicios necesarios en una sola máquina.
- El modo distribuido por LAN/VPN requiere configurar IPs reales de cada host y validación adicional.
- No usar nombres antiguos del proyecto ni rutas debug obsoletas.

## Credenciales y Rutas

Credencial admin seed local:

- Email: `admin@safeair.local`
- Password: `admin123`

Rutas principales:

- Frontend: `http://localhost:8080`
- API health: `http://localhost:3000/health`
- Logs debug: `http://localhost:3000/debug/logs/html`
- Emuladores debug: `http://localhost:3000/debug/emulators/html`
- Estado debug: `http://localhost:3000/debug/status`
- EMQX dashboard: `http://localhost:18083`

## Modo Local All-In-One

Este modo sirve para desarrollo y validación local en una sola máquina. Levanta:

- `db`
- `mqtt`
- `api`
- `frontend`
- `emulator-java`

Comando:

```bash
docker compose up -d --build
```

Verificación rápida:

```bash
docker compose ps
curl http://localhost:3000/health
```

URLs esperadas:

| Servicio | URL |
| --- | --- |
| Frontend | `http://localhost:8080` |
| API health | `http://localhost:3000/health` |
| Logs debug | `http://localhost:3000/debug/logs/html` |
| Emuladores debug | `http://localhost:3000/debug/emulators/html` |
| Estado debug | `http://localhost:3000/debug/status` |
| EMQX dashboard | `http://localhost:18083` |

Comandos útiles:

```bash
docker compose logs -f api
docker compose logs -f mqtt
docker compose logs -f frontend
docker compose logs -f emulator-java
docker compose restart api
docker compose down
```

## Persistencia

Docker Compose usa volúmenes para PostgreSQL y EMQX. En modo normal:

```bash
docker compose up -d
```

no destruye usuarios ni datos persistidos.

Importante:

- `docker compose down -v` elimina los volúmenes y reinicia la base de datos.
- Ese reset es útil para pruebas locales desde cero.
- En producción o entornos estables no debe usarse `down -v`.
- La pérdida de cuentas/datos al reiniciar ocurre solo si se eliminan volúmenes, se borra la base o se reinicializa manualmente el almacenamiento.

## Variables Relevantes

API (`Api_Emuladores` / `docker-compose.yml`):

| Variable | Uso |
| --- | --- |
| `DB_HOST` | Host de PostgreSQL |
| `DB_PORT` | Puerto de PostgreSQL |
| `DB_NAME` | Nombre de base de datos |
| `DB_USER` | Usuario de base de datos |
| `DB_PASSWORD` | Password de base de datos |
| `MQTT_URL` | URL MQTT para conectar API con EMQX, ejemplo `mqtt://10.0.0.10:1883` |
| `MQTT_USERNAME` | Usuario MQTT opcional |
| `MQTT_PASSWORD` | Password MQTT opcional |
| `MQTT_CLIENT_ID` | Client id MQTT de la API |
| `MQTT_TELEMETRY_TOPIC` | Topic de telemetría |
| `MQTT_ACTUATOR_STATE_TOPIC` | Topic de estado de actuadores |
| `MQTT_QOS` | QoS MQTT |
| `CORS_ORIGINS` | Orígenes permitidos del frontend |
| `AUTH_SKIP_OTP` | Omite OTP en demo/local si está en `true` |
| `JWT_SECRET` | Secreto para JWT |

Frontend (`Frontend_SafeAir`):

| Variable | Uso |
| --- | --- |
| `API_BASE_URL` | URL base del API para Angular, ejemplo `http://10.0.0.20:3000`. El Dockerfile también tiene un build arg con ese nombre para configurar el proxy Nginx como host:puerto, ejemplo `10.0.0.20:3000`. |

Emulador Java (`SafeAir-System-Emulator`):

| Variable | Uso |
| --- | --- |
| `MQTT_HOST` | Host/IP del broker EMQX |
| `MQTT_PORT` | Puerto MQTT |
| `MQTT_TLS_ENABLED` | Habilita/deshabilita TLS |
| `MQTT_USERNAME` | Usuario MQTT opcional |
| `MQTT_PASSWORD` | Password MQTT opcional |
| `MQTT_CONSOLE_LOG_ENABLED` | Logs MQTT en consola |
| `SPRING_PROFILES_ACTIVE` | Perfil Spring, por ejemplo `profile1` |

PostgreSQL:

| Variable | Uso |
| --- | --- |
| `POSTGRES_DB` | Base inicial |
| `POSTGRES_USER` | Usuario inicial |
| `POSTGRES_PASSWORD` | Password inicial |

## Despliegue Distribuido en LAN/VPN

El `docker compose up -d --build` completo es solo para modo local/all-in-one. En modo distribuido cada equipo debe ejecutar solo el servicio que le corresponde y comunicarse por IPs privadas de la LAN/VPN.

No usar `localhost`, `127.0.0.1` ni nombres internos de Docker como `db`, `mqtt` o `api` cuando los servicios estén en máquinas separadas. Esos nombres solo funcionan dentro de la red de Docker Compose de una misma máquina.

Distribución objetivo:

| Equipo | Servicio |
| --- | --- |
| Laptop Fedora | PostgreSQL + EMQX |
| Laptop Windows de compañero | API |
| Laptop Ubuntu de compañero | Frontend |
| PC Windows de escritorio | Emuladores Java |

Ejemplo de IPs VPN privadas:

```text
FEDORA_VPN_IP=10.10.0.10
API_WINDOWS_VPN_IP=10.10.0.20
FRONTEND_UBUNTU_VPN_IP=10.10.0.30
EMULATOR_WINDOWS_VPN_IP=10.10.0.40
```

Reemplaza esos valores por las IPs reales de ZeroTier, Tailscale o tu VPN/LAN.

### Fedora: PostgreSQL + EMQX

PostgreSQL:

```bash
docker run -d --name safeair-db \
  -e POSTGRES_DB=safeair \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v safeair_db_data:/var/lib/postgresql/data \
  postgres:16
```

EMQX:

```bash
docker run -d --name safeair-mqtt \
  -e EMQX_ALLOW_ANONYMOUS=true \
  -e EMQX_LOG_LEVEL=info \
  -p 1883:1883 \
  -p 8084:8084 \
  -p 18083:18083 \
  -v safeair_mqtt_data:/opt/emqx/data \
  -v safeair_mqtt_log:/opt/emqx/log \
  emqx/emqx:latest
```

### Laptop Windows: API

Desde el repo:

```bash
docker build -t safeair-api ./Api_Emuladores

docker run -d --name safeair-api \
  -e NODE_ENV=production \
  -e DB_HOST=10.10.0.10 \
  -e DB_PORT=5432 \
  -e DB_NAME=safeair \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e MQTT_URL=mqtt://10.10.0.10:1883 \
  -e MQTT_CLIENT_ID=safeair-api \
  -e MQTT_TELEMETRY_TOPIC=safeair/+/telemetry \
  -e MQTT_ACTUATOR_STATE_TOPIC=safeair/+/actuator-state \
  -e MQTT_QOS=1 \
  -e CORS_ORIGINS=http://10.10.0.30:8080 \
  -e AUTH_SKIP_OTP=true \
  -e JWT_SECRET=replace-with-strong-secret-at-least-32-chars \
  -p 3000:3000 \
  safeair-api
```

La API debe apuntar a PostgreSQL y EMQX usando la IP VPN de Fedora.

### Laptop Ubuntu: Frontend

Desde el repo:

```bash
docker build \
  --build-arg API_BASE_URL=10.10.0.20:3000 \
  -t safeair-frontend \
  ./Frontend_SafeAir

docker run -d --name safeair-frontend \
  -p 8080:80 \
  safeair-frontend
```

El frontend debe consumir la API usando la IP VPN del host donde corre la API. En el estado actual del proyecto, Angular lee `API_BASE_URL` desde `window.__env` o desde los archivos `environment`. Si en una prueba distribuida el navegador intenta llamar a `localhost:3000`, configura el runtime `window.__env.API_BASE_URL` o ajusta `Frontend_SafeAir/src/environments/environment.prod.ts` para usar `http://10.10.0.20:3000` antes de compilar. Si ejecutas Angular sin Docker, configura `API_BASE_URL` con URL completa, por ejemplo `http://10.10.0.20:3000`.

### PC Windows: Emuladores Java

Desde el repo:

```bash
docker build -t safeair-emulator ./SafeAir-System-Emulator

docker run -d --name safeair-emulator-java \
  -e MQTT_HOST=10.10.0.10 \
  -e MQTT_PORT=1883 \
  -e MQTT_TLS_ENABLED=false \
  -e MQTT_USERNAME= \
  -e MQTT_PASSWORD= \
  -e MQTT_CONSOLE_LOG_ENABLED=true \
  -e SPRING_PROFILES_ACTIVE=profile1 \
  -p 8081:8080 \
  safeair-emulator
```

Los emuladores deben conectarse a EMQX usando la IP VPN de Fedora.

## VPN Para Pruebas Remotas

Para pruebas remotas se puede usar una VPN tipo ZeroTier o Tailscale. La VPN crea una red privada entre equipos y entrega una IP privada a cada host.

Reglas prácticas:

- Frontend apunta al API por la IP VPN del host del API.
- API apunta a PostgreSQL y EMQX por la IP VPN de Fedora.
- Emuladores apuntan a EMQX por la IP VPN de Fedora.
- `CORS_ORIGINS` en la API debe incluir el origen real del frontend, por ejemplo `http://10.10.0.30:8080`.
- Firewalls locales deben permitir los puertos usados.

## Puertos Esperados

| Puerto | Servicio |
| --- | --- |
| `5432` | PostgreSQL |
| `1883` | MQTT TCP |
| `3000` | API |
| `8080` | Frontend |
| `8081` | Emulador Java/debug HTTP |
| `8084` | MQTT WebSocket EMQX |
| `18083` | EMQX dashboard |

En el compose local, PostgreSQL también se publica como `6543:5432` para acceso desde el host.

## Checklist de Validación Local

- [ ] `docker compose ps` muestra `db`, `mqtt`, `api`, `frontend` y `emulator-java` arriba.
- [ ] `http://localhost:3000/health` responde.
- [ ] Login funciona con `admin@safeair.local`.
- [ ] Creación/listado de instancias funciona.
- [ ] Creación/listado de rooms funciona.
- [ ] Telemetría real llega a rooms con emulador asignado.
- [ ] Reports consultan historial y renderizan registros.
- [ ] Actuadores responden desde frontend/debug.
- [ ] `/debug/logs/html`, `/debug/emulators/html` y `/debug/status` funcionan.

## Checklist de Validación Distribuida/VPN

- [ ] API alcanza PostgreSQL en la IP VPN de Fedora.
- [ ] API alcanza EMQX en la IP VPN de Fedora.
- [ ] Frontend alcanza API en la IP VPN del host Windows API.
- [ ] Emulador Java alcanza EMQX en la IP VPN de Fedora.
- [ ] Login funciona desde el frontend distribuido.
- [ ] Telemetría se refleja en el frontend.
- [ ] Actuadores responden y publican/reciben estado.

La validación local está documentada para el modo all-in-one. La validación distribuida por LAN/VPN depende de pruebas adicionales con los equipos reales conectados.

## Solución de Problemas

Si no conecta desde otra máquina:

```bash
ping <IP_VPN_DEL_HOST>
curl http://<API_WINDOWS_VPN_IP>:3000/health
```

Revisar:

- IP VPN correcta.
- Firewall del host.
- Puertos publicados.
- `CORS_ORIGINS` con el origen real del frontend.
- API sin `DB_HOST=db` ni `MQTT_URL=mqtt://mqtt:1883` en despliegue distribuido.
- Frontend sin `localhost` cuando la API está en otra máquina.

---

SafeAir - Proyecto de Desarrollo de Sistemas en Red.

Ultima actualizacion: Junio 2026.
