import type { TelemetryInput } from "../../domain/types/telemetry.types";

export function mapTelemetryPayload(payload: Record<string, unknown>): TelemetryInput {
  return {
    emulatorId: String(payload.emulatorId ?? ""),
    roomId: payload.roomId ? String(payload.roomId) : undefined,
    temperature: Number(payload.temperature),
    humidity: Number(payload.humidity),
    co2: Number(payload.co2),
    pm25: Number(payload.pm25),
    timestamp: payload.timestamp ? String(payload.timestamp) : undefined
  };
}
