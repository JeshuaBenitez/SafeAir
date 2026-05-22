import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class CycleModel extends Model {
  declare id: string;
  declare roomId: string;
  declare cycleNumber: number;
  declare status: "open" | "closed";
  declare startedAt: Date;
  declare endedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCycleModel(sequelize: Sequelize): void {
  CycleModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      cycleNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("open", "closed"),
        allowNull: false,
        defaultValue: "open"
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "cycles",
      indexes: [{ fields: ["roomId", "cycleNumber"], unique: true }]
    }
  );
}

