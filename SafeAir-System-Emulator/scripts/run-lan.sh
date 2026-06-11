#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

require_java_21() {
  local version_output
  version_output="$(java -version 2>&1 | head -n 1 || true)"
  if ! java -version 2>&1 | head -n 1 | grep -Eq 'version "21\.|openjdk 21\.'; then
    echo "Este emulador requiere Java 21. Version detectada: ${version_output:-java no disponible}" >&2
    echo "Instala o activa JDK 21 antes de continuar." >&2
    exit 1
  fi
}

require_java_21

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-production,profile1}"
export MQTT_HOST="${MQTT_HOST:-IP_PC_DB_MQTT}"
export MQTT_PORT="${MQTT_PORT:-1883}"
export MQTT_TLS_ENABLED="${MQTT_TLS_ENABLED:-false}"
export MQTT_CONSOLE_LOG_ENABLED="${MQTT_CONSOLE_LOG_ENABLED:-true}"
export SAFEAIR_EMULATOR_IDS="${SAFEAIR_EMULATOR_IDS:-EMU-U001-R001,EMU-U001-R002,EMU-U001-R003}"
export SERVER_PORT="${SERVER_PORT:-8081}"

if [ "${MQTT_HOST}" = "IP_PC_DB_MQTT" ]; then
  echo "[SafeAir Emulator] MQTT_HOST still uses placeholder IP_PC_DB_MQTT." >&2
  echo "Set it first, for example: MQTT_HOST=192.0.2.10 ./scripts/run-lan.sh" >&2
  exit 1
fi

echo "[SafeAir Emulator] LAN"
echo "  SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}"
echo "  MQTT_HOST=${MQTT_HOST}"
echo "  MQTT_PORT=${MQTT_PORT}"
echo "  MQTT_TLS_ENABLED=${MQTT_TLS_ENABLED}"
echo "  MQTT_CONSOLE_LOG_ENABLED=${MQTT_CONSOLE_LOG_ENABLED}"
echo "  SAFEAIR_EMULATOR_IDS=${SAFEAIR_EMULATOR_IDS}"
echo "  SERVER_PORT=${SERVER_PORT}"

mvn spring-boot:run \
  -Dspring-boot.run.arguments="--server.port=${SERVER_PORT}"
