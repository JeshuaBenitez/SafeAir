import type { Request, Response } from "express";
import { container } from "../../application/container";

export class InstanceController {
  async create(req: Request, res: Response): Promise<void> {
    const result = await container.instanceService.create(req.body);
    res.status(201).json(result);
  }

  async list(_req: Request, res: Response): Promise<void> {
    const result = await container.instanceService.list();
    res.status(200).json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const result = await container.instanceService.getById(String(req.params.id));
    res.status(200).json(result);
  }
}

