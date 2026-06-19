/**
 * MQTT Configuration for the API Gateway
 * All MQTT-related hardcoded values are centralized here.
 */

import dotenv from "dotenv";
import path from "path";

// Load .env file if present
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// === Connection Configuration ===
export const MQTT_RECONNECT_PERIOD_MS = 3000;
export const MQTT_CONNECT_TIMEOUT_MS = 30000;
export const MQTT_KEEPALIVE = 60;

// === Default Topics ===
export const getDefaultTelemetryTopic = (): string => process.env.MQTT_TELEMETRY_TOPIC || "safeair/+/telemetry";
export const getDefaultActuatorStateTopic = (): string => process.env.MQTT_ACTUATOR_STATE_TOPIC || "safeair/+/actuator-state";

// === Quality of Service ===
export const MQTT_DEFAULT_QOS: 0 | 1 | 2 = 1;

// === Client Configuration ===
export const getDefaultMqttClientId = (): string => process.env.MQTT_CLIENT_ID || "safeair-api";

// === Broker URL ===
export const getDefaultMqttUrl = (): string => process.env.MQTT_URL || "mqtt://localhost:1883";
