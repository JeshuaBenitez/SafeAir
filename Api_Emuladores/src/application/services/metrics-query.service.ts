import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { DeviceStateRepository } from "../../infrastructure/repositories/device-state.repository";

export class MetricsQueryService {
  constructor(
    private readonly cycleRepository: CycleRepository,
    private readonly deviceActionRepository: DeviceActionRepository,
    private readonly deviceStateRepository: DeviceStateRepository
  ) {}

  async current(roomId: string): Promise<unknown> {
    return this.cycleRepository.getLatestMeasurement(roomId);
  }

  async history(roomId: string, from?: string, to?: string): Promise<unknown[]> {
    return this.cycleRepository.getHistory(roomId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  async actuatorState(roomId: string): Promise<unknown> {
    const latestMeasurement = await this.cycleRepository.getLatestMeasurement(roomId);
    const latestActions = await this.deviceActionRepository.latestByRoomAndType(roomId);
    const reportedStates = await this.deviceStateRepository.latestByRoom(roomId);

    const mapState = (actionName?: string): boolean | null => {
      if (!actionName) {
        return null;
      }

      if (actionName.endsWith("_on")) {
        return true;
      }

      if (actionName.endsWith("_off")) {
        return false;
      }

      return null;
    };

    return {
      roomId,
      measuredAt: latestMeasurement?.measuredAt ?? null,
      receivedAt: latestMeasurement?.receivedAt ?? null,
      metrics: latestMeasurement
        ? {
            temperature: latestMeasurement.temperature,
            humidity: latestMeasurement.humidity,
            co2: latestMeasurement.co2,
            pm25: latestMeasurement.pm25
          }
        : null,
      actuators: {
        minisplit: {
          isOn: reportedStates.minisplit?.isOn ?? mapState(latestActions.minisplit?.action),
          lastAction: latestActions.minisplit?.action ?? null,
          mode: reportedStates.minisplit?.mode ?? null,
          targetTemperature: reportedStates.minisplit?.targetTemperature ?? null,
          ambientTemperature: reportedStates.minisplit?.ambientTemperature ?? null,
          ambientHumidity: reportedStates.minisplit?.ambientHumidity ?? null,
          level: latestActions.minisplit?.level ?? null,
          updatedAt: reportedStates.minisplit?.reportedAt ?? latestActions.minisplit?.executedAt ?? null,
          source: reportedStates.minisplit?.source ?? null
        },
        purifier: {
          isOn: reportedStates.purifier?.isOn ?? mapState(latestActions.purifier?.action),
          lastAction: latestActions.purifier?.action ?? null,
          mode: reportedStates.purifier?.mode ?? null,
          targetTemperature: reportedStates.purifier?.targetTemperature ?? null,
          ambientTemperature: reportedStates.purifier?.ambientTemperature ?? null,
          ambientHumidity: reportedStates.purifier?.ambientHumidity ?? null,
          level: latestActions.purifier?.level ?? null,
          updatedAt: reportedStates.purifier?.reportedAt ?? latestActions.purifier?.executedAt ?? null,
          source: reportedStates.purifier?.source ?? null
        },
        extractor: {
          isOn: reportedStates.extractor?.isOn ?? mapState(latestActions.extractor?.action),
          lastAction: latestActions.extractor?.action ?? null,
          mode: reportedStates.extractor?.mode ?? null,
          targetTemperature: reportedStates.extractor?.targetTemperature ?? null,
          ambientTemperature: reportedStates.extractor?.ambientTemperature ?? null,
          ambientHumidity: reportedStates.extractor?.ambientHumidity ?? null,
          level: latestActions.extractor?.level ?? null,
          updatedAt: reportedStates.extractor?.reportedAt ?? latestActions.extractor?.executedAt ?? null,
          source: reportedStates.extractor?.source ?? null
        }
      }
    };
  }
}
