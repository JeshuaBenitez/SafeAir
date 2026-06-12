import { UserModel } from "../database/models";

export class UserRepository {
  async findAll(): Promise<UserModel[]> {
    return UserModel.findAll({
      order: [
        ["createdAt", "ASC"],
        ["email", "ASC"]
      ]
    });
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return UserModel.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async create(data: { email: string; passwordHash: string; fullName: string; role?: "admin" | "operator"; enabled?: boolean }): Promise<UserModel> {
    return UserModel.create({
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: data.role ?? "operator",
      enabled: data.enabled ?? true
    });
  }

  async findById(id: string): Promise<UserModel | null> {
    return UserModel.findByPk(id);
  }

  async updateProfile(
    id: string,
    data: { email?: string; passwordHash?: string; fullName?: string; role?: "admin" | "operator"; enabled?: boolean }
  ): Promise<UserModel | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    if (data.email !== undefined) user.email = data.email.trim().toLowerCase();
    if (data.passwordHash !== undefined) user.passwordHash = data.passwordHash;
    if (data.fullName !== undefined) user.fullName = data.fullName.trim();
    if (data.role !== undefined) user.role = data.role;
    if (data.enabled !== undefined) user.enabled = data.enabled;

    await user.save();
    return user;
  }

  async countOperators(): Promise<number> {
    return UserModel.count({ where: { role: "operator" } });
  }

  async getOperatorProvisioningIndex(userId: string): Promise<number | null> {
    const operators = await UserModel.findAll({
      attributes: ["id"],
      where: { role: "operator" },
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"]
      ]
    });

    const index = operators.findIndex((user) => user.id === userId);
    return index >= 0 ? index + 1 : null;
  }
}
