import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class DeviceStateModel extends Model {
  declare id: string;
  declare roomId: string;
  declare emulatorId: string;
  declare deviceType: "minisplit" | "purifier" | "extractor";
  declare deviceIndex: number;
  declare isOn: boolean;
  declare mode: string | null;
  declare targetTemperature: number | null;
  declare ambientTemperature: number | null;
  declare ambientHumidity: number | null;
  declare reportedAt: Date;
  declare source: "mqtt" | "rest";
  declare payload: Record<string, unknown>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initDeviceStateModel(sequelize: Sequelize): void {
  DeviceStateModel.init(
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
      emulatorId: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      deviceType: {
        type: DataTypes.ENUM("minisplit", "purifier", "extractor"),
        allowNull: false
      },
      deviceIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
          max: 3
        }
      },
      isOn: {
        type: DataTypes.BOOLEAN,
        allowNull: false
      },
      mode: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      targetTemperature: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      ambientTemperature: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      ambientHumidity: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      reportedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      source: {
        type: DataTypes.ENUM("mqtt", "rest"),
        allowNull: false,
        defaultValue: "mqtt"
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "device_states",
      indexes: [
        { fields: ["roomId", "deviceType", "deviceIndex"], unique: true },
        { fields: ["emulatorId", "reportedAt"] }
      ]
    }
  );
}
