import type { Request, Response } from "express";
import { container } from "../../application/container";

export class CycleController {
  async start(req: Request, res: Response): Promise<void> {
    const result = await container.cycleService.start(String(req.params.id));
    res.status(201).json(result);
  }

  async close(req: Request, res: Response): Promise<void> {
    const result = await container.cycleService.close(String(req.params.id));
    res.status(200).json(result);
  }

  async list(req: Request, res: Response): Promise<void> {
    const result = await container.cycleService.list(String(req.params.id));
    res.status(200).json(result);
  }
}

