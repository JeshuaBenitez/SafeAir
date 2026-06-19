import { Op } from "sequelize";
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

    for (const action of actions) {
      if (!result[action.deviceType]) {
        result[action.deviceType] = [];
      }
      result[action.deviceType]?.push(action);
    }

    return result;
  }

  async hasRecentManualOverride(input: {
    roomId: string;
    deviceType: ActuatorType;
    deviceIndex: number;
    sinceMs: number;
  }): Promise<boolean> {
    const cutoff = new Date(Date.now() - input.sinceMs);
    const manualActions = await DeviceActionModel.findAll({
      where: {
        roomId: input.roomId,
        deviceType: input.deviceType,
        deviceIndex: input.deviceIndex,
        requestedBy: "manual",
        executedAt: {
          [Op.gte]: cutoff
        }
      },
      order: [["executedAt", "DESC"]],
      limit: 1
    });

    return manualActions.length > 0;
  }
}
