import { Request, Response } from "express";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
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
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // 1. Log: Received action from frontend
  logFrontend(`Command received: ${deviceType} ${action} for room ${roomId}`, {
    roomId,
    deviceType,
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

    // 4. Get emulator external ID (e.g., EMU-0001) for this room
    const emulatorRepository = new EmulatorRepository();
    const emulator = await emulatorRepository.findByRoomId(roomId);
    
    // Use emulatorExternalId if exists, otherwise fall back to roomId
    // This ensures the command goes to the correct emulator (e.g., EMU-0001)
    const targetId = emulator?.emulatorExternalId || roomId;

    // 5. Map action: turn_on -> minisplit_on, etc.
    let commandAction: string;
    switch (action) {
      case "turn_on":
        commandAction = `${deviceType}_on`;
        break;
      case "turn_off":
        commandAction = `${deviceType}_off`;
        break;
      case "set_temperature":
        commandAction = `${deviceType}_set_${value}`;
        break;
      default:
        commandAction = action;
    }

    const mqttPayload = {
      roomId,
      deviceType,
      action: commandAction,
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
        action: commandAction,
        reason: `Command from ${source}`,
        requestedBy: source === "rule-engine" ? "rule-engine" : "manual",
      });

      // Log: PostgreSQL insert
      logPostgres("INSERT", "device_actions", { roomId, deviceType, action: commandAction });
    } catch (dbError) {
      logError("postgres", "device-action-save-failed", dbError);
      // Continue despite DB error - command was sent
    }

    // 9. Respond success
    res.status(200).json({
      success: true,
      message: `Command '${commandAction}' sent to ${deviceType} (emulator: ${targetId})`,
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
