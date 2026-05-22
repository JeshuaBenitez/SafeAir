import { z } from "zod";
import { AppError } from "../../shared/errors/app-error";
import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import { RuleEvaluationService } from "./rule-evaluation.service";
import { DeviceActionService } from "./device-action.service";
import { AlarmService } from "./alarm.service";
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

  async handleIncomingTelemetry(rawTelemetry: TelemetryInput, source: "mqtt" | "rest"): Promise<void> {
    // Boundary validation guarantees downstream rule evaluation receives a stable shape.
    const parsed = telemetrySchema.safeParse(rawTelemetry);
    if (!parsed.success) {
      throw new AppError("Invalid telemetry payload", 422, "TELEMETRY_VALIDATION_ERROR", parsed.error.format());
    }

    const telemetry = parsed.data;
    const emulator = await this.emulatorResolutionService.resolveOrProvision(telemetry.emulatorId);
    const roomId = telemetry.roomId ?? emulator.roomId;
    const cycle = await this.cycleRepository.openOrCreate(roomId);
    const receivedAt = new Date();
    const measuredAt = telemetry.timestamp ? new Date(telemetry.timestamp) : new Date();

    await this.cycleRepository.createMeasurement({
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
  }
}
