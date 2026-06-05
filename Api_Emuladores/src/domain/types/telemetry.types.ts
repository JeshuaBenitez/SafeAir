export interface TelemetryInput {
  emulatorId: string;
  roomId?: string;
  temperature: number;
  humidity: number;
  co2: number;
  pm25: number;
  timestamp?: string;
}

export interface RuleActionDecision {
  deviceType: "minisplit" | "purifier" | "extractor";
  action: string;
  level?: "low" | "medium" | "high";
  reason: string;
}

export interface RuleAlarmDecision {
  type: "critical_persistence" | "abrupt_change" | "no_improvement" | "invalid_configuration";
  severity: "low" | "medium" | "high";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  actions: RuleActionDecision[];
  alarms: RuleAlarmDecision[];
}
