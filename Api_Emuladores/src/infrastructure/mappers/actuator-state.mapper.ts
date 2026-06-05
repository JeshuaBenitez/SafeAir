import type { ActuatorStateInput } from "../../domain/types/actuator.types";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/config/logger";

const DEVICE_TYPE_ALIAS_MAP: Record<string, ActuatorStateInput["deviceType"]> = {
  minisplit: "minisplit",
  minisplitunit: "minisplit",

  airextractor: "extractor",
  extractor: "extractor",

  humidifierpurifier: "purifier",
  purifier: "purifier"
};

const SUPPORTED_DEVICE_TYPE_VARIANTS = [
  "MiniSplit",
  "minisplit",
  "mini_split",
  "mini-split",
  "mini split",
  "AirExtractor",
  "airextractor",
  "air_extractor",
  "air-extractor",
  "air extractor",
  "extractor",
  "HumidifierPurifier",
  "humidifierpurifier",
  "humidifier_purifier",
  "humidifier-purifier",
  "humidifier purifier",
  "purifier"
];

export function normalizeDeviceType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");
}

export function mapExternalDeviceTypeToInternal(rawDeviceType: unknown): ActuatorStateInput["deviceType"] {
  const raw = String(rawDeviceType ?? "").trim();
  const normalized = normalizeDeviceType(raw);
  const mapped = DEVICE_TYPE_ALIAS_MAP[normalized];

  if (mapped) {
    return mapped;
  }

  logger.error("Unsupported actuator deviceType received", {
    receivedDeviceType: raw,
    normalizedDeviceType: normalized,
    supportedExternalTypes: SUPPORTED_DEVICE_TYPE_VARIANTS,
    supportedInternalTypes: ["minisplit", "extractor", "purifier"]
  });

  throw new AppError("Unsupported actuator deviceType", 422, "ACTUATOR_DEVICE_TYPE_UNSUPPORTED", {
    receivedDeviceType: raw,
    normalizedDeviceType: normalized,
    supportedExternalTypes: SUPPORTED_DEVICE_TYPE_VARIANTS,
    supportedInternalTypes: ["minisplit", "extractor", "purifier"]
  });
}

export function mapActuatorStatePayload(payload: Record<string, unknown>): ActuatorStateInput {
  return {
    emulatorId: String(payload.emulatorId ?? ""),
    roomId: payload.roomId ? String(payload.roomId) : undefined,
    deviceType: mapExternalDeviceTypeToInternal(payload.deviceType),
    isOn: Boolean(payload.isOn),
    mode: payload.mode ? String(payload.mode) : undefined,
    targetTemperature: payload.targetTemperature !== undefined ? Number(payload.targetTemperature) : undefined,
    ambientTemperature: payload.ambientTemperature !== undefined ? Number(payload.ambientTemperature) : undefined,
    ambientHumidity: payload.ambientHumidity !== undefined ? Number(payload.ambientHumidity) : undefined,
    timestamp: payload.timestamp ? String(payload.timestamp) : undefined
  };
}
