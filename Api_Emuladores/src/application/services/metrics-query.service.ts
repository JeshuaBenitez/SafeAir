import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";
import { DeviceActionRepository } from "../../infrastructure/repositories/device-action.repository";
import { DeviceStateRepository } from "../../infrastructure/repositories/device-state.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";

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
    const measurements = await this.cycleRepository.getHistory(roomId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
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

    const buildUnits = (type: ActuatorType) => {
      const statesByIndex = new Map((reportedStates[type] ?? []).map((state) => [state.deviceIndex, state]));
      const actionsByIndex = new Map((latestActions[type] ?? []).map((action) => [action.deviceIndex, action]));
      const count = unitCounts[type];

      return Array.from({ length: count }, (_, index) => {
        const deviceIndex = index + 1;
        const reported = statesByIndex.get(deviceIndex);
        const action = actionsByIndex.get(deviceIndex);
        const reportedAt = reported?.reportedAt ? new Date(reported.reportedAt).getTime() : 0;
        const actionAt = action?.executedAt ? new Date(action.executedAt).getTime() : 0;
        const actionState = mapState(action?.action);
        const mqttConfirmsAction = Boolean(reported && action && actionState === reported.isOn);
        const useActionState = Boolean(action && actionAt >= reportedAt && !mqttConfirmsAction);

        return {
          deviceType: type,
          deviceIndex,
          label: `${this.actuatorLabel(type)} Unidad ${deviceIndex}`,
          isOn: useActionState ? actionState : reported?.isOn ?? actionState,
          lastAction: action?.action ?? null,
          mode: reported?.mode ?? null,
          targetTemperature: reported?.targetTemperature ?? null,
          ambientTemperature: reported?.ambientTemperature ?? null,
          ambientHumidity: reported?.ambientHumidity ?? null,
          level: action?.level ?? null,
          updatedAt: useActionState ? action?.executedAt ?? null : reported?.reportedAt ?? action?.executedAt ?? null,
          source: useActionState ? "manual" : reported?.source ?? (action ? "manual" : null)
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
