import { RoomSetupModel, RoomSetupDerivedModel } from "../database/models";

export class ConfigurationRepository {
  async getRoomConfig(roomId: string): Promise<{ setup: RoomSetupModel | null; derived: RoomSetupDerivedModel | null }> {
    const [setup, derived] = await Promise.all([
      RoomSetupModel.findOne({ where: { roomId } }),
      RoomSetupDerivedModel.findOne({ where: { roomId } })
    ]);

    return { setup, derived };
  }
}
