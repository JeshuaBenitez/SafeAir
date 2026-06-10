import { AppError } from "../../shared/errors/app-error";
import { InstanceRepository } from "../../infrastructure/repositories/instance.repository";
import { UserRepository } from "../../infrastructure/repositories/user.repository";

export const MAX_SUPPORTED_OPERATORS = 10;
export const MAX_ROOMS_PER_USER = 3;

export class UserProvisioningService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly instanceRepository: InstanceRepository
  ) {}

  async ensureUserResources(userId: string): Promise<void> {
    const operatorIndex = await this.userRepository.getOperatorProvisioningIndex(userId);
    if (!operatorIndex || operatorIndex > MAX_SUPPORTED_OPERATORS) {
      throw new AppError("User is outside the supported provisioning range", 422, "USER_LIMIT_REACHED");
    }

    await this.findOrCreateActiveInstance(userId);
    const roomCount = await this.instanceRepository.countRoomsByUser(userId);
    if (roomCount > MAX_ROOMS_PER_USER) {
      throw new AppError("User has more rooms than the supported limit", 409, "USER_ROOM_LIMIT_EXCEEDED");
    }
  }

  private async findOrCreateActiveInstance(userId: string) {
    const active = await this.instanceRepository.findFirstActive(userId);
    if (active) {
      return active;
    }

    return this.instanceRepository.create({
      userId,
      name: "Instancia SafeAir",
      description: "Instancia principal provisionada automaticamente"
    });
  }
}
