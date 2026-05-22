import type { Request, Response } from "express";
import { container } from "../../application/container";

export class RoomController {
  async create(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.create(req.body);
    res.status(201).json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.getById(String(req.params.id));
    res.status(200).json(result);
  }

  async update(req: Request, res: Response): Promise<void> {
    await container.roomService.update(String(req.params.id), req.body);
    res.status(204).send();
  }

  async getSetup(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.getSetup(String(req.params.id));
    res.status(200).json(result);
  }

  async upsertSetup(req: Request, res: Response): Promise<void> {
    await container.roomService.upsertSetup(String(req.params.id), req.body);
    res.status(204).send();
  }

  async listDevices(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.listDevices(String(req.params.id));
    res.status(200).json(result);
  }

  async createDevice(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.createDevice({ roomId: String(req.params.id), ...req.body });
    res.status(201).json(result);
  }

  async actionHistory(req: Request, res: Response): Promise<void> {
    const result = await container.deviceActionService.history(String(req.params.id));
    res.status(200).json(result);
  }
}

