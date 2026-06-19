import mqtt from "mqtt";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import {
  getMqttUrl,
  getApiUrl,
  getDummyPort,
  getEmulatorId,
  MQTT_RECONNECT_PERIOD_MS,
  DEVICE_TYPES,
  DEFAULT_DEVICE_STATE,
  INITIAL_STATE,
  getDefaultCredentials,
  DEFAULT_DEVICE_INDEX,
  MAX_DEVICE_INDEX,
  TEMPERATURE_BOUNDS,
  HUMIDITY_BOUNDS,
  CO2_BOUNDS,
  PM25_BOUNDS,
  TEMPERATURE_COOLING_RATE,
  TEMPERATURE_DRIFT_RATE,
  TEMPERATURE_NOISE_AMPLITUDE,
  HUMIDITY_EXTRACTOR_RATE,
  HUMIDITY_NATURAL_RATE,
  HUMIDITY_NOISE_AMPLITUDE,
  CO2_EXTRACTOR_RATE,
  CO2_NATURAL_RATE,
  PM25_PURIFIER_RATE,
  PM25_NATURAL_RATE,
  SIMULATION_INTERVAL_MS,
  MQTT_QOS,
  getMqttClientId,
  TOPIC_ACTIONS,
  TOPIC_ACTUATOR_STATE,
  TOPIC_TELEMETRY,
  API_LOGIN_ENDPOINT,
  API_INSTANCES_ENDPOINT,
  API_INSTANCE_DETAILS_ENDPOINT
} from "./emulator/config";

dotenv.config({ path: path.join(__dirname, "../.env") });

// Servidor HTTP mínimo para el Health Check de Render (Web Service gratuito)
const DUMMY_PORT = getDummyPort();
http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SafeAir Emulator Alive\n");
}).listen(DUMMY_PORT, "0.0.0.0", () => {
  console.log(`[Emulator] Servidor de diagnóstico en puerto ${DUMMY_PORT}`);
});

interface DeviceState {
  isOn: boolean;
  mode: string;
  targetTemperature: number;
}

interface EmulatorState {
  temperature: number;
  humidity: number;
  co2: number;
  pm25: number;
  roomId: string | null;
  devices: {
    minisplit: DeviceState;
    purifier: DeviceState;
    extractor: DeviceState;
  };
}

const EMULATOR_ID = getEmulatorId();
const API_URL = getApiUrl();

const state: EmulatorState = {
  temperature: INITIAL_STATE.temperature,
  humidity: INITIAL_STATE.humidity,
  co2: INITIAL_STATE.co2,
  pm25: INITIAL_STATE.pm25,
  roomId: null,
  devices: {
    minisplit: { ...DEFAULT_DEVICE_STATE.minisplit },
    purifier: { ...DEFAULT_DEVICE_STATE.purifier },
    extractor: { ...DEFAULT_DEVICE_STATE.extractor }
  }
};

