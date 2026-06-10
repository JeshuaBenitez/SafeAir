import { AppError } from "../../shared/errors/app-error";
import { env } from "../../shared/config/env";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";

export class EmulatorResolutionService {
  constructor(
    private readonly emulatorRepository: EmulatorRepository
  ) {}

  async resolveOrProvision(externalId: string): Promise<{ roomId: string; emulatorExternalId: string }> {
    const existing = await this.emulatorRepository.findByExternalId(externalId);
    if (existing) {
      if (!existing.roomId) {
        if (existing.status !== "online") {
          existing.status = "online";
          await existing.save();
        }

        throw new AppError("Emulator has no assigned room", 409, "EMULATOR_UNASSIGNED");
      }

      return { roomId: existing.roomId, emulatorExternalId: existing.emulatorExternalId };
    }

    if (env.emulatorMissingStrategy === "reject") {
      throw new AppError("Unknown emulator", 404, "EMULATOR_NOT_FOUND");
    }

    try {
      await this.emulatorRepository.create({ roomId: null, emulatorExternalId: externalId, status: "online" });
    } catch {
      const raceWinner = await this.emulatorRepository.findByExternalId(externalId);
      if (raceWinner?.roomId) {
        return { roomId: raceWinner.roomId, emulatorExternalId: raceWinner.emulatorExternalId };
      }
    }

    throw new AppError("Emulator registered as free but has no assigned room", 409, "EMULATOR_UNASSIGNED");
  }
}
