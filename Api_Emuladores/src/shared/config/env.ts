import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const dotenvResult = dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const dotenvLoadedKeys = Object.keys(dotenvResult.parsed ?? {}).length;

function normalizeBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value.trim().toLowerCase() === "true";
}

function optionalNonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SKIP_OTP: z.string().default("false"),  // Skip OTP verification in demo mode
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default("/api/v1"),
  API_HOST: z.string().default("0.0.0.0"),  // Host para bind (0.0.0.0 = todas las interfaces)
  TELEMETRY_API_KEY: z.string().min(8).default("dev-telemetry-key"),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("24h"),
  CORS_ORIGINS: z.string().default("http://localhost:4200,http://localhost:8080,http://127.0.0.1:8080"),  // Orígenes permitidos para CORS (separados por coma)
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
  EMULATOR_AUTO_CREATE_DEVICES: z.string().default("true"),
  // SMTP Configuration (optional - uses Ethereal test account when not set)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"SafeAir Security" <security@safeair.io>')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = {
  configSource: dotenvLoadedKeys > 0 ? ".env + process.env" : "process.env",
  nodeEnv: parsed.data.NODE_ENV,
  authSkipOtp: normalizeBoolean(parsed.data.AUTH_SKIP_OTP),
  authSkipOtpRaw: parsed.data.AUTH_SKIP_OTP,
  port: parsed.data.PORT,
  apiPrefix: parsed.data.API_PREFIX,
  apiHost: parsed.data.API_HOST,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map(o => o.trim()),
  telemetryApiKey: parsed.data.TELEMETRY_API_KEY,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  dbHost: parsed.data.DB_HOST,
  dbPort: parsed.data.DB_PORT,
  dbName: parsed.data.DB_NAME,
  dbUser: parsed.data.DB_USER,
  dbPassword: parsed.data.DB_PASSWORD,
  dbLogging: normalizeBoolean(parsed.data.DB_LOGGING),
  dbSyncOnStartup: normalizeBoolean(parsed.data.DB_SYNC_ON_STARTUP),
  dbSsl: normalizeBoolean(parsed.data.DB_SSL),
  dbSslRejectUnauthorized: normalizeBoolean(parsed.data.DB_SSL_REJECT_UNAUTHORIZED),
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
  emulatorAutoCreateDevices: normalizeBoolean(parsed.data.EMULATOR_AUTO_CREATE_DEVICES, true),
  smtpHost: optionalNonEmpty(parsed.data.SMTP_HOST),
  smtpPort: parsed.data.SMTP_PORT,
  smtpSecure: normalizeBoolean(parsed.data.SMTP_SECURE),
  smtpUser: optionalNonEmpty(parsed.data.SMTP_USER),
  smtpPass: optionalNonEmpty(parsed.data.SMTP_PASS),
  smtpFrom: parsed.data.SMTP_FROM
};
