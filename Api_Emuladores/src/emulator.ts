import mqtt from "mqtt";
import dotenv from "dotenv";
import path from "path";
import http from "http";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const API_URL = process.env.BACKEND_API_URL || "http://localhost:3000";
const EMULATOR_ID = "emu-room-a";

// Servidor HTTP mínimo para el Health Check de Render (Web Service gratuito)
const DUMMY_PORT = process.env.PORT || 10000;
http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SafeAir Emulator Alive\n");
}).listen(Number(DUMMY_PORT), "0.0.0.0", () => {
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

const state: EmulatorState = {
  temperature: 24.2,
  humidity: 50.0,
  co2: 650.0,
  pm25: 18.0,
  roomId: null,
  devices: {
    minisplit: { isOn: false, mode: "cooling", targetTemperature: 22.0 },
    purifier: { isOn: false, mode: "auto", targetTemperature: 0 },
    extractor: { isOn: false, mode: "exhaust", targetTemperature: 0 }
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
  try {
    console.log(`${yellow}[API] Conectando a la API en ${API_URL}...${reset}`);
    const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@safeair.local", password: "admin123" })
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

    const instancesRes = await fetch(`${API_URL}/api/v1/instances`, {
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
    const detailsRes = await fetch(`${API_URL}/api/v1/instances/${instanceId}`, {
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

  console.log(`${yellow}[MQTT] Conectando al broker en ${MQTT_URL}...${reset}`);
  const client = mqtt.connect(MQTT_URL, {
    clientId: `emulator-${EMULATOR_ID}`,
    reconnectPeriod: 3000
  });

  client.on("connect", () => {
    console.log(`${green}[MQTT] Conectado exitosamente!${reset}`);

    const actionsTopic = state.roomId
      ? `safeair/${state.roomId}/actions`
      : "safeair/+/actions";

    client.subscribe(actionsTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`${red}[MQTT] Error suscripción: ${err}${reset}`);
      } else {
        console.log(`${cyan}[MQTT] Suscrito a: ${actionsTopic}${reset}`);
      }
    });

    publishActuatorState("minisplit");
    publishActuatorState("purifier");
    publishActuatorState("extractor");

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

  function publishActuatorState(deviceType: "minisplit" | "purifier" | "extractor", deviceIndex = 1): void {
    if (!client.connected) return;

    const topic = `safeair/${EMULATOR_ID}/actuator-state`;
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

    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (!err) {
        console.log(`${blue}[MQTT] Estado ${deviceType}: ${device.isOn ? green + "ON" : red + "OFF"}${reset}`);
      }
    });
  }

  function normalizeDeviceIndex(value: unknown): number {
    const parsed = Number(value ?? 1);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 1;
  }

  function startSimulationLoop(mqttClient: mqtt.MqttClient): void {
    setInterval(() => {
      // Simular temperatura
      if (state.devices.minisplit.isOn) {
        const diff = state.temperature - state.devices.minisplit.targetTemperature;
        state.temperature -= diff * 0.05 + (Math.random() - 0.5) * 0.05;
      } else {
        state.temperature += 0.02 + (Math.random() - 0.5) * 0.03;
      }
      state.temperature = Math.max(16, Math.min(35, state.temperature));

      // Simular humedad
      if (state.devices.extractor.isOn) {
        state.humidity -= 0.3 + (Math.random() - 0.5) * 0.1;
      } else {
        state.humidity += 0.1 + (Math.random() - 0.5) * 0.15;
      }
      state.humidity = Math.max(30, Math.min(90, state.humidity));

      // Simular CO2
      if (state.devices.extractor.isOn) {
        state.co2 -= 15 + Math.random() * 10;
      } else {
        state.co2 += 5 + Math.random() * 8;
      }
      state.co2 = Math.max(400, Math.min(2500, state.co2));

      // Simular PM2.5
      if (state.devices.purifier.isOn) {
        state.pm25 -= 0.5 + Math.random() * 0.5;
      } else {
        state.pm25 += 0.1 + Math.random() * 0.2;
      }
      state.pm25 = Math.max(5, Math.min(120, state.pm25));

      const telemetryTopic = `safeair/${EMULATOR_ID}/telemetry`;
      const payload = {
        emulatorId: EMULATOR_ID,
        roomId: state.roomId || undefined,
        temperature: parseFloat(state.temperature.toFixed(2)),
        humidity: parseFloat(state.humidity.toFixed(2)),
        co2: parseFloat(state.co2.toFixed(2)),
        pm25: parseFloat(state.pm25.toFixed(2)),
        timestamp: new Date().toISOString()
      };

      mqttClient.publish(telemetryTopic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (!err) {
          logHeader("TELEMETRÍA PUBLICADA");
          console.log(`${bold}Temperatura:${reset} ${state.temperature.toFixed(2)} °C`);
          console.log(`${bold}Humedad:${reset} ${state.humidity.toFixed(2)} %`);
          console.log(`${bold}CO2:${reset} ${state.co2.toFixed(2)} ppm`);
          console.log(`${bold}PM2.5:${reset} ${state.pm25.toFixed(2)} ug/m3`);
        }
      });
    }, 5000);
  }
}

run().catch((err) => console.error(err));
