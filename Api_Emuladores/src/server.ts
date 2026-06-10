import { createApp } from "./app";
import { env } from "./shared/config/env";
import { logger } from "./shared/config/logger";
import { connectDatabase, closeDatabase } from "./infrastructure/database/sequelize";
import { initModelAssociations, UserModel } from "./infrastructure/database/models";
import { syncModels } from "./infrastructure/database/sync";
import { mqttGateway } from "./infrastructure/mqtt/mqtt.gateway";
import { container } from "./application/container";
import { mapTelemetryPayload } from "./infrastructure/mappers/telemetry.mapper";
import { mapActuatorStatePayload } from "./infrastructure/mappers/actuator-state.mapper";
import { ensureSeedEmulatorPool, runDatabaseSeed } from "./infrastructure/database/seeders/seed-fn";
import { logMqttReceived, logError, updateEmulatorState, addLog } from "./application/services/debug-logs.service";
import { AppError } from "./shared/errors/app-error";

const UNASSIGNED_EMULATOR_LOG_INTERVAL_MS = 30_000;
const unassignedEmulatorWarnings = new Map<string, { lastLoggedAt: number; suppressed: number }>();

function logUnassignedEmulatorTelemetry(emulatorId: string): void {
  const now = Date.now();
  const current = unassignedEmulatorWarnings.get(emulatorId) ?? { lastLoggedAt: 0, suppressed: 0 };

  if (now - current.lastLoggedAt < UNASSIGNED_EMULATOR_LOG_INTERVAL_MS) {
    unassignedEmulatorWarnings.set(emulatorId, {
      lastLoggedAt: current.lastLoggedAt,
      suppressed: current.suppressed + 1
    });
    return;
  }

  logger.warn("Telemetry ignored for unassigned emulator", {
    emulatorId,
    suppressedSinceLastLog: current.suppressed,
    reason: "EMULATOR_UNASSIGNED"
  });

  unassignedEmulatorWarnings.set(emulatorId, { lastLoggedAt: now, suppressed: 0 });
}

