import type { Request, Response } from "express";
import { container } from "../../application/container";
import { AppError } from "../../shared/errors/app-error";

export class InstanceController {
  async create(req: Request, res: Response): Promise<void> {
    const result = await container.instanceService.create(req.body, this.requireUserId(req));
    res.status(201).json(result);
  }

  async list(req: Request, res: Response): Promise<void> {
    const result = await container.instanceService.list(this.requireUserId(req));
    res.status(200).json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const result = await container.instanceService.getById(String(req.params.id), this.requireUserId(req));
    res.status(200).json(result);
  }

  private requireUserId(req: Request): string {
    if (!req.auth?.sub) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return req.auth.sub;
  }
}
