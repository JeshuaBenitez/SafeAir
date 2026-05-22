import { AppError } from "../../shared/errors/app-error";
import { env } from "../../shared/config/env";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { InstanceRepository } from "../../infrastructure/repositories/instance.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";

export class EmulatorResolutionService {
  constructor(
    private readonly emulatorRepository: EmulatorRepository,
    private readonly instanceRepository: InstanceRepository,
    private readonly roomRepository: RoomRepository
  ) {}

  async resolveOrProvision(externalId: string): Promise<{ roomId: string; emulatorExternalId: string }> {
    const existing = await this.emulatorRepository.findByExternalId(externalId);
    if (existing) {
      return { roomId: existing.roomId, emulatorExternalId: existing.emulatorExternalId };
    }

    if (env.emulatorMissingStrategy === "reject") {
      throw new AppError("Unknown emulator", 404, "EMULATOR_NOT_FOUND");
    }

    const instance = (await this.instanceRepository.findFirstActive()) ??
      (await this.instanceRepository.create({
        name: env.emulatorAutoInstanceName,
        description: "Auto-provisioned for incoming emulator telemetry"
      }));

    const roomName = `${env.emulatorAutoRoomPrefix} ${externalId}`.trim();
    const room = await this.roomRepository.create({ instanceId: instance.id, name: roomName });

    if (env.emulatorAutoCreateDevices) {
      await this.roomRepository.createDevice({ roomId: room.id, type: "minisplit", label: `Minisplit ${externalId}` });
      await this.roomRepository.createDevice({ roomId: room.id, type: "purifier", label: `Purifier ${externalId}` });
      await this.roomRepository.createDevice({ roomId: room.id, type: "extractor", label: `Extractor ${externalId}` });
    }

    try {
      const emulator = await this.emulatorRepository.create({ roomId: room.id, emulatorExternalId: externalId, status: "online" });
      return { roomId: emulator.roomId, emulatorExternalId: emulator.emulatorExternalId };
    } catch {
      const raceWinner = await this.emulatorRepository.findByExternalId(externalId);
      if (raceWinner) {
        return { roomId: raceWinner.roomId, emulatorExternalId: raceWinner.emulatorExternalId };
      }

      throw new AppError("Unable to provision emulator", 500, "EMULATOR_PROVISIONING_FAILED");
    }
  }
}
