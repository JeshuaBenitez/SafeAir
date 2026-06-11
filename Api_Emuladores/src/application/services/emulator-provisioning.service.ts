import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { emulatorProvisionTopic } from "../../infrastructure/mqtt/topics";
import { addLog, logError, logMqttPublished } from "./debug-logs.service";

export interface EmulatorProvisionConfig {
  roomSquareMeters: number;
  windowCount: number;
  sensorTypes: number[];
  deviceTypes: number[];
  updateIntervalSec: number;
}

export interface EmulatorProvisionRequest {
  emulatorExternalId: string;
  roomId: string;
  userId: string;
  config?: Partial<EmulatorProvisionConfig>;
}

const DEFAULT_PROVISION_CONFIG: EmulatorProvisionConfig = {
  roomSquareMeters: 35,
  windowCount: 1,
  sensorTypes: [1, 2, 3, 4],
  deviceTypes: [1, 2, 3],
  updateIntervalSec: 1
};

export class EmulatorProvisioningService {
  async requestProvision(input: EmulatorProvisionRequest): Promise<void> {
    const topic = emulatorProvisionTopic();
    const config = { ...DEFAULT_PROVISION_CONFIG, ...input.config };
    const payload = {
      type: "PROVISION_EMULATOR",
      emulatorExternalId: input.emulatorExternalId,
      roomId: input.roomId,
      userId: input.userId,
      config,
      requestedAt: new Date().toISOString()
    };

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room.create.emulator-provision-requested",
      message: `Requesting emulator provision for ${input.emulatorExternalId}`,
      details: { topic, ...payload },
      roomId: input.roomId,
      emulatorId: input.emulatorExternalId
    });

    try {
      await mqttGateway.publish(topic, payload);
      logMqttPublished(topic, payload, input.emulatorExternalId);
    } catch (error) {
      logError("mqtt", "room.create.emulator-provision-failed", error);
      addLog({
        timestamp: new Date().toISOString(),
        level: "error",
        source: "mqtt",
        event: "room.create.emulator-provision-failed",
        message: error instanceof Error ? error.message : String(error),
        details: { topic, payload },
        roomId: input.roomId,
        emulatorId: input.emulatorExternalId
      });
      throw error;
    }
  }
}
