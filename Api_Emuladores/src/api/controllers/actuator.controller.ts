import { Request, Response } from "express";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import type { RoomModel } from "../../infrastructure/database/models";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { actuatorStateTopic } from "../../infrastructure/mqtt/topics";
import { logMqttPublished, logFrontend, logError, logPostgres } from "../../application/services/debug-logs.service";
import { AppError } from "../../shared/errors/app-error";

/**
 * Body for actuator command
 */
interface ActuatorCommandBody {
  action: "turn_on" | "turn_off" | "set_temperature";
  value: boolean | number;
  deviceIndex?: number;
  source?: "frontend" | "api" | "rule-engine" | "debug-dashboard";
}

/**
 * Send command to actuator via MQTT
 * Flow: Frontend -> API -> EMQX -> Emulator
 */
export async function sendActuatorCommand(
  req: Request,
  res: Response
): Promise<void> {
  // Extract and convert params to strings
  const roomId = String(req.params.roomId);
  const deviceType = String(req.params.deviceType);
  const { action, value, source = "frontend" } = req.body as ActuatorCommandBody;
  const deviceIndex = normalizeDeviceIndex((req.body as ActuatorCommandBody).deviceIndex);
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // 1. Log: Received action from frontend
  logFrontend(`Command received: ${deviceType} ${action} for room ${roomId}`, {
    roomId,
    deviceType,
    deviceIndex,
    action,
    value,
    source,
  });

  // 2. Validate parameters
  if (!action || !["turn_on", "turn_off", "set_temperature"].includes(action)) {
    res.status(400).json({
      success: false,
      error: "Invalid action. Must be: turn_on, turn_off, or set_temperature",
    });
    return;
  }

  if (action === "set_temperature" && typeof value !== "number") {
    res.status(400).json({
      success: false,
      error: "set_temperature requires a number value for temperature",
    });
    return;
  }

  if (!["minisplit", "purifier", "extractor"].includes(deviceType)) {
    res.status(400).json({
      success: false,
      error: "Invalid deviceType. Must be: minisplit, purifier, or extractor",
    });
    return;
  }

  try {
    // 3. Get room (just to verify it exists)
    const roomRepository = new RoomRepository();
    const room = await roomRepository.findById(roomId, userId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: "Room not found",
      });
      return;
    }

    const configuredUnits = getConfiguredUnits(room, deviceType as "minisplit" | "purifier" | "extractor");
    if (configuredUnits < 1 || deviceIndex > configuredUnits) {
      res.status(400).json({
        success: false,
        error: `${deviceType} unit ${deviceIndex} is not configured for this room`,
        configuredUnits,
      });
      return;
    }

    // 4. Get emulator external ID (e.g., EMU-0001) for this room
    const emulatorRepository = new EmulatorRepository();
    const emulator = await emulatorRepository.findByRoomId(roomId);

    if (!emulator) {
      res.status(409).json({
        success: false,
        error: "Room has no emulator assigned",
      });
      return;
    }

    const targetId = emulator.emulatorExternalId;

    const mqttPayload = {
      roomId,
      roomName: room.name,
      deviceType,
      deviceIndex,
      action,
      value: action === "set_temperature" ? Number(value) : Boolean(value),
      source,
      timestamp: new Date().toISOString(),
    };

    // 6. Publish to MQTT using the external emulator ID (e.g., EMU-0001)
    const topic = actuatorStateTopic(targetId);
    await mqttGateway.publish(topic, mqttPayload);

    // 7. Log: MQTT published
    logMqttPublished(topic, mqttPayload, targetId);

    // 8. Save action to PostgreSQL
    try {
      const deviceActionRepo = new DeviceActionRepository();
      const cycleRepo = new CycleRepository();
      
      // Get or create open cycle
      const cycle = await cycleRepo.openOrCreate(roomId);
      
      await deviceActionRepo.create({
        roomId,
        cycleId: cycle.id,
        deviceType: deviceType as "minisplit" | "purifier" | "extractor",
        deviceIndex,
        action,
        reason: `Command from ${source}`,
        requestedBy: source === "rule-engine" ? "rule-engine" : "manual",
      });

      // Log: PostgreSQL insert
      logPostgres("INSERT", "device_actions", { roomId, deviceType, deviceIndex, action });
    } catch (dbError) {
      logError("postgres", "device-action-save-failed", dbError);
      // Continue despite DB error - command was sent
    }

    // 9. Respond success
    res.status(200).json({
      success: true,
      message: `Command '${action}' sent to ${deviceType} unit ${deviceIndex} (emulator: ${targetId})`,
      topic,
      payload: mqttPayload,
    });
  } catch (error) {
    // 10. Log error
    logError("api", "actuator-command-failed", error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to send command",
    });
  }
}

function normalizeDeviceIndex(value: unknown): number {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 1;
}

function getConfiguredUnits(
  room: RoomModel,
  deviceType: "minisplit" | "purifier" | "extractor"
): number {
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
