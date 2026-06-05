import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class UserModel extends Model {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare fullName: string;
  declare role: "admin" | "operator";
  declare otpCode: string | null;
  declare otpExpiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initUserModel(sequelize: Sequelize): void {
  UserModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING(120),
        unique: true,
        allowNull: false
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      fullName: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM("admin", "operator"),
        allowNull: false,
        defaultValue: "operator"
      },
      otpCode: {
        type: DataTypes.STRING(6),
        allowNull: true
      },
      otpExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "users"
    }
  );
}