export async function startServer(): Promise<void> {
  try {
    // Log server startup
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "system",
      event: "server-startup",
      message: "SafeAir API starting up"
    });

    logger.info("Runtime configuration loaded", {
      configSource: env.configSource,
      nodeEnv: env.nodeEnv,
      authSkipOtp: env.authSkipOtp,
      authSkipOtpRaw: env.authSkipOtpRaw,
      smtpConfigured: Boolean(env.smtpHost),
      smtpMode: env.smtpHost ? "smtp" : "fallback",
      smtpHost: env.smtpHost ?? null,
      smtpPort: env.smtpPort,
      smtpSecure: env.smtpSecure,
      smtpFrom: env.smtpFrom,
      dbHost: env.dbHost,
      dbPort: env.dbPort,
      mqttUrl: env.mqttUrl,
      emulatorMissingStrategy: env.emulatorMissingStrategy,
      corsOrigins: env.corsOrigins
    });

    await connectDatabase();

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "postgres",
      event: "database-connected",
      message: "PostgreSQL connection established"
    });

    initModelAssociations();
    await syncModels();

    // Auto-seed si la base de datos no tiene usuarios
    const userCount = await UserModel.count();
    if (userCount === 0) {
      logger.info("Database is empty. Running automatic seed...");
      await runDatabaseSeed();
      logger.info("Automatic seed completed successfully");

      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        source: "postgres",
        event: "database-seeded",
        message: "Database initial seed completed"
      });
    }
    await ensureSeedEmulatorPool();

    mqttGateway.onTelemetry(async (message) => {
      try {
        // Log MQTT message received
        logMqttReceived(message.topic, message.payload, message.emulatorId);

        const payload = mapTelemetryPayload({ ...message.payload, emulatorId: message.emulatorId });
        const resolvedTelemetry = await container.telemetryIngestionService.handleIncomingTelemetry(payload, "mqtt");

        // Update emulator state for dashboard
        const roomId = resolvedTelemetry.roomId;
        const metrics = {
          temperature: payload.temperature,
          humidity: payload.humidity,
          co2: payload.co2,
          pm25: payload.pm25,
        };
        
        // Extract device states from the telemetry payload (Java sends "devices" not "deviceStates")
        const devicesMap = (payload as unknown as Record<string, unknown>).devices as Record<string, unknown> | undefined;
        let deviceUpdate: Record<string, { deviceIndex: number; isOn: boolean | null; targetTemperature?: number | null }> | undefined;
        
        if (devicesMap) {
          deviceUpdate = {};
          // Java sends device types as keys: MiniSplit, HumidifierPurifier, AirExtractor
          // Java deviceState objects have: isOn (boolean), attributes (Map<String, Integer>)
          for (const [deviceType, deviceState] of Object.entries(devicesMap)) {
            const ds = deviceState as { on?: boolean; isOn?: boolean; deviceIndex?: number; index?: number; attributes?: Record<string, number> };
            const isOn = ds.on ?? ds.isOn ?? null;
            const targetTemp = ds.attributes?.['state'] ?? null;
            const deviceIndex = normalizeDeviceIndex(ds.deviceIndex ?? ds.index ?? 1);
            
            // Map Java device type names to our internal names
            let internalType = deviceType;
            if (deviceType === 'MiniSplit') internalType = 'minisplit';
            else if (deviceType === 'HumidifierPurifier') internalType = 'purifier';
            else if (deviceType === 'AirExtractor') internalType = 'extractor';
            
            deviceUpdate[internalType] = {
              deviceIndex,
              isOn: isOn === null ? null : Boolean(isOn),
              targetTemperature: internalType === 'minisplit' && targetTemp !== null ? Number(targetTemp) : null
            };
          }
        }
        
        updateEmulatorState(message.emulatorId, roomId, metrics, deviceUpdate);

        if (roomId && deviceUpdate) {
          for (const [deviceType, state] of Object.entries(deviceUpdate)) {
            if (state.isOn === null) {
              continue;
            }

            const mappedState = mapActuatorStatePayload({
              emulatorId: message.emulatorId,
              roomId,
              deviceType,
              deviceIndex: state.deviceIndex,
              isOn: state.isOn,
              targetTemperature: state.targetTemperature ?? undefined,
              ambientTemperature: metrics.temperature,
              ambientHumidity: metrics.humidity,
              timestamp: payload.timestamp
            });

            await container.actuatorStateIngestionService.handleIncomingState(
              mappedState,
              "mqtt"
            );
          }
        }

        logMqttReceived(message.topic, { processed: true, emulatorId: message.emulatorId }, message.emulatorId);

        const embeddedStates = Array.isArray((message.payload as unknown as Record<string, unknown>).deviceStates)
          ? ((message.payload as unknown as Record<string, unknown>).deviceStates as Array<Record<string, unknown>>)
          : [];

        for (const state of embeddedStates) {
          const mappedState = mapActuatorStatePayload({
            emulatorId: String(state.emulatorId ?? message.emulatorId),
            deviceType: state.deviceType,
            deviceIndex: normalizeDeviceIndex(state.deviceIndex ?? state.index ?? 1),
            isOn: Boolean(state.isOn),
            targetTemperature: state.targetTemperature !== undefined ? Number(state.targetTemperature) : undefined,
            ambientTemperature: state.ambientTemperature !== undefined ? Number(state.ambientTemperature) : undefined,
            ambientHumidity: state.ambientHumidity !== undefined ? Number(state.ambientHumidity) : undefined,
            timestamp: state.timestamp ? String(state.timestamp) : undefined
          });

          await container.actuatorStateIngestionService.handleIncomingState(
            mappedState,
            "mqtt"
          );
        }
      } catch (error: unknown) {
        if (error instanceof AppError && error.code === "EMULATOR_UNASSIGNED") {
          logUnassignedEmulatorTelemetry(message.emulatorId);
          return;
        }

        logger.error("Telemetry ingestion from MQTT failed", error);
      }
    });

    mqttGateway.onActuatorState(async (message) => {
      try {
        // Log MQTT actuator state received
        logMqttReceived(message.topic, message.payload, message.emulatorId);

        if (
          (message.payload as Record<string, unknown>).isOn === undefined &&
          (message.payload as Record<string, unknown>).action !== undefined
        ) {
          return;
        }

        const payload = mapActuatorStatePayload({ ...message.payload, emulatorId: message.emulatorId });
        const resolvedState = await container.actuatorStateIngestionService.handleIncomingState(payload, "mqtt");

        // Update emulator state for dashboard
        updateEmulatorState(
          message.emulatorId,
          resolvedState.roomId,
          {},
          {
            [payload.deviceType]: {
              deviceIndex: payload.deviceIndex ?? 1,
              isOn: payload.isOn,
              targetTemperature: payload.targetTemperature,
            }
          }
        );
      } catch (error: unknown) {
        if (error instanceof AppError && error.code === "EMULATOR_UNASSIGNED") {
          logUnassignedEmulatorTelemetry(message.emulatorId);
          return;
        }

        logger.error("Actuator state ingestion from MQTT failed", error);
        logError("mqtt", "actuator-state-failed", error);
      }
    });

    await mqttGateway.connect();

    const app = createApp();

    // Bind to API_HOST/BACKEND_BIND_HOST (default: 0.0.0.0 for all interfaces)
    // This allows connections from other devices in multi-device setup
    // BACKEND_BIND_HOST is kept for compatibility with older local env files.
    const bindHost = process.env.BACKEND_BIND_HOST || env.apiHost;
    const port = env.port;

    const server = app.listen(port, bindHost, () => {
      logger.info(`SafeAir API listening on ${bindHost}:${port}`);
      logger.info(`API accessible at http://localhost:${port} (or http://<network-ip>:${port} from other devices)`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal} signal, initiating graceful shutdown...`);
      
      server.close(async () => {
        logger.info("HTTP server closed");
        
        try {
          // Close MQTT connections
          await mqttGateway.disconnect();
          logger.info("MQTT gateway disconnected");
          
          // Close database connection pool
          await closeDatabase();
          
          logger.info("Graceful shutdown completed successfully");
          process.exit(0);
        } catch (error) {
          logger.error("Error during graceful shutdown", error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.warn("Graceful shutdown timeout, forcing exit");
        process.exit(1);
      }, 30000);
    };

    // Register shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: unknown) {
    logger.error("Fatal startup error", error);
    process.exit(1);
  }
}

function normalizeDeviceIndex(value: unknown): number {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 1;
}
