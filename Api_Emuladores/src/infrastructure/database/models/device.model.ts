import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export type DeviceType = "minisplit" | "purifier" | "extractor";

export class DeviceModel extends Model {
  declare id: string;
  declare roomId: string;
  declare type: DeviceType;
  declare label: string;
  declare isEnabled: boolean;
  declare metadata: Record<string, unknown>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initDeviceModel(sequelize: Sequelize): void {
  DeviceModel.init(
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
      type: {
        type: DataTypes.ENUM("minisplit", "purifier", "extractor"),
        allowNull: false
      },
      label: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "devices"
    }
  );
}

