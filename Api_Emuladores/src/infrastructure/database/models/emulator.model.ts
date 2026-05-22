import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class EmulatorModel extends Model {
  declare id: string;
  declare roomId: string;
  declare emulatorExternalId: string;
  declare status: "online" | "offline";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initEmulatorModel(sequelize: Sequelize): void {
  EmulatorModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      emulatorExternalId: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true
      },
      status: {
        type: DataTypes.ENUM("online", "offline"),
        allowNull: false,
        defaultValue: "online"
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "emulators"
    }
  );
}

