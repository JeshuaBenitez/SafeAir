import { EmulatorModel } from "../database/models";

export class EmulatorRepository {
  async findByExternalId(externalId: string): Promise<EmulatorModel | null> {
    return EmulatorModel.findOne({ where: { emulatorExternalId: externalId } });
  }

  async create(data: { roomId: string; emulatorExternalId: string; status?: "online" | "offline" }): Promise<EmulatorModel> {
    return EmulatorModel.create({
      roomId: data.roomId,
      emulatorExternalId: data.emulatorExternalId,
      status: data.status ?? "online"
    });
  }
}
