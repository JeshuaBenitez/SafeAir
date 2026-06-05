# SafeAir Emulator (Java Spring Boot)

Emulador de dispositivos IoT para SafeAir que simula sensores ambientales y actuadores, publicando telemetría vía MQTT y escuchando comandos desde el API.

## Objetivo

Simular dispositivos IoT que:
- Publican telemetría de sensores (temperatura, humedad, CO2, PM2.5)
- Escuchan y responden a comandos de control
- Actualizan su estado interno según comandos recibidos

## Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Java | 17 | Lenguaje principal |
| Spring Boot | 3.x | Framework |
| Eclipse Paho | - | Cliente MQTT |
| Maven | - | Gestor de dependencias |

---

## Pre-requisitos

### Para desarrollo local

```bash
# Java 17
java -version

# Maven 3.8+
mvn --version
```

### Para Docker

```bash
# Docker instalado
docker --version
```

---

## Estructura del Proyecto

```
SafeAir-System-Emulator/
├── src/main/
│   ├── java/com/safeair/emulator/
│   │   ├── api/
│   │   │   ├── mqtt/          # Cliente MQTT (publicación y suscripción)
│   │   │   ├── adapter/       # Adaptadores de datos
│   │   │   ├── dto/           # Objetos de transferencia
│   │   │   └── client/        # Cliente HTTP
│   │   ├── config/            # Configuración Spring Boot
│   │   ├── emulation/
│   │   │   ├── core/          # Emulator.java, TelemetryPayload
│   │   │   └── impl/          # MiniSplit, Purifier, Extractor
│   │   ├── manager/           # EmulatorManager
│   │   └── emulation/         # Simulación física
│   └── resources/
│       └── application.yml    # Configuración principal
└── pom.xml
```

---

## Instalación

### Desarrollo Local (Maven)

```bash
cd SafeAir-System-Emulator
mvn clean install
```

### Desarrollo con Docker

```bash
docker build -t safeair-emulator .
```

---

## Variables de Entorno

### Para Desarrollo

El emulador puede configurarse mediante variables de entorno:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `MQTT_HOST` | `localhost` | IP del broker EMQX |
| `MQTT_PORT` | `1883` | Puerto MQTT |
| `MQTT_TLS_ENABLED` | `false` | Usar TLS |
| `MQTT_USERNAME` | - | Usuario MQTT (opcional) |
| `MQTT_PASSWORD` | - | Contraseña MQTT (opcional) |
| `MQTT_CONSOLE_LOG_ENABLED` | `true` | Habilitar logs en consola |
| `SPRING_PROFILES_ACTIVE` | `production` | Perfil de Spring |

### Perfiles Disponibles

| Perfil | Descripción |
|--------|-------------|
| `production` | Configuración por defecto |
| `profile1` | 2 emuladores (EMU-0001, EMU-0002) |
| `emqx` | Configuración específica para EMQX |

### Ejemplo para LAN

```bash
export MQTT_HOST=192.168.1.102
export MQTT_PORT=1883
export MQTT_TLS_ENABLED=false
export SPRING_PROFILES_ACTIVE=profile1
mvn spring-boot:run
```

### Ejemplo Docker

```bash
docker run -d \
  -e MQTT_HOST=192.168.1.102 \
  -e MQTT_PORT=1883 \
  -e SPRING_PROFILES_ACTIVE=profile1 \
  safeair-emulator
```

---

## Tópicos MQTT

### Suscripción (recibe comandos)

| Tópico | Descripción |
|--------|-------------|
| `safeair/+/actuator-state` | Comandos de control desde API |

### Publicación (envía telemetría)

| Tópico | Descripción |
|--------|-------------|
| `safeair/{emulatorId}/telemetry` | Datos de sensores |

### Formato de Telemetría Publicada

```json
{
  "emulatorId": "EMU-0001",
  "timestamp": "2026-06-04T12:00:00Z",
  "roomId": "uuid...",
  "temperature": 23.5,
  "humidity": 65.2,
  "co2": 450,
  "pm25": 12,
  "deviceStates": {
    "minisplit": { "isOn": true, "targetTemperature": 24 },
    "purifier": { "isOn": true },
    "extractor": { "isOn": false }
  }
}
```

---

