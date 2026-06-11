import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { DeviceStateRepository } from "../../infrastructure/repositories/device-state.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { ReportDateRangeService } from "./report-date-range.service";

type ActuatorType = "minisplit" | "purifier" | "extractor";

export class MetricsQueryService {
  constructor(
    private readonly cycleRepository: CycleRepository,
    private readonly deviceActionRepository: DeviceActionRepository,
    private readonly deviceStateRepository: DeviceStateRepository,
    private readonly roomRepository: RoomRepository
  ) {}


  async current(roomId: string): Promise<unknown> {
    return this.cycleRepository.getLatestMeasurement(roomId);
  }

  async history(roomId: string, from?: string, to?: string): Promise<unknown[]> {
    const { startAt, endExclusive } = ReportDateRangeService.normalize(from, to);
    const measurements = await this.cycleRepository.getHistory(roomId, startAt, endExclusive);
    const devices = await this.roomRepository.listDevices(roomId);

    return measurements.map((m) => {
      const activeDevices = devices.filter((d) => new Date(d.createdAt).getTime() <= new Date(m.measuredAt).getTime());
      
      const minisplitCount = activeDevices.filter((d) => d.type === "minisplit").length;
      const purifierCount = activeDevices.filter((d) => d.type === "purifier").length;
      const extractorCount = activeDevices.filter((d) => d.type === "extractor").length;

      return {
        id: m.id,
        roomId: m.roomId,
        cycleId: m.cycleId,
        temperature: m.temperature,
        humidity: m.humidity,
        co2: m.co2,
        pm25: m.pm25,
        measuredAt: m.measuredAt,
        receivedAt: m.receivedAt,
        source: m.source,
        minisplitCount,
        purifierCount,
        extractorCount
      };
    });
  }


  async actuatorState(roomId: string): Promise<unknown> {
    const latestMeasurement = await this.cycleRepository.getLatestMeasurement(roomId);
    const latestActions = await this.deviceActionRepository.latestByRoomAndType(roomId);
    const reportedStates = await this.deviceStateRepository.latestByRoom(roomId);
    const unitCounts = await this.getUnitCounts(roomId);

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

    const getActionSetpoint = (action?: { action?: string; reason?: string | null }): number | null => {
      if (action?.action !== "set_temperature") {
        return null;
      }

      const match = String(action.reason ?? "").match(/value=([0-9]+(?:\.[0-9]+)?)/);
      if (!match) {
        return null;
      }

      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const buildUnits = (type: ActuatorType) => {
      const statesByIndex = new Map((reportedStates[type] ?? []).map((state) => [state.deviceIndex, state]));
      const actions = latestActions[type] ?? [];
      const count = unitCounts[type];

      return Array.from({ length: count }, (_, index) => {
        const deviceIndex = index + 1;
        const reported = statesByIndex.get(deviceIndex);
        const deviceActions = actions.filter((item) => item.deviceIndex === deviceIndex);
        const action = deviceActions[0];
        const stateAction = deviceActions.find((item) => mapState(item.action) !== null);
        const setpointAction = deviceActions.find((item) => getActionSetpoint(item) !== null);
        const reportedAt = reported?.reportedAt ? new Date(reported.reportedAt).getTime() : 0;
        const stateActionAt = stateAction?.executedAt ? new Date(stateAction.executedAt).getTime() : 0;
        const setpointActionAt = setpointAction?.executedAt ? new Date(setpointAction.executedAt).getTime() : 0;
        const actionState = mapState(stateAction?.action);
        const actionSetpoint = getActionSetpoint(setpointAction);
        const mqttConfirmsAction = Boolean(reported && stateAction && actionState === reported.isOn);
        const useActionState = Boolean(stateAction && actionState !== null && stateActionAt >= reportedAt && !mqttConfirmsAction);
        const useActionSetpoint = Boolean(type === "minisplit" && actionSetpoint !== null && setpointActionAt >= reportedAt);

        return {
          deviceType: type,
          deviceIndex,
          label: `${this.actuatorLabel(type)} Unidad ${deviceIndex}`,
          isOn: useActionState ? actionState : reported?.isOn ?? actionState,
          lastAction: action?.action ?? null,
          mode: reported?.mode ?? null,
          targetTemperature: useActionSetpoint ? actionSetpoint : reported?.targetTemperature ?? actionSetpoint,
          ambientTemperature: reported?.ambientTemperature ?? null,
          ambientHumidity: reported?.ambientHumidity ?? null,
          level: action?.level ?? null,
          updatedAt: useActionState
            ? stateAction?.executedAt ?? null
            : useActionSetpoint
              ? setpointAction?.executedAt ?? null
              : reported?.reportedAt ?? action?.executedAt ?? null,
          source: useActionState || useActionSetpoint ? "manual" : reported?.source ?? (action ? "manual" : null)
        };
      });
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
        minisplit: buildUnits("minisplit"),
        purifier: buildUnits("purifier"),
        extractor: buildUnits("extractor")
      }
    };
  }

  private async getUnitCounts(roomId: string): Promise<Record<ActuatorType, number>> {
    const room = await this.roomRepository.findById(roomId);
    const setup = room?.get("setup") as {
      minisplitCount?: number;
      purifierCount?: number;
      extractorCount?: number;
    } | null;

    if (setup) {
      return {
        minisplit: Number(setup.minisplitCount ?? 0),
        purifier: Number(setup.purifierCount ?? 0),
        extractor: Number(setup.extractorCount ?? 0)
      };
    }

    const devices = await this.roomRepository.listDevices(roomId);
    return {
      minisplit: devices.filter((device) => device.type === "minisplit").length,
      purifier: devices.filter((device) => device.type === "purifier").length,
      extractor: devices.filter((device) => device.type === "extractor").length
    };
  }

  private actuatorLabel(type: ActuatorType): string {
    switch (type) {
      case "minisplit":
        return "Minisplit";
      case "purifier":
        return "Purificador";
      case "extractor":
        return "Extractor";
    }
  }
}
