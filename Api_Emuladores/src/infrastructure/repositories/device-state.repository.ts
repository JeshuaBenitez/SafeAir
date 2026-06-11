import { UniqueConstraintError } from "sequelize";
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
      try {
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
      } catch (error: unknown) {
        if (!(error instanceof UniqueConstraintError)) {
          throw error;
        }
      }
    }

    const row = existing ?? await DeviceStateModel.findOne({
      where: { roomId: data.roomId, deviceType: data.deviceType, deviceIndex: data.deviceIndex }
    });
    if (!row) {
      throw new Error("Device state upsert failed after unique constraint retry");
    }

    row.emulatorId = data.emulatorId;
    row.deviceIndex = data.deviceIndex;
    row.isOn = data.isOn;
    row.mode = data.mode ?? null;
    row.targetTemperature = data.targetTemperature ?? null;
    row.ambientTemperature = data.ambientTemperature ?? null;
    row.ambientHumidity = data.ambientHumidity ?? null;
    row.reportedAt = data.reportedAt;
    row.source = data.source;
    row.payload = data.payload;
    await row.save();
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