## Acciones Soportadas

El emulador responde a los siguientes comandos recibidos vía MQTT:

### Minisplit (Aire Acondicionado)

| Comando | Acción |
|---------|---------|
| `minisplit_on` | Encender aire acondicionado |
| `minisplit_off` | Apagar aire acondicionado |
| `minisplit_set_24` | Establecer temperatura a 24°C |

### Purificador

| Comando | Acción |
|---------|---------|
| `purifier_on` | Encender purificador |
| `purifier_off` | Apagar purificador |

### Extractor

| Comando | Acción |
|---------|---------|
| `extractor_on` | Encender extractor |
| `extractor_off` | Apagar extractor |

---

## Ejecución

### Desarrollo Local (Maven)

```bash
# Con perfil default
mvn spring-boot:run

# Con perfil específico
mvn spring-boot:run -Dspring-boot.run.profiles=profile1

# Con variables específicas
MQTT_HOST=localhost MQTT_PORT=1883 mvn spring-boot:run
```

El emulador publicará telemetría cada intervalo configurado.

### Docker

```bash
# Construcción
docker build -t safeair-emulator .

# Ejecución con perfil profile1 (2 emuladores)
docker run -d \
  -e MQTT_HOST=192.168.1.102 \
  -e MQTT_PORT=1883 \
  -e SPRING_PROFILES_ACTIVE=profile1 \
  -e MQTT_CONSOLE_LOG_ENABLED=true \
  safeair-emulator
```

### Docker Compose

Desde la raíz del proyecto:
```bash
docker compose up -d emulator-java
```

---

## Verificación de Funcionamiento

### Ver logs del emulador

```bash
docker logs safeair-emulator-java

# Buscar mensajes de conexión
grep -i "MQTT\|emulator\|telemetry" docker logs safeair-emulator-java
```

### Verificar en EMQX Dashboard

1. Abrir: http://localhost:18083
2. Ir a "WebSocket"
3. Suscribirse a: `safeair/+/telemetry`
4. Ver mensajes entrants

### Verificar en API Logs

Abrir en navegador:
- http://localhost:3000/debug/logs.html
- http://localhost:3000/debug/emulators.html

---

## Estados Internos

El emulador mantiene estado interno de:

### Sensores
- Temperatura ambiente
- Humedad relativa
- CO2 (ppm)
- PM2.5 (μg/m³)

### Dispositivos

| Dispositivo | Estado | Propiedad adicional |
|-------------|--------|---------------------|
| MiniSplit | ON/OFF | Temperatura objetivo |
| Purificador | ON/OFF | - |
| Extractor | ON/OFF | - |

---

## Solución de Problemas

### Error: No conecta a EMQX

```bash
# Verificar que EMQX esté corriendo
docker ps | grep emqx

# Verificar puertos
docker logs safeair-mqtt | grep listening
```

### Error: No recibe comandos

```bash
# Verificar suscripción
docker logs safeair-emulator-java | grep -i subscribe

# Verificar que el tópico es correcto
# Debe estar escuchando: safeair/+/actuator-state
```

### Error: No publica telemetría

```bash
# Verificar configuración MQTT
docker logs safeair-emulator-java | grep -i publish
```

### Verificar perfiles

```bash
# Con perfil profile1 debe crear EMU-0001 y EMU-0002
docker logs safeair-emulator-java | grep -i "EMU-"
```

---

## Estado Actual del Emulador

- ✅ Conexión a EMQX como cliente MQTT
- ✅ Publicación de telemetría periódica
- ✅ Suscripción a tópico de comandos
- ✅ Procesamiento de comandos (on/off/set_temperature)
- ✅ Actualización de estado interno
- ✅ Soporte para múltiples emuladores (profile1)
- ✅ Simulación física realista
- ✅ Perfiles configurables

---

## Referencias

- [Frontend SafeAir](../Frontend_SafeAir/README.md)
- [API SafeAir](../Api_Emuladores/README.md)
- [Documentación Final](../../specs/001-safeair-integration/documentacion-final-safeair.md)
- [EMQX Documentation](https://www.emqx.io/docs/)

---

*Última actualización: Junio 2026*
*Parte del proyecto SafeAir - Desarrollo de Sistemas en Red*
