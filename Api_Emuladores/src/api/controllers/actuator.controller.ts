import { Request, Response } from "express";
import { container } from "../../application/container";
import { addLog } from "../../application/services/debug-logs.service";
import { AppError } from "../../shared/errors/app-error";

interface RoomActuatorCommandBody {
  action: string;
  value?: boolean | number | string;
  deviceIndex?: number;
  source?: "frontend" | "api" | "rule-engine" | "debug-dashboard" | "safeairctl";
}

interface ParsedEditCommand {
  actuator: string;
  deviceType: "minisplit" | "extractor" | "purifier";
  deviceIndex: number;
  responseAction: "turn_on" | "turn_off" | "set_state";
  mqttAction: "turn_on" | "turn_off" | "set_temperature" | "set_speed";
  value?: number;
}

const STRUCTURAL_FIELDS = new Set([
  "roomName",
  "roomId",
  "userId",
  "area",
  "squareMeters",
  "windows",
  "windowCount",
  "sensors",
  "sensorTypes",
  "deviceTypes",
  "emulatorExternalId"
]);

const LEGACY_FIELDS = new Set([
  "emulator",
  "extractor1",
  "minisplit1",
  "minisplit1Setpoint",
  "purifier1",
  "purifier1Level"
]);

const RECOMMENDED_FIELDS = new Set(["actuator", "action", "value"]);

/**
 * Send command to actuator via MQTT.
 * Flow: Frontend -> API -> EMQX -> Emulator
 */
export async function sendActuatorCommand(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.sub;
  if (!userId) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const body = req.body as RoomActuatorCommandBody;
  const result = await container.actuatorCommandService.sendCommand({
    roomId: String(req.params.roomId),
    userId,
    deviceType: String(req.params.deviceType),
    deviceIndex: body.deviceIndex,
    action: body.action,
    value: body.value,
    source: body.source ?? "frontend"
  });

  res.status(200).json({
    success: true,
    message: result.message,
    topic: result.topic,
    payload: result.payload
  });
}

export async function editEmulatorActuator(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const emulatorId = String(req.params.emulatorId);
    const command = parseEditCommand(req.body);
    const result = await container.actuatorCommandService.sendCommandToEmulator({
      emulatorId,
      userId,
      deviceType: command.deviceType,
      deviceIndex: command.deviceIndex,
      action: command.mqttAction,
      value: command.value,
      source: "api"
    });

    res.status(200).json({
      ok: true,
      emulatorExternalId: result.emulatorExternalId,
      command: {
        actuator: command.actuator,
        action: command.responseAction,
        ...(command.value === undefined ? {} : { value: command.value })
      },
      correlationId: result.correlationId
    });
  } catch (error) {
    addLog({
      timestamp: new Date().toISOString(),
      level: "error",
      source: "api",
      event: "api.actuator-command.failed",
      message: error instanceof Error ? error.message : "Actuator command failed",
      details: {
        emulatorExternalId: String(req.params.emulatorId),
        code: error instanceof AppError ? error.code : "INTERNAL_SERVER_ERROR"
      },
      emulatorId: String(req.params.emulatorId)
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details ?? null
      });
      return;
    }

    res.status(500).json({
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error"
    });
  }
}

function parseEditCommand(body: unknown): ParsedEditCommand {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Body must be a JSON object", 422, "INVALID_ACTUATOR_COMMAND");
  }

  const raw = body as Record<string, unknown>;
  const keys = Object.keys(raw);
  const blocked = keys.filter((key) => STRUCTURAL_FIELDS.has(key));
  if (blocked.length > 0) {
    throw new AppError(`Structural fields are not allowed: ${blocked.join(", ")}`, 422, "INVALID_ACTUATOR_COMMAND");
  }

  if (keys.includes("actuator") || keys.includes("action") || keys.includes("value")) {
    const unknown = keys.filter((key) => !RECOMMENDED_FIELDS.has(key));
    if (unknown.length > 0) {
      throw new AppError(`Unknown fields: ${unknown.join(", ")}`, 422, "INVALID_ACTUATOR_COMMAND");
    }
    return parseRecommendedCommand(raw);
  }

  const unknown = keys.filter((key) => !LEGACY_FIELDS.has(key));
  if (unknown.length > 0) {
    throw new AppError(`Unknown fields: ${unknown.join(", ")}`, 422, "INVALID_ACTUATOR_COMMAND");
  }

  return parseLegacyCommand(raw);
}

