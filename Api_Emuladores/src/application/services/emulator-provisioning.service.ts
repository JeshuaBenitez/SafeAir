import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { emulatorProvisionStateTopic, emulatorProvisionTopic } from "../../infrastructure/mqtt/topics";
import type { EmulatorModel, InstanceModel, RoomModel, RoomSetupModel } from "../../infrastructure/database/models";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { addLog, logError, logMqttPublished } from "./debug-logs.service";
import { ConfigurationService } from "./configuration.service";

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

export interface EmulatorDeprovisionRequest {
  emulatorExternalId: string;
  roomId: string;
}

export interface ProvisioningReplaySummary {
  requested: number;
  configured: number;
  failed: number;
  failures: Array<{ emulatorExternalId: string; reason: string }>;
}

const DEFAULT_PROVISION_CONFIG: EmulatorProvisionConfig = {
  roomSquareMeters: 35,
  windowCount: 1,
  sensorTypes: [1, 2, 3, 4],
  deviceTypes: [1, 2, 3],
  updateIntervalSec: 1
};

export class EmulatorProvisioningService {
  constructor(
    private readonly emulatorRepository: EmulatorRepository,
    private readonly configurationService: ConfigurationService
  ) {}

  async requestProvision(input: EmulatorProvisionRequest): Promise<void> {
    const retainedTopic = emulatorProvisionStateTopic(input.emulatorExternalId);
    const compatibilityTopic = emulatorProvisionTopic();
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
      details: { retainedTopic, compatibilityTopic, ...payload },
      roomId: input.roomId,
      emulatorId: input.emulatorExternalId
    });

    try {
      await mqttGateway.publish(retainedTopic, payload, { retain: true });
      await mqttGateway.publish(compatibilityTopic, payload);
      logMqttPublished(retainedTopic, payload, input.emulatorExternalId);
    } catch (error) {
      logError("mqtt", "room.create.emulator-provision-failed", error);
      addLog({
        timestamp: new Date().toISOString(),
        level: "error",
        source: "mqtt",
        event: "room.create.emulator-provision-failed",
        message: error instanceof Error ? error.message : String(error),
        details: { retainedTopic, compatibilityTopic, payload },
        roomId: input.roomId,
        emulatorId: input.emulatorExternalId
      });
      throw error;
    }
  }

  async requestDeprovision(input: EmulatorDeprovisionRequest): Promise<void> {
    const retainedTopic = emulatorProvisionStateTopic(input.emulatorExternalId);
    const compatibilityTopic = emulatorProvisionTopic();
    const payload = {
      type: "DEPROVISION_EMULATOR",
      emulatorExternalId: input.emulatorExternalId,
      roomId: input.roomId,
      requestedAt: new Date().toISOString()
    };

    await mqttGateway.publish(retainedTopic, payload, { retain: true });
    await mqttGateway.publish(compatibilityTopic, payload);
    logMqttPublished(retainedTopic, payload, input.emulatorExternalId);
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room.delete.emulator-deprovision-requested",
      message: `Requested emulator deprovision for ${input.emulatorExternalId}`,
      details: { retainedTopic, compatibilityTopic, ...payload },
      roomId: input.roomId,
      emulatorId: input.emulatorExternalId
    });
  }

  async replayRegistered(): Promise<ProvisioningReplaySummary> {
    const emulators = await this.emulatorRepository.findAssigned();
    const summary: ProvisioningReplaySummary = {
      requested: 0,
      configured: 0,
      failed: 0,
      failures: []
    };

    for (const emulator of emulators) {
      try {
        const input = this.buildRequest(emulator);
        await this.requestProvision(input);
        summary.requested += 1;

        const room = emulator.get("room") as RoomModel | null;
        if (room?.get("setup")) {
          await this.configurationService.publishRoomConfig(input.roomId);
          summary.configured += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.failures.push({
          emulatorExternalId: emulator.emulatorExternalId,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }

    addLog({
      timestamp: new Date().toISOString(),
      level: summary.failed > 0 ? "warn" : "info",
      source: "system",
      event: "emulator.provision.replay.completed",
      message: `Provisioning replay completed: requested=${summary.requested}, configured=${summary.configured}, failed=${summary.failed}`,
      details: { ...summary }
    });

    return summary;
  }

  private buildRequest(emulator: EmulatorModel): EmulatorProvisionRequest {
    const room = emulator.get("room") as RoomModel | null;
    const instance = room?.get("instance") as InstanceModel | null;
    const setup = room?.get("setup") as RoomSetupModel | null;

    if (!room || !emulator.roomId || !instance?.userId) {
      throw new Error(`Emulator ${emulator.emulatorExternalId} has no valid user/room mapping`);
    }

    return {
      emulatorExternalId: emulator.emulatorExternalId,
      roomId: emulator.roomId,
      userId: instance.userId,
      config: setup ? this.configFromSetup(setup) : undefined
    };
  }

  private configFromSetup(setup: RoomSetupModel): EmulatorProvisionConfig {
    const deviceTypes = [
      ...Array.from({ length: setup.minisplitCount }, () => 1),
      ...Array.from({ length: setup.purifierCount }, () => 2),
      ...Array.from({ length: setup.extractorCount }, () => 3)
    ];

    return {
      roomSquareMeters: Math.round(setup.roomWidth * setup.roomLength),
      windowCount: setup.windowCount,
      sensorTypes: [1, 2, 3, 4],
      deviceTypes,
      updateIntervalSec: 5
    };
  }
}
