import { Op, UniqueConstraintError } from "sequelize";
import { CycleMeasurementModel, CycleModel } from "../database/models";

export class CycleRepository {
  async openOrCreate(roomId: string): Promise<CycleModel> {
    const open = await this.findOpen(roomId);
    if (open) {
      return open;
    }

    const latest = await CycleModel.findOne({ where: { roomId }, order: [["cycleNumber", "DESC"]] });

    try {
      return await CycleModel.create({
        roomId,
        cycleNumber: latest ? latest.cycleNumber + 1 : 1,
        status: "open",
        startedAt: new Date()
      });
    } catch (error: unknown) {
      if (error instanceof UniqueConstraintError) {
        const concurrentOpen = await this.findOpen(roomId);
        if (concurrentOpen) {
          return concurrentOpen;
        }
      }

      throw error;
    }
  }

  private async findOpen(roomId: string): Promise<CycleModel | null> {
    return CycleModel.findOne({
      where: { roomId, status: "open" },
      order: [["cycleNumber", "DESC"]]
    });
  }

  async close(roomId: string): Promise<CycleModel | null> {
    const open = await CycleModel.findOne({ where: { roomId, status: "open" }, order: [["cycleNumber", "DESC"]] });
    if (!open) {
      return null;
    }

    open.status = "closed";
    open.endedAt = new Date();
    await open.save();
    return open;
  }

  async listByRoom(roomId: string): Promise<CycleModel[]> {
    return CycleModel.findAll({ where: { roomId }, order: [["cycleNumber", "DESC"]] });
  }

  async createMeasurement(data: {
    roomId: string;
    cycleId: string;
    temperature: number;
    humidity: number;
    co2: number;
    pm25: number;
    measuredAt: Date;
    receivedAt: Date;
    source: "mqtt" | "rest";
  }): Promise<CycleMeasurementModel> {
    return CycleMeasurementModel.create(data);
  }

  async getPreviousMeasurement(roomId: string, beforeDate: Date): Promise<CycleMeasurementModel | null> {
    return CycleMeasurementModel.findOne({
      where: { roomId, measuredAt: { [Op.lt]: beforeDate } },
      order: [["measuredAt", "DESC"]]
    });
  }

  async getLatestMeasurement(roomId: string): Promise<CycleMeasurementModel | null> {
    return CycleMeasurementModel.findOne({ where: { roomId }, order: [["measuredAt", "DESC"]] });
  }

  async getHistory(roomId: string, from?: Date, endExclusive?: Date): Promise<CycleMeasurementModel[]> {
    const measuredAtRange: Record<symbol, Date> = {};
    if (from) {
      measuredAtRange[Op.gte] = from;
    }
    if (endExclusive) {
      measuredAtRange[Op.lt] = endExclusive;
    }

    return CycleMeasurementModel.findAll({
      where: {
        roomId,
        ...(from || endExclusive ? { measuredAt: measuredAtRange } : {})
      },
      order: [["measuredAt", "DESC"]],
      limit: 500
    });
  }

  async countCriticalInRecentCycles(roomId: string, cycles = 5): Promise<number> {
    const recent = await CycleMeasurementModel.findAll({
      where: { roomId },
      order: [["measuredAt", "DESC"]],
      limit: cycles
    });

    return recent.filter((row) => row.temperature > 30 || row.humidity > 85 || row.co2 > 2000 || row.pm25 > 35).length;
  }
}
