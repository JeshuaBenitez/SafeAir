import mqtt from "mqtt";
import dotenv from "dotenv";
import path from "path";

// Cargar variables de entorno desde .env
dotenv.config({ path: path.join(__dirname, "../.env") });

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const API_URL = process.env.BACKEND_API_URL || "http://localhost:3000";
const EMULATOR_ID = "emu-room-a";

// Estado interno simulado del cuarto/emulador
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

// Colores de consola ansi
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

async function loginAndGetRoomId(): Promise<string | null> {
  try {
    console.log(`${yellow}[API] Conectando a la API en ${API_URL}...${reset}`);
    const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@safeair.local", password: "admin123" })
    });

    if (!loginRes.ok) {
      console.log(`${red}[API] Fallo en la autenticación. Usando modo de aprovisionamiento automático.${reset}`);
      return null;
    }

    const loginData = await loginRes.json() as { accessToken: string };
    const token = loginData.accessToken;

    const instancesRes = await fetch(`${API_URL}/api/v1/instances`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!instancesRes.ok) {
      return null;
    }

    const instances = await instancesRes.json() as Array<{ id: string }>;
    if (instances.length === 0) {
      console.log(`${yellow}[API] No se encontraron instancias de SafeAir en la base de datos.${reset}`);
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
      console.log(`${green}[API] Mapeado exitosamente a la sala "${roomA.name}" con ID: ${roomA.id}${reset}`);
      return roomA.id;
    }

    return null;
  } catch (error) {
    console.log(`${red}[API] No se pudo conectar a la API (${API_URL}). El emulador operará con autoregistro en MQTT.${reset}`);
    return null;
  }
}

