import { randomUUID } from "crypto";
import type { RoomModel } from "../../infrastructure/database/models";
import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { actuatorStateTopic } from "../../infrastructure/mqtt/topics";
import { addLog, logError, logFrontend, logMqttPublished, logPostgres } from "./debug-logs.service";
import { eventBus, EVENTS } from "../events/event-bus";
import { AppError } from "../../shared/errors/app-error";

export type ActuatorDeviceType = "minisplit" | "purifier" | "extractor";
export type ActuatorMqttAction = "turn_on" | "turn_off" | "set_temperature" | "set_speed" | "set_mode";
export type ActuatorCommandSource = "frontend" | "api" | "rule-engine" | "debug-dashboard" | "safeairctl";

export interface ActuatorCommandInput {
  roomId: string;
  userId?: string;
  deviceType: string;
  deviceIndex?: number;
  action: string;
  value?: boolean | number | string;
  source?: ActuatorCommandSource;
}

export interface ActuatorEmulatorCommandInput {
  emulatorId: string;
  userId: string;
  deviceType: string;
  deviceIndex?: number;
  action: string;
  value?: boolean | number | string;
  source?: ActuatorCommandSource;
}

export interface ActuatorCommandResult {
  success: true;
  message: string;
  topic: string;
  payload: Record<string, unknown>;
  emulatorExternalId: string;
  correlationId: string;
}

const SUPPORTED_ACTIONS: ActuatorMqttAction[] = ["turn_on", "turn_off", "set_temperature", "set_speed", "set_mode"];
const SUPPORTED_DEVICE_TYPES: ActuatorDeviceType[] = ["minisplit", "purifier", "extractor"];

