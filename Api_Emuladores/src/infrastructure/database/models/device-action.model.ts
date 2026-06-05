import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class DeviceActionModel extends Model {
  declare id: string;
  declare roomId: string;
  declare cycleId: string;
  declare deviceType: "minisplit" | "purifier" | "extractor";
  declare action: string;
  declare reason: string;
  declare level: "low" | "medium" | "high" | null;
  declare requestedBy: "rule-engine" | "manual";
  declare executedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initDeviceActionModel(sequelize: Sequelize): void {
  DeviceActionModel.init(
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
      cycleId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      deviceType: {
        type: DataTypes.ENUM("minisplit", "purifier", "extractor"),
        allowNull: false
      },
      action: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      level: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: true
      },
      requestedBy: {
        type: DataTypes.ENUM("rule-engine", "manual"),
        allowNull: false,
        defaultValue: "rule-engine"
      },
      executedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "device_actions"
    }
  );
}