async function run(): Promise<void> {
  console.clear();
  console.log(`${bold}${green}`);
  console.log("====================================================");
  console.log("      🚀 SAFEAIR - EMULADOR DE TELEMETRÍA MQTT     ");
  console.log("====================================================");
  console.log(reset);

  state.roomId = await loginAndGetRoomId();

  console.log(`${yellow}[MQTT] Conectando al broker en ${MQTT_URL}...${reset}`);
  const client = mqtt.connect(MQTT_URL, {
    clientId: `emulator-${EMULATOR_ID}`,
    reconnectPeriod: 3000
  });

  client.on("connect", () => {
    console.log(`${green}[MQTT] Conectado exitosamente!${reset}`);

    // Si tenemos el roomId, nos suscribimos a las acciones específicas de la sala
    if (state.roomId) {
      const actionsTopic = `safeair/${state.roomId}/actions`;
      client.subscribe(actionsTopic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`${red}[MQTT] Error al suscribirse a las acciones: ${err}${reset}`);
        } else {
          console.log(`${cyan}[MQTT] Suscrito a topic de acciones: ${actionsTopic}${reset}`);
        }
      });
    } else {
      // Si no tenemos roomId, nos suscribimos usando comodín para detectar nuestro roomId cuando llegue un comando
      const wildcardActions = "safeair/+/actions";
      client.subscribe(wildcardActions, { qos: 1 }, (err) => {
        if (err) {
          console.error(`${red}[MQTT] Error al suscribirse a acciones comodín: ${err}${reset}`);
        } else {
          console.log(`${cyan}[MQTT] Suscrito a topic de acciones comodín: ${wildcardActions}${reset}`);
        }
      });
    }

    // Publicar estado inicial de los actuadores
    publishActuatorState("minisplit");
    publishActuatorState("purifier");
    publishActuatorState("extractor");

    // Iniciar bucle de simulación y publicación
    startSimulationLoop(client);
  });

  client.on("message", (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      logHeader("MENSAJE RECIBIDO (ACCIÓN DE ACTUADOR)");
      console.log(`${bold}Topic:${reset} ${topic}`);
      console.log(`${bold}Acción:${reset} ${magenta}${payload.action}${reset} para el dispositivo ${cyan}${payload.deviceType}${reset}`);
      console.log(`${bold}Razón:${reset} ${payload.reason}`);

      // Actualizar el roomId si lo descubrimos a partir de la acción
      if (!state.roomId && payload.roomId) {
        state.roomId = payload.roomId;
        console.log(`${green}[Emulador] RoomId actualizado automáticamente a: ${state.roomId}${reset}`);
      }

      const deviceType = payload.deviceType as "minisplit" | "purifier" | "extractor";
      if (state.devices[deviceType]) {
        const action = String(payload.action).toLowerCase();
        
        if (action.endsWith("_on")) {
          state.devices[deviceType].isOn = true;
          if (deviceType === "minisplit") {
            state.devices[deviceType].mode = "cooling";
          }
          console.log(`${green}[Estado] ${deviceType.toUpperCase()} encendido exitosamente!${reset}`);
        } else if (action.endsWith("_off")) {
          state.devices[deviceType].isOn = false;
          console.log(`${red}[Estado] ${deviceType.toUpperCase()} apagado exitosamente!${reset}`);
        }

        // Publicar de inmediato el nuevo estado del actuador
        publishActuatorState(deviceType);
      }
    } catch (e) {
      console.error(`${red}Error al decodificar la acción recibida: ${e}${reset}`);
    }
  });

  client.on("error", (error) => {
    console.error(`${red}[MQTT] Error de conexión: ${error}${reset}`);
  });

  client.on("close", () => {
    console.log(`${yellow}[MQTT] Conexión cerrada con el broker${reset}`);
  });

  function publishActuatorState(deviceType: "minisplit" | "purifier" | "extractor"): void {
    if (!client.connected) return;

    const topic = `safeair/${EMULATOR_ID}/actuator-state`;
    const device = state.devices[deviceType];
    const payload = {
      emulatorId: EMULATOR_ID,
      roomId: state.roomId || undefined,
      deviceType,
      isOn: device.isOn,
      mode: device.mode,
      targetTemperature: deviceType === "minisplit" ? device.targetTemperature : undefined,
      ambientTemperature: parseFloat(state.temperature.toFixed(2)),
      ambientHumidity: parseFloat(state.humidity.toFixed(2)),
      timestamp: new Date().toISOString()
    };

    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        console.error(`${red}Error al publicar estado de actuador ${deviceType}: ${err}${reset}`);
      } else {
        console.log(`${blue}[MQTT] Estado publicado de ${deviceType}: ${device.isOn ? green + "ON" : red + "OFF"}${reset}`);
      }
    });
  }

  function startSimulationLoop(mqttClient: mqtt.MqttClient): void {
    setInterval(() => {
      // 1. Simular Dinámica Física basada en el estado de los actuadores
      
      // Simular temperatura
      if (state.devices.minisplit.isOn) {
        // Enfría el ambiente hacia la temperatura objetivo
        const diff = state.temperature - state.devices.minisplit.targetTemperature;
        state.temperature -= diff * 0.05 + (Math.random() - 0.5) * 0.05;
      } else {
        // Calentamiento natural lento
        state.temperature += 0.02 + (Math.random() - 0.5) * 0.03;
      }

      // Mantener temperatura en rangos realistas
      state.temperature = Math.max(16, Math.min(35, state.temperature));

      // Simular humedad
      if (state.devices.extractor.isOn) {
        state.humidity -= 0.3 + (Math.random() - 0.5) * 0.1;
      } else {
        state.humidity += 0.1 + (Math.random() - 0.5) * 0.15;
      }
      state.humidity = Math.max(30, Math.min(90, state.humidity));

      // Simular CO2 (ppm)
      if (state.devices.extractor.isOn) {
        state.co2 -= 15 + Math.random() * 10;
      } else {
        // La gente respira e incrementa el CO2
        state.co2 += 5 + Math.random() * 8;
      }
      state.co2 = Math.max(400, Math.min(2500, state.co2));

      // Simular PM2.5 (ug/m3)
      if (state.devices.purifier.isOn) {
        state.pm25 -= 0.5 + Math.random() * 0.5;
      } else {
        state.pm25 += 0.1 + Math.random() * 0.2;
      }
      state.pm25 = Math.max(5, Math.min(120, state.pm25));

      // 2. Publicar Telemetría
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
        if (err) {
          console.error(`${red}Error al publicar telemetría: ${err}${reset}`);
        } else {
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
