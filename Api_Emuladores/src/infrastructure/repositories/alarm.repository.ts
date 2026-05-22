import { Op } from "sequelize";
import { AlarmModel } from "../database/models";

export class AlarmRepository {
  async create(data: {
    roomId: string;
    cycleId: string;
    type: "critical_persistence" | "abrupt_change" | "no_improvement" | "invalid_configuration";
    severity: "low" | "medium" | "high";
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<AlarmModel> {
    return AlarmModel.create({
      ...data,
      metadata: data.metadata ?? {},
      isActive: true,
      triggeredAt: new Date()
    });
  }

  async listByRoom(roomId: string, from?: Date, to?: Date): Promise<AlarmModel[]> {
    const dateFilter =
      from || to
        ? {
            triggeredAt: {
              ...(from ? { [Op.gte]: from } : {}),
              ...(to ? { [Op.lte]: to } : {})
            }
          }
        : {};

    return AlarmModel.findAll({ where: { roomId, ...dateFilter }, order: [["triggeredAt", "DESC"]], limit: 500 });
  }

  async listActiveByRoom(roomId: string): Promise<AlarmModel[]> {
    return AlarmModel.findAll({ where: { roomId, isActive: true }, order: [["triggeredAt", "DESC"]] });
  }
}
