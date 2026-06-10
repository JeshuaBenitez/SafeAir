import { UserModel } from "../database/models";

export class UserRepository {
  async findByEmail(email: string): Promise<UserModel | null> {
    return UserModel.findOne({ where: { email } });
  }

  async create(data: { email: string; passwordHash: string; fullName: string; role?: "admin" | "operator" }): Promise<UserModel> {
    return UserModel.create({
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: data.role ?? "operator"
    });
  }

  async findById(id: string): Promise<UserModel | null> {
    return UserModel.findByPk(id);
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
