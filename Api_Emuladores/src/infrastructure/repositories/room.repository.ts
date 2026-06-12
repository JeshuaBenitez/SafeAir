import { AlarmModel, DeviceModel, InstanceModel, RoomModel, RoomSetupDerivedModel, RoomSetupModel } from "../database/models";
import type { RoomSetupDerived, RoomSetupInput } from "../../domain/types/room.types";

export class RoomRepository {
  async create(data: { instanceId: string; name: string }): Promise<RoomModel> {
    return RoomModel.create({ instanceId: data.instanceId, name: data.name });
  }

  async findAll(options?: { userId?: string }): Promise<RoomModel[]> {
    const includes: any[] = [
      { model: RoomSetupModel, as: "setup", required: false },
      { model: RoomSetupDerivedModel, as: "derivedSetup", required: false },
      { model: DeviceModel, as: "devices", required: false }
    ];

    includes.push({
      model: InstanceModel,
      as: "instance",
      where: options?.userId ? { userId: options.userId } : undefined,
      attributes: ["id", "userId", "name"],
      required: Boolean(options?.userId)
    });

    const { EmulatorModel } = await import("../database/models");
    includes.push({ model: EmulatorModel, as: "emulator", required: false });

    return RoomModel.findAll({
      include: includes,
      order: [["createdAt", "ASC"]]
    });
  }

  async findById(roomId: string, userId?: string): Promise<RoomModel | null> {
    const includes: any[] = [
      { model: RoomSetupModel, as: "setup" },
      { model: RoomSetupDerivedModel, as: "derivedSetup" },
      { model: DeviceModel, as: "devices" }
    ];

    if (userId) {
      includes.push({
        model: InstanceModel,
        as: "instance",
        where: { userId },
        attributes: ["id", "userId"],
        required: true
      });
    }

    return RoomModel.findByPk(roomId, {
      include: includes
    });
  }

  async upsertSetup(roomId: string, setup: RoomSetupInput, derived: RoomSetupDerived): Promise<void> {
    await RoomSetupModel.upsert({ roomId, ...setup });
    await RoomSetupDerivedModel.upsert({ roomId, ...derived });
  }

  async listDevices(roomId: string): Promise<DeviceModel[]> {
    return DeviceModel.findAll({ where: { roomId }, order: [["createdAt", "ASC"]] });
  }

  async createDevice(data: { roomId: string; type: "minisplit" | "purifier" | "extractor"; label: string }): Promise<DeviceModel> {
    return DeviceModel.create({ roomId: data.roomId, type: data.type, label: data.label });
  }

  async createInvalidConfigurationAlarm(roomId: string, cycleId: string, message: string): Promise<AlarmModel> {
    return AlarmModel.create({
      roomId,
      cycleId,
      type: "invalid_configuration",
      severity: "high",
      message,
      metadata: {}
    });
  }

  async delete(roomId: string): Promise<void> {
    const {
      DeviceModel,
      RoomSetupDerivedModel,
      RoomSetupModel,
      RoomModel
    } = await import("../database/models");

    const { EmulatorRepository } = await import("./emulator.repository");
    const emulatorRepository = new EmulatorRepository();

    await emulatorRepository.releaseRoom(roomId);
    await DeviceModel.destroy({ where: { roomId } });
    await RoomSetupDerivedModel.destroy({ where: { roomId } });
    await RoomSetupModel.destroy({ where: { roomId } });
    await RoomModel.destroy({ where: { id: roomId } });
  }
}
