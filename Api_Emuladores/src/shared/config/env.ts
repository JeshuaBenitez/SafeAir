import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default("/api/v1"),
  TELEMETRY_API_KEY: z.string().min(8).default("dev-telemetry-key"),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("24h"),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_LOGGING: z.string().default("false"),
  DB_SYNC_ON_STARTUP: z.string().default("false"),
  DB_SSL: z.string().default("false"),
  DB_SSL_REJECT_UNAUTHORIZED: z.string().default("false"),
  MQTT_URL: z.string(),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CLIENT_ID: z.string().default("safeair-api"),
  MQTT_TELEMETRY_TOPIC: z.string().default("safeair/+/telemetry"),
  MQTT_ACTUATOR_STATE_TOPIC: z.string().default("safeair/+/actuator-state"),
  MQTT_QOS: z.coerce.number().min(0).max(2).default(1),
  EMULATOR_MISSING_STRATEGY: z.enum(["reject", "auto-provision"]).default("reject"),
  EMULATOR_AUTO_INSTANCE_NAME: z.string().default("Auto Provisioned Instance"),
  EMULATOR_AUTO_ROOM_PREFIX: z.string().default("Room"),
  EMULATOR_AUTO_CREATE_DEVICES: z.string().default("true")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === "production",
  port: parsed.data.PORT,
  apiPrefix: parsed.data.API_PREFIX,
  telemetryApiKey: parsed.data.TELEMETRY_API_KEY,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  dbHost: parsed.data.DB_HOST,
  dbPort: parsed.data.DB_PORT,
  dbName: parsed.data.DB_NAME,
  dbUser: parsed.data.DB_USER,
  dbPassword: parsed.data.DB_PASSWORD,
  dbLogging: parsed.data.DB_LOGGING === "true",
  dbSyncOnStartup: parsed.data.DB_SYNC_ON_STARTUP === "true",
  dbSsl: parsed.data.DB_SSL === "true",
  dbSslRejectUnauthorized: parsed.data.DB_SSL_REJECT_UNAUTHORIZED === "true",
  mqttUrl: parsed.data.MQTT_URL,
  mqttUsername: parsed.data.MQTT_USERNAME,
  mqttPassword: parsed.data.MQTT_PASSWORD,
  mqttClientId: parsed.data.MQTT_CLIENT_ID,
  mqttTelemetryTopic: parsed.data.MQTT_TELEMETRY_TOPIC,
  mqttActuatorStateTopic: parsed.data.MQTT_ACTUATOR_STATE_TOPIC,
  mqttQos: parsed.data.MQTT_QOS,
  emulatorMissingStrategy: parsed.data.EMULATOR_MISSING_STRATEGY,
  emulatorAutoInstanceName: parsed.data.EMULATOR_AUTO_INSTANCE_NAME,
  emulatorAutoRoomPrefix: parsed.data.EMULATOR_AUTO_ROOM_PREFIX,
  emulatorAutoCreateDevices: parsed.data.EMULATOR_AUTO_CREATE_DEVICES === "true"
};
