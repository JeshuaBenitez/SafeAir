import { DeviceActionModel } from "../database/models";

type ActuatorType = "minisplit" | "purifier" | "extractor";

export class DeviceActionRepository {
  async create(data: {
    roomId: string;
    cycleId: string;
    deviceType: ActuatorType;
    deviceIndex?: number;
    action: string;
    reason: string;
    level?: "low" | "medium" | "high";
    requestedBy?: "rule-engine" | "manual";
  }): Promise<DeviceActionModel> {
    return DeviceActionModel.create({
      ...data,
      deviceIndex: data.deviceIndex ?? 1,
      level: data.level ?? null,
      requestedBy: data.requestedBy ?? "rule-engine",
      executedAt: new Date()
    });
  }

  async historyByRoom(roomId: string): Promise<DeviceActionModel[]> {
    return DeviceActionModel.findAll({ where: { roomId }, order: [["executedAt", "DESC"]], limit: 500 });
  }

  async countRecentActiveWithoutImprovement(roomId: string, cycles: number): Promise<number> {
    const actions = await DeviceActionModel.findAll({ where: { roomId }, order: [["createdAt", "DESC"]], limit: cycles });
    return actions.length;
  }

  async latestByRoomAndType(roomId: string): Promise<Partial<Record<ActuatorType, DeviceActionModel[]>>> {
    const actions = await DeviceActionModel.findAll({ where: { roomId }, order: [["executedAt", "DESC"]], limit: 200 });
    const result: Partial<Record<ActuatorType, DeviceActionModel[]>> = {};
    const seen = new Set<string>();

    for (const action of actions) {
      const key = `${action.deviceType}:${action.deviceIndex}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      if (!result[action.deviceType]) {
        result[action.deviceType] = [];
      }
      result[action.deviceType]?.push(action);
    }

    return result;
  }
}
