import type { Request, Response } from "express";
import { container } from "../../application/container";

export class AlarmController {
  async list(req: Request, res: Response): Promise<void> {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const result = await container.alarmService.listByRoom(String(req.params.id), from, to);
    res.status(200).json(result);
  }

  async active(req: Request, res: Response): Promise<void> {
    const result = await container.alarmService.listActiveByRoom(String(req.params.id));
    res.status(200).json(result);
  }
}

