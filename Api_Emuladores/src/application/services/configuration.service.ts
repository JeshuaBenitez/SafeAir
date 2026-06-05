import { AppError } from "../../shared/errors/app-error";
import { ConfigurationRepository } from "../../infrastructure/repositories/configuration.repository";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { emulatorConfigTopic } from "../../infrastructure/mqtt/topics";

export class ConfigurationService {
  constructor(
    private readonly configurationRepository: ConfigurationRepository,
    private readonly emulatorRepository: EmulatorRepository
  ) {}

  async getRoomConfig(roomId: string): Promise<unknown> {
    return this.configurationRepository.getRoomConfig(roomId);
  }

  async publishRoomConfig(roomId: string, payload: Record<string, unknown>): Promise<void> {
    const emulator = await this.emulatorRepository.findByExternalId(payload.emulatorId as string);

    if (!emulator || emulator.roomId !== roomId) {
      throw new AppError("Emulator not found for room", 404, "EMULATOR_NOT_FOUND");
    }

    await mqttGateway.publish(emulatorConfigTopic(emulator.emulatorExternalId), {
      roomId,
      ...payload,
      sentAt: new Date().toISOString()
    });
  }
}
