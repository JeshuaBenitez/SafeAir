/**
 * CLI Configuration Constants
 * All hardcoded values for the safeairctl CLI are centralized here.
 * Override via environment variables or CLI options.
 */

import dotenv from "dotenv";
import path from "path";
import os from "os";
import fs from "fs";

// Load .env file if present
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// === API Configuration ===
export const CLI_CONFIG_PATH = path.join(os.homedir(), ".safeairctl.json");
export const DEFAULT_API_PORT = 3000;
export const DEFAULT_API_PROTOCOL = "http";

export const getDefaultApiUrl = (): string => {
  const envUrl = process.env.SAFEAIR_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // Try to read from saved config
  try {
    const config = JSON.parse(fs.readFileSync(CLI_CONFIG_PATH, "utf8"));
    if (config.apiUrl) return config.apiUrl.replace(/\/$/, "");
  } catch {
    // Config file doesn't exist, use defaults
  }

  return `${DEFAULT_API_PROTOCOL}://localhost:${DEFAULT_API_PORT}`;
};

// === MQTT Configuration ===
export const DEFAULT_MQTT_PORT = 1883;
export const DEFAULT_MQTT_PROTOCOL = "mqtt";

export const getDefaultMqttUrl = (): string => {
  const envUrl = process.env.SAFEAIR_MQTT_URL;
  if (envUrl) return envUrl;

  return `${DEFAULT_MQTT_PROTOCOL}://localhost:${DEFAULT_MQTT_PORT}`;
};

// === Polling Configuration ===
export const DEFAULT_LOG_INTERVAL_MS = 3000;
export const DEFAULT_LOG_LIMIT = "20";

// === Topic Patterns ===
export const MQTT_TOPIC_SCENARIO = "safeair/{emulatorId}/scenario";
export const MQTT_TOPIC_COMMANDS = "safeair/{emulatorId}/commands";

export const formatMqttTopic = (pattern: string, replacements: Record<string, string>): string => {
  let topic = pattern;
  for (const [key, value] of Object.entries(replacements)) {
    topic = topic.replace(`{${key}}`, value);
  }
  return topic;
};

// === API Endpoints ===
export const API_VERSION = "v1";
export const getApiPrefix = (): string => `/api/${API_VERSION}`;
