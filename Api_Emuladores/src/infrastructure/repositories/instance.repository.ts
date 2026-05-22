import { fn, col } from "sequelize";
import { InstanceModel, RoomModel, RoomSetupDerivedModel } from "../database/models";

export class InstanceRepository {
  async create(data: { name: string; description?: string }): Promise<InstanceModel> {
    return InstanceModel.create({ name: data.name, description: data.description ?? null });
  }

  async findAll(): Promise<InstanceModel[]> {
    return InstanceModel.findAll({ order: [["createdAt", "DESC"]] });
  }

  async findById(id: string): Promise<InstanceModel | null> {
    return InstanceModel.findByPk(id, {
      include: [{ model: RoomModel, as: "rooms", include: [{ model: RoomSetupDerivedModel, as: "derivedSetup" }] }]
    });
  }

  async findFirstActive(): Promise<InstanceModel | null> {
    return InstanceModel.findOne({ where: { isActive: true }, order: [["createdAt", "ASC"]] });
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
