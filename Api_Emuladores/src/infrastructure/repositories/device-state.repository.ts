import { DeviceStateModel } from "../database/models";

type ActuatorType = "minisplit" | "purifier" | "extractor";

export class DeviceStateRepository {
  async upsertLatest(data: {
    roomId: string;
    emulatorId: string;
    deviceType: ActuatorType;
    deviceIndex: number;
    isOn: boolean;
    mode?: string;
    targetTemperature?: number;
    ambientTemperature?: number;
    ambientHumidity?: number;
    reportedAt: Date;
    source: "mqtt" | "rest";
    payload: Record<string, unknown>;
  }): Promise<void> {
    const existing = await DeviceStateModel.findOne({
      where: { roomId: data.roomId, deviceType: data.deviceType, deviceIndex: data.deviceIndex }
    });

    if (!existing) {
      await DeviceStateModel.create({
        roomId: data.roomId,
        emulatorId: data.emulatorId,
        deviceType: data.deviceType,
        deviceIndex: data.deviceIndex,
        isOn: data.isOn,
        mode: data.mode ?? null,
        targetTemperature: data.targetTemperature ?? null,
        ambientTemperature: data.ambientTemperature ?? null,
        ambientHumidity: data.ambientHumidity ?? null,
        reportedAt: data.reportedAt,
        source: data.source,
        payload: data.payload
      });
      return;
    }

    existing.emulatorId = data.emulatorId;
    existing.deviceIndex = data.deviceIndex;
    existing.isOn = data.isOn;
    existing.mode = data.mode ?? null;
    existing.targetTemperature = data.targetTemperature ?? null;
    existing.ambientTemperature = data.ambientTemperature ?? null;
    existing.ambientHumidity = data.ambientHumidity ?? null;
    existing.reportedAt = data.reportedAt;
    existing.source = data.source;
    existing.payload = data.payload;
    await existing.save();
  }

  async latestByRoom(roomId: string): Promise<Partial<Record<ActuatorType, DeviceStateModel[]>>> {
    const rows = await DeviceStateModel.findAll({ where: { roomId }, order: [["reportedAt", "DESC"]], limit: 50 });
    const result: Partial<Record<ActuatorType, DeviceStateModel[]>> = {};
    const seen = new Set<string>();

    for (const row of rows) {
      const key = `${row.deviceType}:${row.deviceIndex}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      if (!result[row.deviceType]) {
        result[row.deviceType] = [];
      }
      result[row.deviceType]?.push(row);
    }

    return result;
  }
}
