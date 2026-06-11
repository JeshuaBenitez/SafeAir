import { z } from "zod";
import { AppError } from "../../shared/errors/app-error";
import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import { RuleEvaluationService } from "./rule-evaluation.service";
import { DeviceActionService } from "./device-action.service";
import { AlarmService } from "./alarm.service";
import { addLog } from "./debug-logs.service";
import type { TelemetryInput } from "../../domain/types/telemetry.types";
import { EmulatorResolutionService } from "./emulator-resolution.service";

const telemetrySchema = z.object({
  emulatorId: z.string().min(1),
  roomId: z.string().uuid().optional(),
  temperature: z.number(),
  humidity: z.number(),
  co2: z.number(),
  pm25: z.number(),
  timestamp: z.string().optional()
});

export class TelemetryIngestionService {
  constructor(
    private readonly emulatorResolutionService: EmulatorResolutionService,
    private readonly cycleRepository: CycleRepository,
    private readonly ruleEvaluationService: RuleEvaluationService,
    private readonly deviceActionService: DeviceActionService,
    private readonly alarmService: AlarmService
  ) {}

  async handleIncomingTelemetry(rawTelemetry: TelemetryInput, source: "mqtt" | "rest"): Promise<{ roomId: string; emulatorExternalId: string }> {
    // Boundary validation guarantees downstream rule evaluation receives a stable shape.
    const parsed = telemetrySchema.safeParse(rawTelemetry);
    if (!parsed.success) {
      if (source === "mqtt") {
        addLog({
          timestamp: new Date().toISOString(),
          level: "error",
          source: "mqtt",
          event: "mqtt-telemetry-parse-error",
          message: "Invalid telemetry payload",
          details: { issues: parsed.error.format(), rawTelemetry },
          emulatorId: rawTelemetry.emulatorId
        });
      }

      throw new AppError("Invalid telemetry payload", 422, "TELEMETRY_VALIDATION_ERROR", parsed.error.format());
    }

    const telemetry = parsed.data;
    let emulator: { roomId: string; emulatorExternalId: string };
    try {
      emulator = await this.emulatorResolutionService.resolveOrProvision(telemetry.emulatorId);
    } catch (error: unknown) {
      if (source === "mqtt") {
        const appError = error instanceof AppError ? error : null;
        addLog({
          timestamp: new Date().toISOString(),
          level: "error",
          source: "mqtt",
          event: appError?.code === "EMULATOR_NOT_FOUND" ? "mqtt-telemetry-emulator-not-found" : "mqtt-telemetry-room-not-found",
          message: appError?.message ?? (error instanceof Error ? error.message : String(error)),
          details: { emulatorId: telemetry.emulatorId, code: appError?.code ?? "UNKNOWN_ERROR" },
          emulatorId: telemetry.emulatorId
        });
      }

      throw error;
    }

    const roomId = emulator.roomId;
    if (source === "mqtt") {
      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        source: "mqtt",
        event: "mqtt-telemetry-emulator-mapped",
        message: `Telemetry mapped to room ${roomId}`,
        details: { emulatorExternalId: emulator.emulatorExternalId, roomId },
        roomId,
        emulatorId: telemetry.emulatorId
      });
    }

    const cycle = await this.cycleRepository.openOrCreate(roomId);
    const receivedAt = new Date();
    const measuredAt = telemetry.timestamp ? new Date(telemetry.timestamp) : new Date();

    let measurementId: string;
    try {
      const measurement = await this.cycleRepository.createMeasurement({
        roomId,
        cycleId: cycle.id,
        temperature: telemetry.temperature,
        humidity: telemetry.humidity,
        co2: telemetry.co2,
        pm25: telemetry.pm25,
        measuredAt,
        receivedAt,
        source
      });
      measurementId = measurement.id;
    } catch (error: unknown) {
      if (source === "mqtt") {
        addLog({
          timestamp: new Date().toISOString(),
          level: "error",
          source: "postgres",
          event: "mqtt-telemetry-persist-error",
          message: error instanceof Error ? error.message : String(error),
          details: {
            roomId,
            cycleId: cycle.id,
            emulatorExternalId: emulator.emulatorExternalId,
            error: error instanceof Error ? error.stack ?? error.message : String(error)
          },
          roomId,
          emulatorId: telemetry.emulatorId
        });
      }

      throw error;
    }

    if (source === "mqtt") {
      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        source: "postgres",
        event: "cycle-measurement-created",
        message: `Cycle measurement created for ${telemetry.emulatorId}`,
        details: {
          measurementId,
          roomId,
          cycleId: cycle.id,
          measuredAt: measuredAt.toISOString(),
          receivedAt: receivedAt.toISOString()
        },
        roomId,
        emulatorId: telemetry.emulatorId
      });
    }

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "postgres",
      event: "cycle-measurement-saved",
      message: `Measurement saved: temp=${telemetry.temperature.toFixed(1)}, hum=${telemetry.humidity.toFixed(1)}, co2=${telemetry.co2.toFixed(0)}, pm25=${telemetry.pm25.toFixed(1)}`,
      details: {
        roomId,
        cycleId: cycle.id,
        measuredAt: measuredAt.toISOString(),
        receivedAt: receivedAt.toISOString(),
        source
      },
      roomId,
      emulatorId: telemetry.emulatorId
    });

    if (source === "mqtt") {
      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        source: "postgres",
        event: "mqtt-telemetry-persisted",
        message: `Telemetry persisted for ${telemetry.emulatorId}`,
        details: {
          measurementId,
          roomId,
          cycleId: cycle.id,
          emulatorExternalId: emulator.emulatorExternalId,
          measuredAt: measuredAt.toISOString()
        },
        roomId,
        emulatorId: telemetry.emulatorId
      });
    }

    const previous = await this.cycleRepository.getPreviousMeasurement(roomId, measuredAt);
    const criticalRecentCount = await this.cycleRepository.countCriticalInRecentCycles(roomId, 5);
    const actionsWithoutImprovementCount = await this.deviceActionService.countRecentWithoutImprovement(roomId, 3);

    const evaluation = this.ruleEvaluationService.evaluate({
      temperature: telemetry.temperature,
      humidity: telemetry.humidity,
      co2: telemetry.co2,
      pm25: telemetry.pm25,
      previous,
      criticalRecentCount,
      actionsWithoutImprovementCount
    });

    for (const action of evaluation.actions) {
      // Action persistence happens before publication to preserve traceability.
      await this.deviceActionService.createAndPublish({
        roomId,
        cycleId: cycle.id,
        deviceType: action.deviceType,
        action: action.action,
        reason: action.reason,
        level: action.level
      });
    }

    for (const alarm of evaluation.alarms) {
      // Alarm persistence happens before publication to avoid losing historical evidence.
      await this.alarmService.createAndPublish({
        roomId,
        cycleId: cycle.id,
        type: alarm.type,
        severity: alarm.severity,
        message: alarm.message,
        metadata: alarm.metadata
      });
    }

    return { roomId, emulatorExternalId: emulator.emulatorExternalId };
  }
}
