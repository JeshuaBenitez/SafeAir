import type { RuleEvaluationResult } from "../../domain/types/telemetry.types";

export class RuleEvaluationService {
  evaluate(input: {
    temperature: number;
    humidity: number;
    co2: number;
    pm25: number;
    previous?: { temperature: number; humidity: number; co2: number; pm25: number } | null;
    criticalRecentCount: number;
    actionsWithoutImprovementCount: number;
  }): RuleEvaluationResult {
    const actions: RuleEvaluationResult["actions"] = [];
    const alarms: RuleEvaluationResult["alarms"] = [];

    if (input.temperature > 30) {
      actions.push({ deviceType: "minisplit", action: "cooling_on", level: "high", reason: "Temperature > 30C" });
    } else if (input.temperature > 26) {
      actions.push({ deviceType: "minisplit", action: "cooling_on", level: "medium", reason: "Temperature > 26C" });
    } else if (input.temperature < 18) {
      actions.push({ deviceType: "minisplit", action: "cooling_off", reason: "Temperature < 18C" });
      alarms.push({
        type: "abrupt_change",
        severity: "low",
        message: "Low temperature detected below 18C"
      });
    }

    if (input.humidity > 85) {
      actions.push({ deviceType: "extractor", action: "extract_on", level: "medium", reason: "Humidity > 85%" });
    } else if (input.humidity > 70) {
      actions.push({ deviceType: "purifier", action: "purifier_on", level: "medium", reason: "Humidity > 70%" });
    }

    if (input.co2 > 2000) {
      actions.push({ deviceType: "extractor", action: "extract_on", level: "high", reason: "CO2 > 2000 ppm" });
    } else if (input.co2 > 1200) {
      actions.push({ deviceType: "extractor", action: "extract_on", level: "medium", reason: "CO2 > 1200 ppm" });
    }

    if (input.pm25 > 35) {
      actions.push({ deviceType: "extractor", action: "extract_on", level: "medium", reason: "PM2.5 > 35 ug/m3" });
    }

    if (input.criticalRecentCount >= 5) {
      alarms.push({
        type: "critical_persistence",
        severity: "high",
        message: "Critical values persisted for 5 or more cycles",
        metadata: { criticalRecentCount: input.criticalRecentCount }
      });
    }

    if (input.previous) {
      const abrupt = this.hasAbruptChange(input.previous, input);
      if (abrupt) {
        alarms.push({
          type: "abrupt_change",
          severity: "medium",
          message: "Abrupt change detected (>20%)",
          metadata: { previous: input.previous }
        });
      }
    }

    if (input.actionsWithoutImprovementCount >= 3) {
      alarms.push({
        type: "no_improvement",
        severity: "medium",
        message: "Actuator active without observable improvement",
        metadata: { actionsWithoutImprovementCount: input.actionsWithoutImprovementCount }
      });
    }

    return { actions, alarms };
  }

  private hasAbruptChange(
    previous: { temperature: number; humidity: number; co2: number; pm25: number },
    current: { temperature: number; humidity: number; co2: number; pm25: number }
  ): boolean {
    const hasChange = (prev: number, curr: number): boolean => {
      if (prev === 0) {
        return false;
      }

      return Math.abs((curr - prev) / prev) > 0.2;
    };

    return (
      hasChange(previous.temperature, current.temperature) ||
      hasChange(previous.humidity, current.humidity) ||
      hasChange(previous.co2, current.co2) ||
      hasChange(previous.pm25, current.pm25)
    );
  }
}
