import mqtt, { type MqttClient } from "mqtt";
import { env } from "../../shared/config/env";
import { logger } from "../../shared/config/logger";
import { decodeMqttPayload } from "./payload-codec";

type TelemetryMessage = {
  topic: string;
  emulatorId: string;
  payload: Record<string, unknown>;
};

type ActuatorStateMessage = {
  topic: string;
  emulatorId: string;
  payload: Record<string, unknown>;
};

type TelemetryHandler = (message: TelemetryMessage) => Promise<void>;
type ActuatorStateHandler = (message: ActuatorStateMessage) => Promise<void>;

class MqttGateway {
  private client: MqttClient | null = null;
  private connectPromise: Promise<void> | null = null;
  private telemetryHandler: TelemetryHandler | null = null;
  private actuatorStateHandler: ActuatorStateHandler | null = null;
  private connectCount = 0;

  async connect(): Promise<void> {
    if (this.client?.connected) {
      logger.info("MQTT connect skipped: client already connected", {
        clientId: env.mqttClientId,
        connected: this.client.connected
      });
      return;
    }

    if (!this.client) {
      logger.info("Creating MQTT client", {
        clientId: env.mqttClientId,
        url: env.mqttUrl,
        reconnectPeriodMs: 3000,
        telemetryTopic: env.mqttTelemetryTopic,
        actuatorStateTopic: env.mqttActuatorStateTopic
      });

      this.client = mqtt.connect(env.mqttUrl, {
        username: env.mqttUsername,
        password: env.mqttPassword,
        clientId: env.mqttClientId,
        reconnectPeriod: 3000
      });

      this.registerClientListeners(this.client);
    }

    if (this.connectPromise) {
      logger.info("MQTT connect already in progress", {
        clientId: env.mqttClientId
      });
      await this.connectPromise;
      return;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const client = this.client;

      if (!client) {
        reject(new Error("MQTT client was not initialized"));
        return;
      }

      if (client.connected) {
        resolve();
        return;
      }

      const handleConnect = (): void => {
        cleanup();
        resolve();
      };

      const handleError = (error: unknown): void => {
        cleanup();
        reject(error instanceof Error ? error : new Error("MQTT connection failed"));
      };

      const cleanup = (): void => {
        client.off("connect", handleConnect);
        client.off("error", handleError);
      };

      client.on("connect", handleConnect);
      client.on("error", handleError);
    }).finally(() => {
      this.connectPromise = null;
    });

    await this.connectPromise;
  }

  onTelemetry(handler: TelemetryHandler): void {
    // MQTT gateway only transports messages and delegates business logic externally.
    this.telemetryHandler = handler;
  }

  onActuatorState(handler: ActuatorStateHandler): void {
    this.actuatorStateHandler = handler;
  }

  publish(topic: string, payload: unknown): Promise<void> {
    if (!this.client) {
      return Promise.reject(new Error("MQTT is not connected"));
    }

    return new Promise((resolve, reject) => {
      this.client?.publish(topic, JSON.stringify(payload), { qos: env.mqttQos as 0 | 1 | 2 }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private registerClientListeners(client: MqttClient): void {
    client.on("connect", () => {
      this.connectCount += 1;
      const phase = this.connectCount === 1 ? "initial" : "reconnect";

      logger.info("MQTT connected", {
        phase,
        connectCount: this.connectCount,
        clientId: env.mqttClientId
      });

      client.subscribe(env.mqttTelemetryTopic, { qos: env.mqttQos as 0 | 1 | 2 }, (error) => {
        if (error) {
          logger.error("MQTT subscription error", error);
          return;
        }

        logger.info("MQTT telemetry subscription ready", {
          topic: env.mqttTelemetryTopic,
          qos: env.mqttQos
        });
      });

      client.subscribe(env.mqttActuatorStateTopic, { qos: env.mqttQos as 0 | 1 | 2 }, (error) => {
        if (error) {
          logger.error("MQTT actuator state subscription error", error);
          return;
        }

        logger.info("MQTT actuator state subscription ready", {
          topic: env.mqttActuatorStateTopic,
          qos: env.mqttQos
        });
      });
    });

    client.on("reconnect", () => {
      logger.info("MQTT reconnect event", {
        clientId: env.mqttClientId
      });
    });

    client.on("offline", () => {
      logger.info("MQTT client offline", {
        clientId: env.mqttClientId
      });
    });

    client.on("close", () => {
      logger.info("MQTT connection closed", {
        clientId: env.mqttClientId,
        hadConnected: this.connectCount > 0
      });
    });

    client.on("message", (topic, buffer) => {
      void this.handleIncomingMessage(topic, buffer);
    });

    client.on("error", (error) => {
      logger.error("MQTT client error", error);
    });
  }

  private async handleIncomingMessage(topic: string, payloadRaw: Buffer): Promise<void> {
    try {
      const payload = decodeMqttPayload(topic, payloadRaw);

      const telemetryEmulatorId = this.extractEmulatorId(topic, "telemetry");
      if (telemetryEmulatorId && this.telemetryHandler) {
        await this.telemetryHandler({ topic, emulatorId: telemetryEmulatorId, payload });
        return;
      }

      const actuatorStateEmulatorId = this.extractEmulatorId(topic, "actuator-state");
      if (actuatorStateEmulatorId && this.actuatorStateHandler) {
        await this.actuatorStateHandler({ topic, emulatorId: actuatorStateEmulatorId, payload });
      }
    } catch (error: unknown) {
      logger.error("MQTT message handling error", error);
    }
  }

  private extractEmulatorId(topic: string, suffix: string): string | null {
    const parts = topic.split("/");
    if (parts.length < 3 || parts[0] !== "safeair" || parts[2] !== suffix) {
      return null;
    }

    return parts[1] ?? null;
  }
}

export const mqttGateway = new MqttGateway();
