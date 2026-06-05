import { DeviceActionModel } from "../database/models";

export class DeviceActionRepository {
  async create(data: {
    roomId: string;
    cycleId: string;
    deviceType: "minisplit" | "purifier" | "extractor";
    action: string;
    reason: string;
    level?: "low" | "medium" | "high";
    requestedBy?: "rule-engine" | "manual";
  }): Promise<DeviceActionModel> {
    return DeviceActionModel.create({
      ...data,
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

  async latestByRoomAndType(roomId: string): Promise<Partial<Record<"minisplit" | "purifier" | "extractor", DeviceActionModel>>> {
    const actions = await DeviceActionModel.findAll({ where: { roomId }, order: [["executedAt", "DESC"]], limit: 200 });
    const result: Partial<Record<"minisplit" | "purifier" | "extractor", DeviceActionModel>> = {};

    for (const action of actions) {
      if (!result[action.deviceType]) {
        result[action.deviceType] = action;
      }

      if (result.minisplit && result.purifier && result.extractor) {
        break;
      }
    }

    return result;
  }
}
