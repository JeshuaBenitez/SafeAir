import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class CycleMeasurementModel extends Model {
  declare id: string;
  declare roomId: string;
  declare cycleId: string;
  declare temperature: number;
  declare humidity: number;
  declare co2: number;
  declare pm25: number;
  declare measuredAt: Date;
  declare receivedAt: Date;
  declare source: "mqtt" | "rest";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCycleMeasurementModel(sequelize: Sequelize): void {
  CycleMeasurementModel.init(
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
      temperature: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      humidity: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      co2: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      pm25: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      measuredAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      source: {
        type: DataTypes.ENUM("mqtt", "rest"),
        allowNull: false,
        defaultValue: "mqtt"
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "cycle_measurements",
      indexes: [{ fields: ["roomId", "measuredAt"] }, { fields: ["roomId", "receivedAt"] }]
    }
  );
}

