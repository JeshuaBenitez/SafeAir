import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";

/**
 * Default grace period during which a recent manual actuator command
 * blocks automatic rule-engine actions for the same device.
 *
 * 60 seconds balances user control with operational responsiveness:
 * after 60s the rule engine may re-engage if conditions still warrant it.
 */
export const MANUAL_OVERRIDE_GRACE_PERIOD_MS = 60_000;

/**
 * ManualOverridePolicy
 *
 * Single-responsibility abstraction that decides whether an automatic
 * (rule-engine) actuator command is allowed to run, or whether it must
 * be suppressed because the user recently issued a manual command for
 * the same device.
 *
 * This keeps telemetry ingestion free of override logic and makes the
 * policy easy to test, swap, or extend (e.g. per-user cooldowns).
 */
export class ManualOverridePolicy {
  constructor(private readonly deviceActionRepository: DeviceActionRepository) {}

  /**
   * Returns true if a manual command for the given device was issued
   * within the grace period. The caller should NOT execute the
   * automatic action when this returns true.
   */
  async isBlocked(input: {
    roomId: string;
    deviceType: "minisplit" | "purifier" | "extractor";
    deviceIndex: number;
    now?: Date;
  }): Promise<boolean> {
    return this.deviceActionRepository.hasRecentManualOverride({
      roomId: input.roomId,
      deviceType: input.deviceType,
      deviceIndex: input.deviceIndex,
      sinceMs: MANUAL_OVERRIDE_GRACE_PERIOD_MS
    });
  }
}
