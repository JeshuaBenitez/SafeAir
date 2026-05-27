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
import { runDatabaseSeed } from "./infrastructure/database/seeders/seed-fn";

export async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    initModelAssociations();
    await syncModels();

    // Auto-seed si la base de datos no tiene usuarios
    const userCount = await UserModel.count();
    if (userCount === 0) {
      logger.info("Database is empty. Running automatic seed...");
      await runDatabaseSeed();
      logger.info("Automatic seed completed successfully");
    }

    mqttGateway.onTelemetry(async (message) => {
      try {
        const payload = mapTelemetryPayload({ ...message.payload, emulatorId: message.emulatorId });
        await container.telemetryIngestionService.handleIncomingTelemetry(payload, "mqtt");

        const embeddedStates = Array.isArray((message.payload as Record<string, unknown>).deviceStates)
          ? ((message.payload as Record<string, unknown>).deviceStates as Array<Record<string, unknown>>)
          : [];

        for (const state of embeddedStates) {
          const mappedState = mapActuatorStatePayload({
            emulatorId: String(state.emulatorId ?? message.emulatorId),
            deviceType: state.deviceType,
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
        logger.error("Telemetry ingestion from MQTT failed", error);
      }
    });

    mqttGateway.onActuatorState(async (message) => {
      try {
        const payload = mapActuatorStatePayload({ ...message.payload, emulatorId: message.emulatorId });
        await container.actuatorStateIngestionService.handleIncomingState(payload, "mqtt");
      } catch (error: unknown) {
        logger.error("Actuator state ingestion from MQTT failed", error);
      }
    });

    await mqttGateway.connect();

    const app = createApp();

    // Bind to BACKEND_BIND_HOST (default: 0.0.0.0 for all interfaces)
    // This allows connections from other devices in multi-device setup
    // Can be overridden via BACKEND_BIND_HOST environment variable
    const bindHost = process.env.BACKEND_BIND_HOST || '0.0.0.0';
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
