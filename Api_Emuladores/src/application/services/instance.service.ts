import { AppError } from "../../shared/errors/app-error";
import { InstanceRepository } from "../../infrastructure/repositories/instance.repository";

export class InstanceService {
  constructor(private readonly instanceRepository: InstanceRepository) {}

  async create(input: { name: string; description?: string }, userId: string): Promise<{ id: string }> {
    if (!input.name.trim()) {
      throw new AppError("Instance name is required", 422, "INSTANCE_NAME_REQUIRED");
    }

    const instance = await this.instanceRepository.create({ ...input, userId });
    return { id: instance.id };
  }

  async list(userId: string): Promise<unknown[]> {
    const instances = await this.instanceRepository.findAll(userId);
    return instances.map((instance) => ({
      id: instance.id,
      userId: instance.userId,
      name: instance.name,
      description: instance.description,
      isActive: instance.isActive,
      createdAt: instance.createdAt
    }));
  }

  async getById(id: string, userId: string): Promise<unknown> {
    const instance = await this.instanceRepository.findById(id, userId);

    if (!instance) {
      throw new AppError("Instance not found", 404, "INSTANCE_NOT_FOUND");
    }

    return instance;
  }
}
