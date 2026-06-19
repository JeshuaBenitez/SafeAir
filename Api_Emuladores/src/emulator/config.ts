/**
 * Emulator Configuration
 * All hardcoded values for the emulator are centralized here.
 * Override via environment variables.
 */

import dotenv from "dotenv";
import path from "path";

// Load .env file if present
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// === Network Configuration ===
export const getMqttUrl = (): string => process.env.MQTT_URL || "mqtt://localhost:1883";
export const getApiUrl = (): string => process.env.BACKEND_API_URL || "http://localhost:3000";
export const getDummyPort = (): number => Number(process.env.PORT) || 10000;

// === Emulator Identity ===
export const getEmulatorId = (): string => process.env.EMULATOR_ID || "emu-room-a";

// === Simulation Parameters ===
export const SIMULATION_INTERVAL_MS = 5000;
export const MQTT_RECONNECT_PERIOD_MS = 3000;

// === MQTT Configuration ===
export const MQTT_QOS = 1;
export const getMqttClientId = (): string => `emulator-${getEmulatorId()}`;

// === Simulation Bounds ===
export const TEMPERATURE_BOUNDS = { min: 16, max: 35 };
export const HUMIDITY_BOUNDS = { min: 30, max: 90 };
export const CO2_BOUNDS = { min: 400, max: 2500 };
export const PM25_BOUNDS = { min: 5, max: 120 };

// === Simulation Rates ===
export const TEMPERATURE_COOLING_RATE = 0.05;
export const TEMPERATURE_DRIFT_RATE = 0.02;
export const TEMPERATURE_NOISE_AMPLITUDE = 0.03;

export const HUMIDITY_EXTRACTOR_RATE = 0.3;
export const HUMIDITY_NATURAL_RATE = 0.1;
export const HUMIDITY_NOISE_AMPLITUDE = 0.15;

export const CO2_EXTRACTOR_RATE = { min: 15, max: 25 };
export const CO2_NATURAL_RATE = { min: 5, max: 13 };

export const PM25_PURIFIER_RATE = 0.5;
export const PM25_NATURAL_RATE = { min: 0.1, max: 0.3 };

// === MQTT Topics ===
export const TOPIC_ACTIONS = (roomId: string | null) => roomId ? `safeair/${roomId}/actions` : "safeair/+/actions";
export const TOPIC_ACTUATOR_STATE = (emulatorId: string) => `safeair/${emulatorId}/actuator-state`;
export const TOPIC_TELEMETRY = (emulatorId: string) => `safeair/${emulatorId}/telemetry`;

// === API Endpoints ===
export const API_LOGIN_ENDPOINT = "/api/v1/auth/login";
export const API_INSTANCES_ENDPOINT = "/api/v1/instances";
export const API_INSTANCE_DETAILS_ENDPOINT = (instanceId: string) => `/api/v1/instances/${instanceId}`;

// === Device Defaults ===
export const DEFAULT_DEVICE_STATE = {
  minisplit: { isOn: false, mode: "cooling", targetTemperature: 22.0 },
  purifier: { isOn: false, mode: "auto", targetTemperature: 0 },
  extractor: { isOn: false, mode: "exhaust", targetTemperature: 0 }
};

// === Initial State ===
export const INITIAL_STATE = {
  temperature: 24.2,
  humidity: 50.0,
  co2: 650.0,
  pm25: 18.0
};

// === Credentials ===
export const getDefaultCredentials = () => ({
  email: process.env.EMULATOR_EMAIL || "admin@safeair.local",
  password: process.env.EMULATOR_PASSWORD || "admin123"
});

// === Device Configuration ===
export type DeviceType = "minisplit" | "purifier" | "extractor";
export const DEVICE_TYPES: DeviceType[] = ["minisplit", "purifier", "extractor"];
export const DEFAULT_DEVICE_INDEX = 1;
export const MAX_DEVICE_INDEX = 3;