export class ActuatorCommandService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly emulatorRepository: EmulatorRepository,
    private readonly deviceActionRepository: DeviceActionRepository,
    private readonly cycleRepository: CycleRepository
  ) {}

  async sendCommand(input: ActuatorCommandInput): Promise<ActuatorCommandResult> {
    const roomId = String(input.roomId);
    const deviceType = this.normalizeDeviceType(input.deviceType);
    const action = this.normalizeAction(input.action);
    const deviceIndex = this.normalizeDeviceIndex(input.deviceIndex);
    const source = input.source ?? "api";
    const normalizedValue = this.normalizeActionValue(action, input.value);

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "api.actuator-command.received",
      message: `Actuator command received for room ${roomId}`,
      details: { roomId, deviceType, deviceIndex, action, value: normalizedValue, source },
      roomId
    });

    logFrontend(`Command received: ${deviceType} ${action} for room ${roomId}`, {
      roomId,
      deviceType,
      deviceIndex,
      action,
      value: normalizedValue,
      source
    });

    const room = await this.roomRepository.findById(roomId, input.userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    const emulator = await this.emulatorRepository.findByRoomId(roomId);
    if (!emulator) {
      throw new AppError("Room has no emulator assigned", 409, "ROOM_HAS_NO_EMULATOR");
    }

    return this.publishAuthorizedCommand({
      room,
      emulatorExternalId: emulator.emulatorExternalId,
      deviceType,
      deviceIndex,
      action,
      value: normalizedValue,
      source
    });
  }

  async sendCommandToEmulator(input: ActuatorEmulatorCommandInput): Promise<ActuatorCommandResult> {
    const emulator = await this.emulatorRepository.findByExternalId(input.emulatorId);
    if (!emulator) {
      throw new AppError("Emulator not found", 404, "EMULATOR_NOT_FOUND");
    }

    if (!emulator.roomId) {
      throw new AppError("Emulator is not assigned to a room owned by this user", 403, "FORBIDDEN");
    }

    const room = await this.roomRepository.findById(emulator.roomId, input.userId);
    if (!room) {
      throw new AppError("Emulator does not belong to the authenticated user", 403, "FORBIDDEN");
    }

    const deviceType = this.normalizeDeviceType(input.deviceType);
    const action = this.normalizeAction(input.action);
    const deviceIndex = this.normalizeDeviceIndex(input.deviceIndex);
    const normalizedValue = this.normalizeActionValue(action, input.value);

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "api.actuator-command.received",
      message: `Actuator command received for emulator ${input.emulatorId}`,
      details: {
        emulatorExternalId: input.emulatorId,
        roomId: emulator.roomId,
        deviceType,
        deviceIndex,
        action,
        value: normalizedValue,
        source: input.source ?? "api"
      },
      roomId: emulator.roomId,
      emulatorId: input.emulatorId
    });

    return this.publishAuthorizedCommand({
      room,
      emulatorExternalId: emulator.emulatorExternalId,
      deviceType,
      deviceIndex,
      action,
      value: normalizedValue,
      source: input.source ?? "api"
    });
  }

  private async publishAuthorizedCommand(input: {
    room: RoomModel;
    emulatorExternalId: string;
    deviceType: ActuatorDeviceType;
    deviceIndex: number;
    action: ActuatorMqttAction;
    value: boolean | number | string;
    source: ActuatorCommandSource;
  }): Promise<ActuatorCommandResult> {
    const roomId = input.room.id;
    this.validateDeviceCommand(input.deviceType, input.action, input.value);

    const configuredUnits = this.getConfiguredUnits(input.room, input.deviceType);
    if (configuredUnits < 1 || input.deviceIndex > configuredUnits) {
      throw new AppError(
        `${input.deviceType} unit ${input.deviceIndex} is not configured for this room`,
        422,
        "INVALID_ACTUATOR_COMMAND",
        { configuredUnits }
      );
    }

    const targetId = input.emulatorExternalId;
    const correlationId = randomUUID();
    const mqttPayload = {
      correlationId,
      roomId,
      roomName: input.room.name,
      deviceType: input.deviceType,
      deviceIndex: input.deviceIndex,
      action: input.action,
      value: input.value,
      source: input.source,
      timestamp: new Date().toISOString()
    };

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "api.actuator-command.authorized",
      message: `Actuator command authorized for ${targetId}`,
      details: {
        emulatorExternalId: targetId,
        roomId,
        deviceType: input.deviceType,
        deviceIndex: input.deviceIndex,
        action: input.action
      },
      roomId,
      emulatorId: targetId
    });

    const topic = actuatorStateTopic(targetId);
    await mqttGateway.publish(topic, mqttPayload);

    eventBus.emit(EVENTS.ACTUATOR_COMMAND_SENT, {
      topic,
      emulatorId: targetId,
      roomId,
      deviceType: input.deviceType,
      deviceIndex: input.deviceIndex,
      action: input.action,
      value: input.value,
      source: input.source
    });
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "api.actuator-command.published",
      message: `Actuator command published to ${topic}`,
      details: { topic, payload: mqttPayload },
      roomId,
      emulatorId: targetId
    });
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "mqtt-published",
      event: "actuator.command.sent",
      message: `Actuator command sent to ${topic}`,
      details: { topic, payload: mqttPayload },
      roomId,
      emulatorId: targetId
    });
    logMqttPublished(topic, mqttPayload, targetId);

    await this.saveAction({
      roomId,
      deviceType: input.deviceType,
      deviceIndex: input.deviceIndex,
      action: input.action,
      value: input.value,
      source: input.source
    });

    return {
      success: true,
      message: `Command '${input.action}' sent to ${input.deviceType} unit ${input.deviceIndex} (emulator: ${targetId})`,
      topic,
      payload: mqttPayload,
      emulatorExternalId: targetId,
      correlationId
    };
  }

  private normalizeDeviceType(value: string): ActuatorDeviceType {
    if (!SUPPORTED_DEVICE_TYPES.includes(value as ActuatorDeviceType)) {
      throw new AppError("Invalid actuator device", 422, "INVALID_ACTUATOR_COMMAND");
    }

    return value as ActuatorDeviceType;
  }

  private normalizeAction(value: string): ActuatorMqttAction {
    if (!SUPPORTED_ACTIONS.includes(value as ActuatorMqttAction)) {
      throw new AppError("Invalid actuator action", 422, "INVALID_ACTUATOR_COMMAND");
    }

    return value as ActuatorMqttAction;
  }

  private normalizeDeviceIndex(value: unknown): number {
    const parsed = Number(value ?? 1);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
      throw new AppError("deviceIndex must be an integer from 1 to 3", 422, "INVALID_ACTUATOR_COMMAND");
    }

    return parsed;
  }

  private normalizeActionValue(action: ActuatorMqttAction, value: unknown): boolean | number | string {
    if (action === "set_temperature" || action === "set_speed") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new AppError(`${action} requires a numeric value`, 422, "INVALID_ACTUATOR_COMMAND");
      }

      return parsed;
    }

    if (action === "turn_on") {
      return true;
    }

    if (action === "turn_off") {
      return false;
    }

    if (value === undefined || value === null || String(value).trim() === "") {
      throw new AppError(`${action} requires a value`, 422, "INVALID_ACTUATOR_COMMAND");
    }

    return String(value);
  }

  private validateDeviceCommand(deviceType: ActuatorDeviceType, action: ActuatorMqttAction, value: boolean | number | string): void {
    if (action === "set_temperature") {
      if (deviceType !== "minisplit") {
        throw new AppError("set_state/set_temperature is only supported for MiniSplit", 422, "INVALID_ACTUATOR_COMMAND");
      }

      const setpoint = Number(value);
      if (!Number.isInteger(setpoint) || setpoint < 19 || setpoint > 30) {
        throw new AppError("MiniSplit setpoint must be an integer from 19 to 30", 422, "INVALID_ACTUATOR_COMMAND");
      }
    }

    if (action === "set_speed") {
      if (deviceType === "extractor") {
        throw new AppError("AirExtractor only supports turn_on and turn_off", 422, "INVALID_ACTUATOR_COMMAND");
      }

      if (deviceType === "minisplit") {
        throw new AppError("MiniSplit setpoint must use set_state/set_temperature", 422, "INVALID_ACTUATOR_COMMAND");
      }

      const level = Number(value);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        throw new AppError("HumidifierPurifier level must be an integer from 1 to 5", 422, "INVALID_ACTUATOR_COMMAND");
      }
    }
  }

  private getConfiguredUnits(room: RoomModel, deviceType: ActuatorDeviceType): number {
    const setup = room.get("setup") as {
      minisplitCount?: number;
      purifierCount?: number;
      extractorCount?: number;
    } | null;

    const setupCount =
      deviceType === "minisplit"
        ? setup?.minisplitCount
        : deviceType === "purifier"
          ? setup?.purifierCount
          : setup?.extractorCount;

    if (Number.isFinite(Number(setupCount))) {
      return Number(setupCount);
    }

    const devices = room.get("devices") as Array<{ type?: string }> | undefined;
    return devices?.filter((device) => device.type === deviceType).length ?? 0;
  }

  private async saveAction(data: {
    roomId: string;
    deviceType: ActuatorDeviceType;
    deviceIndex: number;
    action: ActuatorMqttAction;
    value: boolean | number | string;
    source: ActuatorCommandSource;
  }): Promise<void> {
    try {
      const cycle = await this.cycleRepository.openOrCreate(data.roomId);
      await this.deviceActionRepository.create({
        roomId: data.roomId,
        cycleId: cycle.id,
        deviceType: data.deviceType,
        deviceIndex: data.deviceIndex,
        action: data.action,
        reason: `Command from ${data.source}; value=${data.value}`,
        requestedBy: data.source === "rule-engine" ? "rule-engine" : "manual"
      });

      logPostgres("INSERT", "device_actions", {
        roomId: data.roomId,
        deviceType: data.deviceType,
        deviceIndex: data.deviceIndex,
        action: data.action
      });
    } catch (error) {
      logError("postgres", "device-action-save-failed", error);
    }
  }
}
