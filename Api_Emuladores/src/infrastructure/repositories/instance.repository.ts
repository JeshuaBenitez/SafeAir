import { fn, col } from "sequelize";
import { InstanceModel, RoomModel, RoomSetupDerivedModel } from "../database/models";

export class InstanceRepository {
  async create(data: { name: string; description?: string; userId?: string | null }): Promise<InstanceModel> {
    return InstanceModel.create({ name: data.name, description: data.description ?? null, userId: data.userId ?? null });
  }

  async findAll(userId?: string): Promise<InstanceModel[]> {
    return InstanceModel.findAll({
      where: userId ? { userId } : undefined,
      order: [["createdAt", "DESC"]]
    });
  }

  async findById(id: string, userId?: string): Promise<InstanceModel | null> {
    const { RoomSetupModel, DeviceModel } = await import("../database/models");
    return InstanceModel.findOne({
      where: userId ? { id, userId } : { id },
      include: [
        {
          model: RoomModel,
          as: "rooms",
          include: [
            { model: RoomSetupModel, as: "setup" },
            { model: RoomSetupDerivedModel, as: "derivedSetup" },
            { model: DeviceModel, as: "devices" }
          ]
        }
      ]
    });
  }


  async findFirstActive(userId?: string): Promise<InstanceModel | null> {
    return InstanceModel.findOne({
      where: userId ? { isActive: true, userId } : { isActive: true },
      order: [["createdAt", "ASC"]]
    });
  }

  async countRooms(instanceId: string): Promise<number> {
    return RoomModel.count({ where: { instanceId } });
  }

  async totalArea(instanceId: string): Promise<number> {
    const result = await RoomSetupDerivedModel.findOne({
      attributes: [[fn("SUM", col("roomArea")), "totalArea"]],
      include: [{ model: RoomModel, as: "room", where: { instanceId }, attributes: [] }],
      raw: true
    });

    const value = result?.["totalArea" as keyof typeof result];
    return Number(value ?? 0);
  }
}
