import { eventBus, EVENTS } from "../events/event-bus";
import { AlarmRepository } from "../../infrastructure/repositories/alarm.repository";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { roomAlarmsTopic } from "../../infrastructure/mqtt/topics";

export class AlarmService {
  constructor(private readonly repository: AlarmRepository) {}

  async createAndPublish(data: {
    roomId: string;
    cycleId: string;
    type: "critical_persistence" | "abrupt_change" | "no_improvement" | "invalid_configuration";
    severity: "low" | "medium" | "high";
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const alarm = await this.repository.create(data);

    await mqttGateway.publish(roomAlarmsTopic(data.roomId), {
      alarmId: alarm.id,
      roomId: alarm.roomId,
      cycleId: alarm.cycleId,
      type: alarm.type,
      severity: alarm.severity,
      message: alarm.message,
      triggeredAt: alarm.triggeredAt
    });

    eventBus.emit(EVENTS.ALARM_CREATED, { alarmId: alarm.id, roomId: data.roomId });
  }

  async listByRoom(roomId: string, from?: string, to?: string): Promise<unknown[]> {
    return this.repository.listByRoom(roomId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  async listActiveByRoom(roomId: string): Promise<unknown[]> {
    return this.repository.listActiveByRoom(roomId);
  }
}
