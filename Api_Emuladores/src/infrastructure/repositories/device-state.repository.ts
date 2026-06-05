import { DeviceStateModel } from "../database/models";

export class DeviceStateRepository {
  async upsertLatest(data: {
    roomId: string;
    emulatorId: string;
    deviceType: "minisplit" | "purifier" | "extractor";
    isOn: boolean;
    mode?: string;
    targetTemperature?: number;
    ambientTemperature?: number;
    ambientHumidity?: number;
    reportedAt: Date;
    source: "mqtt" | "rest";
    payload: Record<string, unknown>;
  }): Promise<void> {
    const existing = await DeviceStateModel.findOne({ where: { roomId: data.roomId, deviceType: data.deviceType } });

    if (!existing) {
      await DeviceStateModel.create({
        roomId: data.roomId,
        emulatorId: data.emulatorId,
        deviceType: data.deviceType,
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

  async latestByRoom(roomId: string): Promise<Partial<Record<"minisplit" | "purifier" | "extractor", DeviceStateModel>>> {
    const rows = await DeviceStateModel.findAll({ where: { roomId }, order: [["reportedAt", "DESC"]], limit: 50 });
    const result: Partial<Record<"minisplit" | "purifier" | "extractor", DeviceStateModel>> = {};

    for (const row of rows) {
      if (!result[row.deviceType]) {
        result[row.deviceType] = row;
      }

      if (result.minisplit && result.purifier && result.extractor) {
        break;
      }
    }

    return result;
  }
}