const reset = "\x1b[0m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const blue = "\x1b[34m";
const cyan = "\x1b[36m";
const magenta = "\x1b[35m";
const red = "\x1b[31m";
const bold = "\x1b[1m";

function logHeader(msg: string): void {
  console.log(`\n${bold}${cyan}=== ${msg} ===${reset}`);
}

// Intenta obtener el roomId via API. No bloquea si falla o si hay 2FA activo.
// Con EMULATOR_MISSING_STRATEGY=auto-provision la API asigna sala por emulatorId.
async function loginAndGetRoomId(): Promise<string | null> {
  const credentials = getDefaultCredentials();
  try {
    console.log(`${yellow}[API] Conectando a la API en ${API_URL}...${reset}`);
    const loginRes = await fetch(`${API_URL}${API_LOGIN_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });

    if (!loginRes.ok) {
      console.log(`${yellow}[API] Login falló (${loginRes.status}). Modo auto-provision.${reset}`);
      return null;
    }

    const loginData = await loginRes.json() as { accessToken?: string; requiresOtp?: boolean };

    // 2FA activo: no hay accessToken sin OTP interactivo - operar con auto-provision
    if (loginData.requiresOtp || !loginData.accessToken) {
      console.log(`${yellow}[API] 2FA requerido. Modo auto-provision: sala asignada por emulatorId="${EMULATOR_ID}".${reset}`);
      return null;
    }

    const token = loginData.accessToken;

    const instancesRes = await fetch(`${API_URL}${API_INSTANCES_ENDPOINT}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!instancesRes.ok) {
      return null;
    }

    const instances = await instancesRes.json() as Array<{ id: string }>;
    if (instances.length === 0) {
      console.log(`${yellow}[API] No hay instancias. Modo auto-provision.${reset}`);
      return null;
    }

    const instanceId = instances[0].id;
    const detailsRes = await fetch(`${API_URL}${API_INSTANCE_DETAILS_ENDPOINT(instanceId)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!detailsRes.ok) {
      return null;
    }

    const details = await detailsRes.json() as { rooms: Array<{ id: string; name: string }> };
    const roomA = details.rooms.find(r => r.name === "Room A") || details.rooms[0];
    if (roomA) {
      console.log(`${green}[API] RoomId obtenido: "${roomA.name}" → ${roomA.id}${reset}`);
      return roomA.id;
    }

    return null;
  } catch {
    console.log(`${yellow}[API] Sin conexión a la API. Modo auto-provision.${reset}`);
    return null;
  }
}

async function run(): Promise<void> {
  console.log(`${bold}${green}`);
  console.log("====================================================");
  console.log("      🚀 SAFEAIR - EMULADOR DE TELEMETRÍA MQTT     ");
  console.log("====================================================");
  console.log(reset);

  state.roomId = await loginAndGetRoomId();

  if (!state.roomId) {
    console.log(`${yellow}[Emulador] Modo auto-provision activo. La API asignará sala al recibir emulatorId="${EMULATOR_ID}".${reset}`);
  }

  const MQTT_URL = getMqttUrl();
  console.log(`${yellow}[MQTT] Conectando al broker en ${MQTT_URL}...${reset}`);
  const client = mqtt.connect(MQTT_URL, {
    clientId: getMqttClientId(),
    reconnectPeriod: MQTT_RECONNECT_PERIOD_MS
  });

  client.on("connect", () => {
    console.log(`${green}[MQTT] Conectado exitosamente!${reset}`);

    const actionsTopic = TOPIC_ACTIONS(state.roomId);

    client.subscribe(actionsTopic, { qos: MQTT_QOS }, (err) => {
      if (err) {
        console.error(`${red}[MQTT] Error suscripción: ${err}${reset}`);
      } else {
        console.log(`${cyan}[MQTT] Suscrito a: ${actionsTopic}${reset}`);
      }
    });

    DEVICE_TYPES.forEach((deviceType) => publishActuatorState(deviceType));

    startSimulationLoop(client);
  });

  client.on("message", (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      logHeader("ACCIÓN RECIBIDA");
      console.log(`${bold}Topic:${reset} ${topic}`);
      console.log(`${bold}Acción:${reset} ${magenta}${payload.action}${reset} → ${cyan}${payload.deviceType}${reset}`);
      console.log(`${bold}Unidad:${reset} ${payload.deviceIndex ?? 1}`);
      console.log(`${bold}Razón:${reset} ${payload.reason}`);

      // Capturar roomId del payload si aún no lo tenemos (auto-provision)
      if (!state.roomId && payload.roomId) {
        state.roomId = payload.roomId;
        console.log(`${green}[Emulador] RoomId asignado por auto-provision: ${state.roomId}${reset}`);
      }

      const deviceType = payload.deviceType as "minisplit" | "purifier" | "extractor";
      if (state.devices[deviceType]) {
        const action = String(payload.action).toLowerCase();

        if (action.endsWith("_on")) {
          state.devices[deviceType].isOn = true;
          if (deviceType === "minisplit") {
            state.devices[deviceType].mode = "cooling";
          }
          console.log(`${green}[Estado] ${deviceType.toUpperCase()} ENCENDIDO${reset}`);
        } else if (action.endsWith("_off")) {
          state.devices[deviceType].isOn = false;
          console.log(`${red}[Estado] ${deviceType.toUpperCase()} APAGADO${reset}`);
        }

        publishActuatorState(deviceType, normalizeDeviceIndex(payload.deviceIndex));
      }
    } catch (e) {
      console.error(`${red}Error decodificando acción: ${e}${reset}`);
    }
  });

  client.on("error", (error) => {
    console.error(`${red}[MQTT] Error: ${error}${reset}`);
  });

  client.on("close", () => {
    console.log(`${yellow}[MQTT] Conexión cerrada${reset}`);
  });

  function publishActuatorState(deviceType: "minisplit" | "purifier" | "extractor", deviceIndex = DEFAULT_DEVICE_INDEX): void {
    if (!client.connected) return;

    const topic = TOPIC_ACTUATOR_STATE(EMULATOR_ID);
    const device = state.devices[deviceType];
    const payload = {
      emulatorId: EMULATOR_ID,
      roomId: state.roomId || undefined,
      deviceType,
      deviceIndex,
      isOn: device.isOn,
      mode: device.mode,
      targetTemperature: deviceType === "minisplit" ? device.targetTemperature : undefined,
      ambientTemperature: parseFloat(state.temperature.toFixed(2)),
      ambientHumidity: parseFloat(state.humidity.toFixed(2)),
      timestamp: new Date().toISOString()
    };

    client.publish(topic, JSON.stringify(payload), { qos: MQTT_QOS }, (err) => {
      if (!err) {
        console.log(`${blue}[MQTT] Estado ${deviceType}: ${device.isOn ? green + "ON" : red + "OFF"}${reset}`);
      }
    });
  }

  function normalizeDeviceIndex(value: unknown): number {
    const parsed = Number(value ?? DEFAULT_DEVICE_INDEX);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_DEVICE_INDEX ? parsed : DEFAULT_DEVICE_INDEX;
  }

  function startSimulationLoop(mqttClient: mqtt.MqttClient): void {
    setInterval(() => {
      // Simular temperatura
      if (state.devices.minisplit.isOn) {
        const diff = state.temperature - state.devices.minisplit.targetTemperature;
        state.temperature -= diff * TEMPERATURE_COOLING_RATE + (Math.random() - 0.5) * TEMPERATURE_NOISE_AMPLITUDE;
      } else {
        state.temperature += TEMPERATURE_DRIFT_RATE + (Math.random() - 0.5) * TEMPERATURE_NOISE_AMPLITUDE;
      }
      state.temperature = Math.max(TEMPERATURE_BOUNDS.min, Math.min(TEMPERATURE_BOUNDS.max, state.temperature));

      // Simular humedad
      if (state.devices.extractor.isOn) {
        state.humidity -= HUMIDITY_EXTRACTOR_RATE + (Math.random() - 0.5) * HUMIDITY_NOISE_AMPLITUDE;
      } else {
        state.humidity += HUMIDITY_NATURAL_RATE + (Math.random() - 0.5) * HUMIDITY_NOISE_AMPLITUDE;
      }
      state.humidity = Math.max(HUMIDITY_BOUNDS.min, Math.min(HUMIDITY_BOUNDS.max, state.humidity));

      // Simular CO2
      if (state.devices.extractor.isOn) {
        state.co2 -= CO2_EXTRACTOR_RATE.min + Math.random() * (CO2_EXTRACTOR_RATE.max - CO2_EXTRACTOR_RATE.min);
      } else {
        state.co2 += CO2_NATURAL_RATE.min + Math.random() * (CO2_NATURAL_RATE.max - CO2_NATURAL_RATE.min);
      }
      state.co2 = Math.max(CO2_BOUNDS.min, Math.min(CO2_BOUNDS.max, state.co2));

      // Simular PM2.5
      if (state.devices.purifier.isOn) {
        state.pm25 -= PM25_PURIFIER_RATE + Math.random() * PM25_PURIFIER_RATE;
      } else {
        state.pm25 += PM25_NATURAL_RATE.min + Math.random() * (PM25_NATURAL_RATE.max - PM25_NATURAL_RATE.min);
      }
      state.pm25 = Math.max(PM25_BOUNDS.min, Math.min(PM25_BOUNDS.max, state.pm25));

      const telemetryTopic = TOPIC_TELEMETRY(EMULATOR_ID);
      const payload = {
        emulatorId: EMULATOR_ID,
        roomId: state.roomId || undefined,
        temperature: parseFloat(state.temperature.toFixed(2)),
        humidity: parseFloat(state.humidity.toFixed(2)),
        co2: parseFloat(state.co2.toFixed(2)),
        pm25: parseFloat(state.pm25.toFixed(2)),
        timestamp: new Date().toISOString()
      };

      mqttClient.publish(telemetryTopic, JSON.stringify(payload), { qos: MQTT_QOS }, (err) => {
        if (!err) {
          logHeader("TELEMETRÍA PUBLICADA");
          console.log(`${bold}Temperatura:${reset} ${state.temperature.toFixed(2)} °C`);
          console.log(`${bold}Humedad:${reset} ${state.humidity.toFixed(2)} %`);
          console.log(`${bold}CO2:${reset} ${state.co2.toFixed(2)} ppm`);
          console.log(`${bold}PM2.5:${reset} ${state.pm25.toFixed(2)} ug/m3`);
        }
      });
    }, SIMULATION_INTERVAL_MS);
  }
}

run().catch((err) => console.error(err));