function parseRecommendedCommand(raw: Record<string, unknown>): ParsedEditCommand {
  if (typeof raw.actuator !== "string" || typeof raw.action !== "string") {
    throw new AppError("actuator and action are required strings", 422, "INVALID_ACTUATOR_COMMAND");
  }

  const actuator = parseActuator(raw.actuator);
  const action = raw.action.trim();

  if (action === "turn_on" || action === "turn_off") {
    return {
      actuator: actuator.label,
      deviceType: actuator.deviceType,
      deviceIndex: actuator.deviceIndex,
      responseAction: action,
      mqttAction: action
    };
  }

  if (action !== "set_state") {
    throw new AppError("Unsupported actuator action", 422, "INVALID_ACTUATOR_COMMAND");
  }

  if (actuator.deviceType === "extractor") {
    throw new AppError("AirExtractor only supports turn_on and turn_off", 422, "INVALID_ACTUATOR_COMMAND");
  }

  const value = parseInteger(raw.value, "value");
  return {
    actuator: actuator.label,
    deviceType: actuator.deviceType,
    deviceIndex: actuator.deviceIndex,
    responseAction: "set_state",
    mqttAction: actuator.deviceType === "minisplit" ? "set_temperature" : "set_speed",
    value
  };
}

function parseLegacyCommand(raw: Record<string, unknown>): ParsedEditCommand {
  const commandKeys = Object.keys(raw).filter((key) => key !== "emulator" && raw[key] !== undefined);
  if (commandKeys.length !== 1) {
    throw new AppError("Exactly one actuator command is required", 422, "INVALID_ACTUATOR_COMMAND");
  }

  const key = commandKeys[0];
  const value = raw[key];

  if (key === "extractor1") {
    return parseLegacyOnOff("AirExtractor#1", "extractor", value);
  }
  if (key === "minisplit1") {
    return parseLegacyOnOff("MiniSplit#1", "minisplit", value);
  }
  if (key === "purifier1") {
    return parseLegacyOnOff("HumidifierPurifier#1", "purifier", value);
  }
  if (key === "minisplit1Setpoint") {
    return {
      actuator: "MiniSplit#1",
      deviceType: "minisplit",
      deviceIndex: 1,
      responseAction: "set_state",
      mqttAction: "set_temperature",
      value: parseInteger(value, key)
    };
  }
  if (key === "purifier1Level") {
    return {
      actuator: "HumidifierPurifier#1",
      deviceType: "purifier",
      deviceIndex: 1,
      responseAction: "set_state",
      mqttAction: "set_speed",
      value: parseInteger(value, key)
    };
  }

  throw new AppError("Invalid actuator command", 422, "INVALID_ACTUATOR_COMMAND");
}

function parseLegacyOnOff(
  actuator: string,
  deviceType: "minisplit" | "extractor" | "purifier",
  value: unknown
): ParsedEditCommand {
  if (value !== "on" && value !== "off") {
    throw new AppError(`${actuator} expects "on" or "off"`, 422, "INVALID_ACTUATOR_COMMAND");
  }

  const responseAction = value === "on" ? "turn_on" : "turn_off";
  return {
    actuator,
    deviceType,
    deviceIndex: 1,
    responseAction,
    mqttAction: responseAction
  };
}

function parseActuator(value: string): {
  label: string;
  deviceType: "minisplit" | "extractor" | "purifier";
  deviceIndex: number;
} {
  const match = value.trim().match(/^([A-Za-z]+)#([1-3])$/);
  if (!match) {
    throw new AppError("actuator must look like MiniSplit#1, AirExtractor#1, or HumidifierPurifier#1", 422, "INVALID_ACTUATOR_COMMAND");
  }

  const rawType = match[1].toLowerCase();
  const deviceIndex = Number(match[2]);
  if (rawType === "minisplit") {
    return { label: `MiniSplit#${deviceIndex}`, deviceType: "minisplit", deviceIndex };
  }
  if (rawType === "airextractor" || rawType === "extractor") {
    return { label: `AirExtractor#${deviceIndex}`, deviceType: "extractor", deviceIndex };
  }
  if (rawType === "humidifierpurifier" || rawType === "purifier") {
    return { label: `HumidifierPurifier#${deviceIndex}`, deviceType: "purifier", deviceIndex };
  }

  throw new AppError("Unsupported actuator type", 422, "INVALID_ACTUATOR_COMMAND");
}

function parseInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AppError(`${field} must be an integer`, 422, "INVALID_ACTUATOR_COMMAND");
  }

  return parsed;
}
