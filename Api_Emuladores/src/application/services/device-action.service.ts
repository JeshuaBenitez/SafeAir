import { eventBus, EVENTS } from "../events/event-bus";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { roomActionsTopic } from "../../infrastructure/mqtt/topics";

export class DeviceActionService {
  constructor(private readonly repository: DeviceActionRepository) {}

  async createAndPublish(data: {
    roomId: string;
    cycleId: string;
    deviceType: "minisplit" | "purifier" | "extractor";
    action: string;
    reason: string;
    level?: "low" | "medium" | "high";
  }): Promise<void> {
    const record = await this.repository.create(data);

    await mqttGateway.publish(roomActionsTopic(data.roomId), {
      actionId: record.id,
      roomId: data.roomId,
      cycleId: data.cycleId,
      deviceType: data.deviceType,
      action: data.action,
      level: data.level ?? null,
      reason: data.reason,
      emittedAt: new Date().toISOString()
    });

    eventBus.emit(EVENTS.ACTION_CREATED, { actionId: record.id, roomId: data.roomId });
  }

  async history(roomId: string): Promise<unknown[]> {
    return this.repository.historyByRoom(roomId);
  }

  async countRecentWithoutImprovement(roomId: string, cycles = 3): Promise<number> {
    return this.repository.countRecentActiveWithoutImprovement(roomId, cycles);
  }
}
