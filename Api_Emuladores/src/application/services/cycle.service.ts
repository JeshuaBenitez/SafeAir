import { AppError } from "../../shared/errors/app-error";
import { CycleRepository } from "../../infrastructure/repositories/cycle.repository";

export class CycleService {
  constructor(private readonly cycleRepository: CycleRepository) {}

  async start(roomId: string): Promise<{ id: string; cycleNumber: number }> {
    const cycle = await this.cycleRepository.openOrCreate(roomId);
    return { id: cycle.id, cycleNumber: cycle.cycleNumber };
  }

  async close(roomId: string): Promise<{ id: string; cycleNumber: number }> {
    const cycle = await this.cycleRepository.close(roomId);
    if (!cycle) {
      throw new AppError("Open cycle not found", 404, "CYCLE_NOT_FOUND");
    }

    return { id: cycle.id, cycleNumber: cycle.cycleNumber };
  }

  async list(roomId: string): Promise<unknown[]> {
    return this.cycleRepository.listByRoom(roomId);
  }

  async openOrCreate(roomId: string): Promise<{ id: string; cycleNumber: number }> {
    const cycle = await this.cycleRepository.openOrCreate(roomId);
    return { id: cycle.id, cycleNumber: cycle.cycleNumber };
  }
}
