import type { Request, Response } from "express";
import { container } from "../../application/container";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { AppError } from "../../shared/errors/app-error";

export class ConfigurationController {
  private readonly roomRepository = new RoomRepository();

  /**
   * POST /api/v1/rooms/:id/config
   * Publishes the room configuration to the assigned emulator via MQTT.
   * The method reads the room setup from DB and publishes it automatically.
   * 
   * The payload (req.body) is ignored because the configuration is built
   * from the room's setup stored in PostgreSQL (via upsertSetup).
   * This ensures consistency: the same config saved in the DB is sent to the emulator.
   */
  async publish(req: Request, res: Response): Promise<void> {
    const roomId = String(req.params.id);
    await this.ensureRoomAccess(roomId, req.auth?.sub);
    await container.configurationService.publishRoomConfig(roomId);
    res.status(202).json({ published: true });
  }

  async getByRoom(req: Request, res: Response): Promise<void> {
    const roomId = String(req.params.id);
    await this.ensureRoomAccess(roomId, req.auth?.sub);
    const result = await container.configurationService.getRoomConfig(roomId);
    res.status(200).json(result);
  }

  private async ensureRoomAccess(roomId: string, userId: string | undefined): Promise<void> {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }
  }
}
