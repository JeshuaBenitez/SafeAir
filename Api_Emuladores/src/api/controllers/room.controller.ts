import type { Request, Response } from "express";
import { container } from "../../application/container";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { AppError } from "../../shared/errors/app-error";

export class RoomController {
  private readonly userRepository = new UserRepository();

  async list(req: Request, res: Response): Promise<void> {
    const userId = await this.resolveRoomScope(req);
    const result = await container.roomService.list(userId);
    res.status(200).json({ count: result.length, rooms: result });
  }

  async create(req: Request, res: Response): Promise<void> {
    const ownerUserId = await this.resolveOwnerForCreate(req);
    const result = await container.roomService.create(req.body, ownerUserId);
    res.status(201).json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.getById(String(req.params.id), this.accessUserId(req));
    res.status(200).json(result);
  }

  async update(req: Request, res: Response): Promise<void> {
    await container.roomService.update(String(req.params.id), req.body, this.accessUserId(req));
    res.status(204).send();
  }

  async getSetup(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.getSetup(String(req.params.id), this.requireUserId(req));
    res.status(200).json(result);
  }

  async upsertSetup(req: Request, res: Response): Promise<void> {
    await container.roomService.upsertSetup(String(req.params.id), req.body, this.requireUserId(req));
    res.status(204).send();
  }

  async listDevices(req: Request, res: Response): Promise<void> {
    await container.roomService.getById(String(req.params.id), this.accessUserId(req));
    const result = await container.roomService.listDevices(String(req.params.id), undefined);
    res.status(200).json(result);
  }

  async createDevice(req: Request, res: Response): Promise<void> {
    const result = await container.roomService.createDevice({ roomId: String(req.params.id), ...req.body }, this.requireUserId(req));
    res.status(201).json(result);
  }

  async actionHistory(req: Request, res: Response): Promise<void> {
    await container.roomService.getById(String(req.params.id), this.accessUserId(req));
    const result = await container.deviceActionService.history(String(req.params.id));
    res.status(200).json(result);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await container.roomService.delete(String(req.params.id), this.accessUserId(req));
    res.status(204).send();
  }

  private accessUserId(req: Request): string | undefined {
    const userId = this.requireUserId(req);
    return req.auth?.role === "admin" ? undefined : userId;
  }

  private async resolveRoomScope(req: Request): Promise<string | undefined> {
    const userId = this.requireUserId(req);
    if (req.auth?.role !== "admin") {
      return userId;
    }

    const userQuery = typeof req.query.user === "string" ? req.query.user : undefined;
    if (!userQuery) {
      return undefined;
    }

    const user = userQuery.includes("@")
      ? await this.userRepository.findByEmail(userQuery)
      : await this.userRepository.findById(userQuery);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user.id;
  }

  private async resolveOwnerForCreate(req: Request): Promise<string> {
    const userId = this.requireUserId(req);
    if (req.auth?.role !== "admin") {
      return userId;
    }

    const requested = req.body.userId ?? req.body.userEmail;
    if (!requested) {
      return userId;
    }

    const user = String(requested).includes("@")
      ? await this.userRepository.findByEmail(String(requested))
      : await this.userRepository.findById(String(requested));
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user.id;
  }

  private requireUserId(req: Request): string {
    if (!req.auth?.sub) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return req.auth.sub;
  }
}
