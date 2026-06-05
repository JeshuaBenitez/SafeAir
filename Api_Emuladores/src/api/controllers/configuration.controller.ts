import type { Request, Response } from "express";
import { container } from "../../application/container";

export class ConfigurationController {
  async publish(req: Request, res: Response): Promise<void> {
    await container.configurationService.publishRoomConfig(String(req.params.id), req.body);
    res.status(202).json({ published: true });
  }

  async getByRoom(req: Request, res: Response): Promise<void> {
    const result = await container.configurationService.getRoomConfig(String(req.params.id));
    res.status(200).json(result);
  }
}

