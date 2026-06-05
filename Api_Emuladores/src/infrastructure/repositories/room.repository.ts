import { AlarmModel, DeviceModel, RoomModel, RoomSetupDerivedModel, RoomSetupModel } from "../database/models";
import type { RoomSetupDerived, RoomSetupInput } from "../../domain/types/room.types";

export class RoomRepository {
  async create(data: { instanceId: string; name: string }): Promise<RoomModel> {
    return RoomModel.create({ instanceId: data.instanceId, name: data.name });
  }

  async findById(roomId: string): Promise<RoomModel | null> {
    return RoomModel.findByPk(roomId, {
      include: [
        { model: RoomSetupModel, as: "setup" },
        { model: RoomSetupDerivedModel, as: "derivedSetup" },
        { model: DeviceModel, as: "devices" }
      ]
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
      DeviceStateModel,
      AlarmModel,
      DeviceActionModel,
      CycleMeasurementModel,
      CycleModel,
      DeviceModel,
      EmulatorModel,
      RoomSetupDerivedModel,
      RoomSetupModel,
      RoomModel
    } = await import("../database/models");

    await DeviceStateModel.destroy({ where: { roomId } });
    await AlarmModel.destroy({ where: { roomId } });
    await DeviceActionModel.destroy({ where: { roomId } });
    await CycleMeasurementModel.destroy({ where: { roomId } });
    await CycleModel.destroy({ where: { roomId } });
    await DeviceModel.destroy({ where: { roomId } });
    await EmulatorModel.destroy({ where: { roomId } });
    await RoomSetupDerivedModel.destroy({ where: { roomId } });
    await RoomSetupModel.destroy({ where: { roomId } });
    await RoomModel.destroy({ where: { id: roomId } });
  }
}

